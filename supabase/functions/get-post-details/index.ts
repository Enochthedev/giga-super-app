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
    const postId = url.searchParams.get('post_id');

    if (!postId) {
      return new Response(JSON.stringify({ error: 'Post ID required' }), { status: 400 });
    }

    const { data: post, error } = await supabase
      .from('social_posts')
      .select(
        `
        *,
        user_profiles!inner(id, first_name, last_name, avatar_url),
        shared_post:social_posts!shared_post_id(
          id,
          content,
          media_urls,
          user_profiles!inner(id, first_name, last_name, avatar_url)
        )
      `
      )
      .eq('id', postId)
      .eq('is_active', true)
      .single();

    if (error) throw error;

    // Get comments
    const { data: comments } = await supabase
      .from('post_comments')
      .select(
        `
        *,
        user_profiles!inner(id, first_name, last_name, avatar_url)
      `
      )
      .eq('post_id', postId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false })
      .limit(20);

    // Check if user liked
    const { data: userLike } = await supabase
      .from('post_likes')
      .select('reaction_type')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    // Increment view count
    await supabase.rpc('increment_post_views', { post_id: postId });

    return new Response(
      JSON.stringify({
        post,
        comments: comments || [],
        userLiked: !!userLike,
        userReaction: userLike?.reaction_type || null,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
