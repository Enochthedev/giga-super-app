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
    const storyId = url.searchParams.get("story_id");

    if (!storyId) {
      return new Response(JSON.stringify({ error: "Story ID required" }), { status: 400 });
    }

    // Verify ownership
    const { data: story } = await supabase
      .from("stories")
      .select("user_id")
      .eq("id", storyId)
      .single();

    if (!story || story.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const { data: viewers, error } = await supabase
      .from("story_views")
      .select(`
        viewed_at,
        user_profiles!inner(id, first_name, last_name, avatar_url)
      `)
      .eq("story_id", storyId)
      .order("viewed_at", { ascending: false });

    if (error) throw error;

    return new Response(JSON.stringify({ viewers }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
