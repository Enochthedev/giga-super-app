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
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Authentication required');
    }
    const params = await req.json();
    if (!params.moduleType || !params.referenceId || !params.amount) {
      throw new Error('Missing required fields: moduleType, referenceId, amount');
    }
    if (!params.paymentProvider || !params.paymentMethod) {
      throw new Error('Missing payment provider or method');
    }
    // Get module name
    let moduleName = '';
    if (params.moduleType === 'hotel_booking') {
      moduleName = 'hotels';
    } else if (params.moduleType === 'ecommerce_order') {
      moduleName = 'ecommerce';
    } else if (params.moduleType === 'taxi_ride') {
      moduleName = 'taxi';
    } else if (params.moduleType === 'ad_campaign') {
      moduleName = 'ads';
    } else {
      throw new Error('Invalid module type');
    }
    // Calculate deposit if needed
    let amountToPay = params.amount;
    if (params.depositOnly) {
      const { data: depositCalc, error: depositError } = await supabaseClient.rpc('calculate_deposit', {
        p_module_name: moduleName,
        p_total_amount: params.amount
      });
      if (depositError) {
        console.error('Error calculating deposit:', depositError);
        amountToPay = params.amount;
      } else {
        amountToPay = depositCalc;
      }
    }
    // Generate transaction ID
    const timestamp = Date.now();
    const transactionId = `${params.moduleType.toUpperCase()}_${timestamp}`;
    // Determine if using mock provider
    const useMockProvider = params.paymentProvider === 'mock' || Deno.env.get('USE_MOCK_PAYMENT') === 'true';
    console.log(`💳 Payment Provider: ${params.paymentProvider}, Mock Mode: ${useMockProvider}`);
    // Get client IP (take first IP if multiple are present)
    const getClientIP = ()=>{
      const forwarded = req.headers.get('x-forwarded-for');
      const realIp = req.headers.get('x-real-ip');
      if (forwarded) {
        // x-forwarded-for can be: "client, proxy1, proxy2"
        // We want the first (client) IP
        return forwarded.split(',')[0].trim();
      }
      return realIp || null;
    };
    // Create payment record
    const { data: payment, error: paymentError } = await supabaseClient.from('payments').insert({
      payment_type: params.moduleType,
      reference_id: params.referenceId,
      user_id: user.id,
      amount: amountToPay,
      currency: 'NGN',
      payment_provider: useMockProvider ? 'mock' : params.paymentProvider,
      payment_method: params.paymentMethod,
      transaction_id: transactionId,
      payment_status: 'pending',
      is_escrowed: true,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      metadata: {
        full_amount: params.amount,
        deposit_only: params.depositOnly,
        test_mode: useMockProvider,
        ...params.metadata
      },
      ip_address: getClientIP(),
      user_agent: req.headers.get('user-agent')
    }).select().single();
    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      throw new Error('Failed to initialize payment: ' + paymentError.message);
    }
    let paymentUrl = '';
    let providerReference = '';
    if (useMockProvider) {
      // MOCK PAYMENT
      console.log('🧪 Using MOCK payment provider');
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';
      paymentUrl = `${frontendUrl}/mock-payment?transaction_id=${transactionId}&amount=${amountToPay}`;
      providerReference = transactionId;
      await supabaseClient.from('payments').update({
        provider_reference: providerReference,
        metadata: {
          ...payment.metadata,
          mock_payment: true,
          mock_instructions: 'Use mock payment page to simulate success/failure'
        }
      }).eq('id', payment.id);
    } else if (params.paymentProvider === 'paystack') {
      // REAL PAYSTACK PAYMENT
      console.log('💳 Using REAL Paystack payment');
      const { data: providerConfig } = await supabaseClient.from('payment_provider_config').select('secret_key').eq('provider_name', 'paystack').eq('is_active', true).single();
      if (!providerConfig) {
        throw new Error('Paystack not configured. Use paymentProvider: "mock" for testing.');
      }
      const paystackResponse = await initializePaystack(providerConfig.secret_key, {
        email: params.userEmail,
        amount: Math.round(amountToPay * 100),
        reference: transactionId,
        currency: 'NGN',
        channels: [
          params.paymentMethod
        ],
        callback_url: `${Deno.env.get('FRONTEND_URL')}/payment/callback`,
        metadata: {
          payment_id: payment.id,
          module_type: params.moduleType,
          reference_id: params.referenceId,
          user_id: user.id
        }
      });
      if (!paystackResponse.status || !paystackResponse.data) {
        throw new Error(paystackResponse.message || 'Failed to initialize Paystack');
      }
      paymentUrl = paystackResponse.data.authorization_url;
      providerReference = paystackResponse.data.reference;
      await supabaseClient.from('payments').update({
        provider_reference: providerReference,
        metadata: {
          ...payment.metadata,
          paystack_access_code: paystackResponse.data.access_code
        }
      }).eq('id', payment.id);
    } else if (params.paymentProvider === 'flutterwave') {
      throw new Error('Flutterwave not yet implemented. Use "mock" for testing.');
    } else if (params.paymentProvider === 'stripe') {
      throw new Error('Stripe not yet implemented. Use "mock" for testing.');
    } else {
      throw new Error(`Unknown payment provider: ${params.paymentProvider}. Use "mock" for testing.`);
    }
    return new Response(JSON.stringify({
      success: true,
      message: 'Payment initialized successfully',
      test_mode: useMockProvider,
      data: {
        payment_id: payment.id,
        transaction_id: transactionId,
        payment_url: paymentUrl,
        amount_to_pay: amountToPay,
        currency: 'NGN',
        payment_provider: useMockProvider ? 'mock' : params.paymentProvider,
        payment_method: params.paymentMethod,
        expires_at: payment.expires_at,
        reference: providerReference,
        ...useMockProvider && {
          test_instructions: {
            message: 'TEST PAYMENT - No real money will be charged',
            how_to_test: 'Visit payment_url and click "Simulate Success" or "Simulate Failure"',
            webhook_test: `curl -X POST ${Deno.env.get('SUPABASE_URL')}/functions/v1/mock-payment-webhook -H "Content-Type: application/json" -d '{"transaction_id":"${transactionId}","status":"success"}'`
          }
        },
        next_step: 'Redirect user to payment_url'
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('❌ Error initializing payment:', error);
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
async function initializePaystack(secretKey, data) {
  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return await response.json();
}
