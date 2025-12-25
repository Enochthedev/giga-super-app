import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { connectionId, action } = await req.json();

    if (!connectionId || !action) {
      return new Response(
        JSON.stringify({ error: 'Connection ID and action required' }),
        { status: 400 }
      );
    }

    // Verify this request is for the current user
    const { data: connection } = await supabase
      .from('user_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('connected_user_id', user.id)
      .single();

    if (!connection) {
      return new Response(JSON.stringify({ error: 'Connection not found' }), {
        status: 404,
      });
    }

    if (action === 'accept') {
      const { error } = await supabase
        .from('user_connections')
        .update({ status: 'accepted' })
        .eq('id', connectionId);

      if (error) throw error;

      // Create reciprocal connection
      await supabase.from('user_connections').insert({
        user_id: user.id,
        connected_user_id: connection.user_id,
        connection_type: connection.connection_type,
        status: 'accepted',
      });

      // Notify requester
      await supabase.from('notification_queue').insert({
        user_id: connection.user_id,
        template_name: 'friend_request_accepted',
        variables: {
          accepter_name: user.email,
        },
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Connection accepted' }),
        { status: 200 }
      );
    }

    if (action === 'decline') {
      const { error } = await supabase
        .from('user_connections')
        .update({ status: 'declined' })
        .eq('id', connectionId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: 'Connection declined' }),
        { status: 200 }
      );
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
