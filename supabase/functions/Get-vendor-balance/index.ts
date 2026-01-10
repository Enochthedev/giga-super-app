import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization'),
          },
        },
      }
    );
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Authentication required');
    }
    // Check if user is a vendor/service provider
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role_name')
      .eq('user_id', user.id)
      .in('role_name', ['HOST', 'VENDOR', 'DRIVER', 'ADVERTISER']);
    if (!roles || roles.length === 0) {
      throw new Error('Only service providers can access this endpoint');
    }
    console.log('📊 Fetching vendor balance for:', user.id);
    // Get detailed balance
    const { data: balance, error: balanceError } = await supabaseClient.rpc(
      'get_vendor_balance_detailed',
      {
        p_vendor_id: user.id,
      }
    );
    if (balanceError) {
      throw new Error(`Failed to fetch balance: ${balanceError.message}`);
    }
    // Get dashboard stats
    const { data: stats, error: statsError } = await supabaseClient.rpc(
      'get_vendor_dashboard_stats',
      {
        p_vendor_id: user.id,
      }
    );
    if (statsError) {
      console.warn('Failed to fetch stats:', statsError);
    }
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          balance,
          stats: stats || {},
          // Quick actions
          actions: {
            can_withdraw: balance.available_balance >= 5000,
            min_withdrawal: 5000,
            next_steps:
              balance.available_balance < 5000
                ? `Need ₦${5000 - balance.available_balance} more to withdraw`
                : 'You can request a payout now!',
          },
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error fetching vendor balance:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    );
  }
});
