import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const url = new URL(req.url);
    const query = url.searchParams.get("q");
    const limit = parseInt(url.searchParams.get("limit") || "20");

    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ error: "Query must be at least 2 characters" }), { status: 400 });
    }

    const { data: users, error } = await supabase
      .from("user_profiles")
      .select("id, first_name, last_name, avatar_url, email")
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
      .neq("id", user.id)
      .eq("is_active", true)
      .limit(limit);

    if (error) throw error;

    // Get connection status for each user
    const userIds = users.map(u => u.id);
    const { data: connections } = await supabase
      .from("user_connections")
      .select("connected_user_id, status")
      .eq("user_id", user.id)
      .in("connected_user_id", userIds);

    const connectionMap = connections?.reduce((acc, conn) => {
      acc[conn.connected_user_id] = conn.status;
      return acc;
    }, {}) || {};

    const usersWithStatus = users.map(u => ({
      ...u,
      connectionStatus: connectionMap[u.id] || "none",
    }));

    return new Response(JSON.stringify({ users: usersWithStatus }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
