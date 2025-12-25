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

    const { postId, content, parentCommentId } = await req.json();

    if (!postId || !content) {
      return new Response(JSON.stringify({ error: 'Post ID and content required' }), {
        status: 400,
      });
    }

    const { data: comment, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content,
        parent_comment_id: parentCommentId || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Increment comment count
    await supabase.rpc('increment_post_comments', { post_id: postId });

    // Notify post owner
    const { data: post } = await supabase
      .from('social_posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (post && post.user_id !== user.id) {
      await supabase.from('notification_queue').insert({
        user_id: post.user_id,
        template_name: 'post_commented',
        variables: {
          commenter_name: user.email,
          post_id: postId,
        },
      });
    }

    return new Response(JSON.stringify({ success: true, comment }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
