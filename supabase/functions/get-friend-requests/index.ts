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

    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'received'; // received or sent

    let query = supabase
      .from('user_connections')
      .select(
        `
        *,
        user_profiles!user_connections_user_id_fkey(id, first_name, last_name, avatar_url, email)
      `
      )
      .eq('status', 'pending');

    if (type === 'received') {
      query = query.eq('connected_user_id', user.id);
    } else {
      query = query.eq('user_id', user.id);
    }

    const { data: requests, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ requests }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
