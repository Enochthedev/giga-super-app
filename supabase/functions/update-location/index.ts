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

    const { lat, lng, heading, speed } = await req.json();

    if (!lat || !lng) {
      throw new Error('lat and lng are required');
    }

    // Update driver profile location
    const { error: updateError } = await supabaseClient
      .from('driver_profiles')
      .update({
        last_location: `POINT(${lng} ${lat})`,
        last_location_updated_at: new Date().toISOString(),
        heading: heading || null,
        speed: speed || null,
      })
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    // Check if driver has an active ride to update ride tracking
    const { data: activeRide } = await supabaseClient
      .from('rides')
      .select('id')
      .eq('driver_id', user.id)
      .eq('status', 'in_progress')
      .single();

    if (activeRide) {
      // Insert into ride tracking history
      await supabaseClient.from('ride_tracking').insert({
        ride_id: activeRide.id,
        location: `POINT(${lng} ${lat})`,
        heading,
        speed,
        timestamp: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Location updated',
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
