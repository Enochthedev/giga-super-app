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

    // Verify user is a driver
    const { data: driverProfile } = await supabaseClient
      .from('driver_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!driverProfile) {
      throw new Error('Unauthorized: User is not a driver');
    }

    // Get pending rides
    // In a real app, we would filter by location using PostGIS
    // For now, we return the latest 20 pending rides
    const { data: rides, error } = await supabaseClient
      .from('rides')
      .select(
        '*, passenger:user_profiles!passenger_id(first_name, last_name, rating, avatar_url)'
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        data: rides,
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
