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
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Authentication required');
    }
    const params = await req.json();
    if (!params.transactionId && !params.paymentId) {
      throw new Error('Either transactionId or paymentId is required');
    }
    // Get payment record
    let query = supabaseClient.from('payments').select('*').eq('user_id', user.id);
    if (params.transactionId) {
      query = query.eq('transaction_id', params.transactionId);
    } else {
      query = query.eq('id', params.paymentId);
    }
    const { data: payment, error: paymentError } = await query.single();
    if (paymentError || !payment) {
      throw new Error('Payment not found');
    }
    // If payment is still pending and not expired, check with provider
    if (payment.payment_status === 'pending' && new Date(payment.expires_at) > new Date()) {
      // Get provider config
      const { data: providerConfig } = await supabaseClient.from('payment_provider_config').select('secret_key').eq('provider_name', payment.payment_provider).single();
      if (providerConfig) {
        // Verify with provider
        if (payment.payment_provider === 'paystack') {
          const verificationResult = await verifyWithPaystack(providerConfig.secret_key, payment.transaction_id);
          if (verificationResult.status === 'success') {
            // Update payment status
            await supabaseClient.from('payments').update({
              payment_status: 'completed',
              paid_at: new Date().toISOString(),
              provider_transaction_id: verificationResult.data.id?.toString(),
              metadata: {
                ...payment.metadata,
                verified_at: new Date().toISOString()
              }
            }).eq('id', payment.id);
            payment.payment_status = 'completed';
            payment.paid_at = new Date().toISOString();
          }
        }
      }
    }
    // Return payment status
    return new Response(JSON.stringify({
      success: true,
      data: {
        payment_id: payment.id,
        transaction_id: payment.transaction_id,
        payment_status: payment.payment_status,
        amount: payment.amount,
        currency: payment.currency,
        payment_provider: payment.payment_provider,
        payment_method: payment.payment_method,
        paid_at: payment.paid_at,
        created_at: payment.created_at,
        expires_at: payment.expires_at,
        // Additional details
        is_expired: new Date(payment.expires_at) < new Date(),
        module_type: payment.payment_type,
        reference_id: payment.reference_id,
        // Payment details
        card_last4: payment.card_last4,
        card_brand: payment.card_brand,
        bank_name: payment.bank_name,
        // Escrow info
        is_escrowed: payment.is_escrowed,
        escrow_released: payment.escrow_released
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
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
// Verify payment with Paystack
async function verifyWithPaystack(secretKey, reference) {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    }
  });
  return await response.json();
}
