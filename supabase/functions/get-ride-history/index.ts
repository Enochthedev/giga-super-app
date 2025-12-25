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
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const limit = parseInt(url.searchParams.get('limit') ?? '10');
    const role = url.searchParams.get('role') ?? 'rider'; // 'rider' or 'driver'

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseClient
      .from('rides')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (role === 'driver') {
      query = query.eq('driver_id', user.id);
    } else {
      // Use passenger_id as verified in schema
      query = query.eq('passenger_id', user.id);
    }

    const { data: rides, error, count } = await query;

    if (error) throw error;

    // Fetch driver/passenger profiles manually since relationships might be complex
    // This is a robust fallback
    const enrichedRides = await Promise.all(
      rides.map(async ride => {
        let otherParty = null;
        if (role === 'rider' && ride.driver_id) {
          const { data: driver } = await supabaseClient
            .from('driver_profiles')
            .select('user_id, vehicle_type, rating, vehicle_info')
            .eq('user_id', ride.driver_id)
            .single();

          // Also get name from user_profiles if possible, or auth metadata (not accessible here easily)
          // We'll try user_profiles
          const { data: profile } = await supabaseClient
            .from('user_profiles')
            .select('first_name, last_name, avatar_url')
            .eq('id', ride.driver_id)
            .single();

          otherParty = { ...driver, ...profile };
        } else if (role === 'driver' && ride.passenger_id) {
          const { data: passenger } = await supabaseClient
            .from('user_profiles')
            .select('first_name, last_name, avatar_url')
            .eq('id', ride.passenger_id)
            .single();
          otherParty = passenger;
        }
        return { ...ride, other_party: otherParty };
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: enrichedRides,
        meta: {
          page,
          limit,
          total: count,
          total_pages: Math.ceil((count ?? 0) / limit),
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
