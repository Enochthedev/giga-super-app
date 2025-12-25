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

    // Default location if no user history
    let targetCity = 'Lagos';
    let preferredAmenities = [];

    if (user) {
      // 1. Analyze User History
      const { data: history } = await supabaseClient
        .from('hotel_bookings')
        .select('hotel_id, hotels(city, amenities)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (history && history.length > 0) {
        // Use most recent city
        targetCity = history[0].hotels.city;

        // Collect common amenities
        const amenityCounts = {};
        history.forEach(h => {
          h.hotels.amenities?.forEach(a => {
            amenityCounts[a] = (amenityCounts[a] || 0) + 1;
          });
        });
        // Get top 3 amenities
        preferredAmenities = Object.entries(amenityCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([k]) => k);
      }
    }

    // 2. Find Recommendations
    const query = supabaseClient
      .from('hotels')
      .select('*')
      .eq('is_active', true)
      .eq('city', targetCity)
      .order('star_rating', { ascending: false }) // Prioritize high rating
      .limit(10);

    // Note: Supabase doesn't support array overlap filtering easily in JS client without specific setup,
    // so we'll fetch and filter in memory for amenities if needed, or just rely on city/rating.

    const { data: hotels, error } = await query;
    if (error) throw error;

    // 3. Score and Sort
    const scoredHotels = hotels.map(hotel => {
      let score = hotel.star_rating * 2; // Base score (0-10)

      // Bonus for amenities match
      if (preferredAmenities.length > 0 && hotel.amenities) {
        const matchCount = hotel.amenities.filter(a =>
          preferredAmenities.includes(a)
        ).length;
        score += matchCount;
      }

      return { ...hotel, recommendation_score: score };
    });

    // Sort by score
    scoredHotels.sort((a, b) => b.recommendation_score - a.recommendation_score);

    return new Response(
      JSON.stringify({
        success: true,
        data: scoredHotels.slice(0, 5), // Return top 5
        context: {
          basedOnCity: targetCity,
          preferredAmenities,
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
