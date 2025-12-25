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

    const { targetUserId, connectionType } = await req.json();

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'Target user ID required' }), {
        status: 400,
      });
    }

    if (targetUserId === user.id) {
      return new Response(JSON.stringify({ error: 'Cannot connect with yourself' }), {
        status: 400,
      });
    }

    // Check if connection already exists
    const { data: existing } = await supabase
      .from('user_connections')
      .select('id, status')
      .or(
        `and(user_id.eq.${user.id},connected_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},connected_user_id.eq.${user.id})`
      )
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Connection already exists', status: existing.status }),
        { status: 400 }
      );
    }

    const { data: connection, error } = await supabase
      .from('user_connections')
      .insert({
        user_id: user.id,
        connected_user_id: targetUserId,
        connection_type: connectionType || 'friend',
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Notify target user
    await supabase.from('notification_queue').insert({
      user_id: targetUserId,
      template_name: 'friend_request_received',
      variables: {
        requester_name: user.email,
        connection_id: connection.id,
      },
    });

    return new Response(JSON.stringify({ success: true, connection }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
