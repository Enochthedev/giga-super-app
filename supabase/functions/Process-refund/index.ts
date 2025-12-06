import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Service role for security
    );
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader?.replace('Bearer ', '') ?? '');
    if (userError || !user) {
      throw new Error('Authentication required');
    }
    const params = await req.json();
    // Determine reference ID and module type
    let referenceId = null;
    let moduleType = null;
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
    console.log(`🔄 Processing refund for ${moduleType}:`, referenceId);
    // ⚡ ATOMIC TRANSACTION START
    const { data: result, error: txError } = await supabaseClient.rpc('process_refund_atomic', {
      p_reference_id: referenceId,
      p_module_type: moduleType,
      p_user_id: user.id,
      p_reason: params.reason,
      p_manual_amount: params.refundAmount || null
    });
    if (txError) {
      console.error('Transaction error:', txError);
      throw new Error('Refund processing failed: ' + txError.message);
    }
    // If using mock provider, no actual refund to process
    if (result.payment_provider === 'mock') {
      console.log('✅ Mock refund completed');
      return new Response(JSON.stringify({
        success: true,
        message: 'Refund processed successfully (mock mode)',
        data: result
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    // Process actual refund with payment provider
    if (result.payment_provider === 'paystack') {
      const refundResult = await processPaystackRefund(supabaseClient, result.transaction_id, result.refund_amount);
      if (!refundResult.success) {
        throw new Error('Paystack refund failed: ' + refundResult.message);
      }
    }
    console.log('✅ Refund completed:', result.refund_amount);
    return new Response(JSON.stringify({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refund_amount: result.refund_amount,
        refund_percentage: result.refund_percentage,
        original_amount: result.original_amount,
        transaction_id: result.transaction_id,
        estimated_arrival: '5-7 business days'
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('❌ Refund error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
async function processPaystackRefund(supabase, transactionId, amount) {
  try {
    const { data: config } = await supabase.from('payment_provider_config').select('secret_key').eq('provider_name', 'paystack').single();
    if (!config) {
      throw new Error('Paystack not configured');
    }
    // Get original transaction reference
    const { data: payment } = await supabase.from('payments').select('provider_reference').eq('transaction_id', transactionId).single();
    const response = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.secret_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transaction: payment.provider_reference,
        amount: Math.round(amount * 100)
      })
    });
    const data = await response.json();
    return {
      success: data.status === true,
      message: data.message,
      data: data.data
    };
  } catch (error) {
    console.error('Paystack refund error:', error);
    return {
      success: false,
      message: error.message
    };
  }
}
