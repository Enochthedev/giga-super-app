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
    const status = url.searchParams.get('status') || 'accepted';

    // Build query for connections (without user join - FK points to auth.users, not user_profiles)
    const { data: connectionsData, error } = await supabase
      .from('user_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch user profiles separately (connected_user_id references auth.users, not user_profiles)
    const userIds = [
      ...new Set(connectionsData?.map(c => c.connected_user_id).filter(Boolean) || []),
    ];
    let userProfiles: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, avatar_url, email')
        .in('id', userIds);

      if (profiles) {
        userProfiles = profiles.reduce(
          (acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          },
          {} as Record<string, any>
        );
      }
    }

    // Attach user profiles to connections
    const connections = (connectionsData || []).map(conn => ({
      ...conn,
      user_profiles: userProfiles[conn.connected_user_id] || null,
    }));

    return new Response(JSON.stringify({ connections }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
