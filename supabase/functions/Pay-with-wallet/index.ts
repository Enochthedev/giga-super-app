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
    const params = await req.json();
    // Determine reference ID and module type
    let referenceId;
    let moduleType;
    if (params.bookingId) {
      referenceId = params.bookingId;
      moduleType = 'hotel_booking';
    } else if (params.orderId) {
      referenceId = params.orderId;
      moduleType = 'ecommerce_order';
    } else if (params.rideId) {
      referenceId = params.rideId;
      moduleType = 'taxi_ride';
    } else if (params.campaignId) {
      referenceId = params.campaignId;
      moduleType = 'ad_campaign';
    } else {
      throw new Error('Must provide bookingId, orderId, rideId, or campaignId');
    }
    console.log(`💰 Processing wallet payment for ${moduleType}:`, referenceId);
    // ⚡ ATOMIC: Pay with wallet
    const { data: result, error: txError } = await supabaseClient.rpc(
      'pay_with_wallet_atomic',
      {
        p_user_id: user.id,
        p_module_type: moduleType,
        p_reference_id: referenceId,
        p_amount: params.amount,
        p_metadata: {
          paid_at: new Date().toISOString(),
          user_agent: req.headers.get('user-agent'),
        },
      }
    );
    if (txError) {
      console.error('Wallet payment error:', txError);
      throw new Error(`Wallet payment failed: ${  txError.message}`);
    }
    console.log('✅ Wallet payment successful:', result.transaction_id);
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment completed successfully using wallet',
        data: {
          payment_id: result.payment_id,
          transaction_id: result.transaction_id,
          amount: result.amount,
          new_balance: result.new_balance,
          payment_method: 'wallet',
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
    console.error('❌ Wallet payment error:', error);
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
