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

    // Get user's connections
    const { data: connections } = await supabase
      .from("user_connections")
      .select("connected_user_id")
      .eq("user_id", user.id)
      .eq("status", "accepted");

    const friendIds = connections?.map(c => c.connected_user_id) || [];
    friendIds.push(user.id); // Include own stories

    // Get active stories
    const { data: stories, error } = await supabase
      .from("stories")
      .select(`
        *,
        user_profiles!inner(id, first_name, last_name, avatar_url)
      `)
      .in("user_id", friendIds)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Group by user
    const groupedStories = stories.reduce((acc, story) => {
      const userId = story.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          user: story.user_profiles,
          stories: [],
        };
      }
      acc[userId].stories.push(story);
      return acc;
    }, {});

    return new Response(JSON.stringify({ stories: Object.values(groupedStories) }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
