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

    const { storyId } = await req.json();

    if (!storyId) {
      return new Response(JSON.stringify({ error: 'Story ID required' }), {
        status: 400,
      });
    }

    // Check if already viewed
    const { data: existing } = await supabase
      .from('story_views')
      .select('id')
      .eq('story_id', storyId)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      // Record view
      await supabase.from('story_views').insert({
        story_id: storyId,
        user_id: user.id,
      });

      // Increment view count
      await supabase.rpc('increment_story_views', { story_id: storyId });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
