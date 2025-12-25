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

    const { postId, content, visibility } = await req.json();

    if (!postId) {
      return new Response(JSON.stringify({ error: 'Post ID required' }), { status: 400 });
    }

    // Create shared post
    const { data: sharedPost, error } = await supabase
      .from('social_posts')
      .insert({
        user_id: user.id,
        content: content || '',
        shared_post_id: postId,
        post_type: 'post',
        visibility: visibility || 'public',
      })
      .select()
      .single();

    if (error) throw error;

    // Increment share count
    await supabase.rpc('increment_post_shares', { post_id: postId });

    // Notify original poster
    const { data: originalPost } = await supabase
      .from('social_posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (originalPost && originalPost.user_id !== user.id) {
      await supabase.from('notification_queue').insert({
        user_id: originalPost.user_id,
        template_name: 'post_shared',
        variables: {
          sharer_name: user.email,
          post_id: postId,
        },
      });
    }

    return new Response(JSON.stringify({ success: true, post: sharedPost }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
