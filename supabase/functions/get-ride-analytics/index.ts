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

    // Get total rides
    const { count: totalRides } = await supabaseClient
      .from('rides')
      .select('*', { count: 'exact', head: true });

    // Get active rides
    const { count: activeRides } = await supabaseClient
      .from('rides')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'accepted', 'in_progress']);

    // Get completed rides
    const { count: completedRides } = await supabaseClient
      .from('rides')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    // Get total drivers
    const { count: totalDrivers } = await supabaseClient
      .from('driver_profiles')
      .select('*', { count: 'exact', head: true });

    // Get online drivers
    const { count: onlineDrivers } = await supabaseClient
      .from('driver_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_online', true);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          rides: {
            total: totalRides,
            active: activeRides,
            completed: completedRides,
          },
          drivers: {
            total: totalDrivers,
            online: onlineDrivers,
          },
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
