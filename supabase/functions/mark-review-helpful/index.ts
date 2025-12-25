import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { reviewId } = await req.json();
    if (!reviewId) throw new Error('Review ID is required');

    // Check if already voted
    const { data: existingVote } = await supabaseClient
      .from('hotel_review_votes')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', user.id)
      .single();

    let action = '';

    if (existingVote) {
      // Remove vote (Toggle off)
      await supabaseClient.from('hotel_review_votes').delete().eq('id', existingVote.id);
      action = 'removed';
    } else {
      // Add vote (Toggle on)
      await supabaseClient.from('hotel_review_votes').insert({
        review_id: reviewId,
        user_id: user.id,
        vote_type: 'helpful',
      });
      action = 'added';
    }

    // Get updated count (optional, but nice for UI)
    const { count } = await supabaseClient
      .from('hotel_review_votes')
      .select('id', { count: 'exact', head: true })
      .eq('review_id', reviewId);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Vote ${action}`,
        data: {
          reviewId,
          action,
          totalVotes: count,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
