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
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get user's connections
    const { data: connections } = await supabase
      .from('user_connections')
      .select('connected_user_id')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    const friendIds = connections?.map(c => c.connected_user_id) || [];
    friendIds.push(user.id); // Include own posts

    const { data: posts, error } = await supabase
      .from('social_posts')
      .select(
        `
        *,
        user_profiles!inner(id, first_name, last_name, avatar_url)
      `
      )
      .in('user_id', friendIds)
      .eq('is_active', true)
      .or(`visibility.eq.public,visibility.eq.friends`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return new Response(JSON.stringify({ posts }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
