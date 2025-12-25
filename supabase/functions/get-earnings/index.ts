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

    // Get earnings
    const { data: earnings, error } = await supabaseClient
      .from('driver_earnings')
      .select('*')
      .eq('driver_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate totals
    const totalEarnings = earnings?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
    const totalNet = earnings?.reduce((sum, e) => sum + Number(e.net_earning), 0) || 0;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          history: earnings,
          summary: {
            total_earnings: totalEarnings,
            total_net: totalNet,
            currency: 'NGN',
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
