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

    const {
      content,
      media_urls,
      post_type,
      visibility,
      location,
      feeling_activity,
      tagged_users,
      shared_post_id,
    } = await req.json();

    if (!content && (!media_urls || media_urls.length === 0)) {
      return new Response(JSON.stringify({ error: 'Content or media required' }), {
        status: 400,
      });
    }

    const { data: post, error } = await supabase
      .from('social_posts')
      .insert({
        user_id: user.id,
        content: content || '',
        media_urls: media_urls || [],
        post_type: post_type || 'post',
        visibility: visibility || 'public',
        location,
        feeling_activity,
        tagged_users: tagged_users || [],
        shared_post_id,
      })
      .select()
      .single();

    if (error) throw error;

    // Notify tagged users
    if (tagged_users && tagged_users.length > 0) {
      await supabase.from('notification_queue').insert(
        tagged_users.map((taggedUserId: string) => ({
          user_id: taggedUserId,
          template_name: 'user_tagged_in_post',
          variables: {
            tagger_name: user.email,
            post_id: post.id,
          },
        }))
      );
    }

    return new Response(JSON.stringify({ success: true, post }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
