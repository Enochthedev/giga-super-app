import { createClient } from '@supabase/supabase-js';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
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

    const { hotelId } = await req.json();

    if (!hotelId) {
      throw new Error('Hotel ID is required');
    }

    // Check if already favorited
    const { data: existing } = await supabaseClient
      .from('favorite_hotels')
      .select('id')
      .eq('user_id', user.id)
      .eq('hotel_id', hotelId)
      .maybeSingle();

    if (existing) {
      throw new Error('Hotel is already in favorites');
    }

    // Add to favorites
    const { data: favorite, error } = await supabaseClient
      .from('favorite_hotels')
      .insert({
        user_id: user.id,
        hotel_id: hotelId,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        data: favorite,
        message: 'Hotel added to favorites',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
