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

    const { commentId } = await req.json();

    if (!commentId) {
      return new Response(JSON.stringify({ error: "Comment ID required" }), { status: 400 });
    }

    // Verify ownership
    const { data: comment } = await supabase
      .from("post_comments")
      .select("user_id, post_id")
      .eq("id", commentId)
      .single();

    if (!comment || comment.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const { error } = await supabase
      .from("post_comments")
      .delete()
      .eq("id", commentId);

    if (error) throw error;

    // Decrement comment count
    await supabase.rpc("decrement_post_comments", { post_id: comment.post_id });

    return new Response(JSON.stringify({ success: true, message: "Comment deleted" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
