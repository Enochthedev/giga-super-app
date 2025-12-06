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

    const { postId, reactionType } = await req.json();

    if (!postId) {
      return new Response(JSON.stringify({ error: "Post ID required" }), { status: 400 });
    }

    // Check if already liked
    const { data: existing } = await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      // Unlike
      await supabase
        .from("post_likes")
        .delete()
        .eq("id", existing.id);

      await supabase.rpc("decrement_post_likes", { post_id: postId });

      return new Response(JSON.stringify({ success: true, liked: false }), { status: 200 });
    } else {
      // Like
      await supabase
        .from("post_likes")
        .insert({
          post_id: postId,
          user_id: user.id,
          reaction_type: reactionType || "like",
        });

      await supabase.rpc("increment_post_likes", { post_id: postId });

      return new Response(JSON.stringify({ success: true, liked: true }), { status: 200 });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
