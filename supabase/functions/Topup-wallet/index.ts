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
    if (!params.amount || params.amount <= 0) {
      throw new Error('Invalid amount');
    }
    const provider = params.paymentProvider || 'mock';
    const useMock = provider === 'mock' || Deno.env.get('USE_MOCK_PAYMENT') === 'true';
    console.log(`💰 Initiating wallet top-up: ₦${params.amount}`);
    // Generate transaction ID
    const transactionId = `WALLET_TOPUP_${Date.now()}`;
    let paymentUrl = '';
    let providerReference = transactionId;
    if (useMock) {
      // Mock top-up - auto complete
      console.log('🧪 Mock wallet top-up - auto completing');
      const { error: topupError } = await supabaseClient.rpc('topup_wallet_atomic', {
        p_user_id: user.id,
        p_amount: params.amount,
        p_payment_provider: 'mock',
        p_transaction_id: transactionId,
        p_metadata: {
          test_mode: true
        }
      });
      if (topupError) {
        throw new Error('Wallet top-up failed: ' + topupError.message);
      }
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';
      paymentUrl = `${frontendUrl}/wallet/topup-success?transaction_id=${transactionId}&amount=${params.amount}`;
    } else {
      // Real payment - initialize with provider
      const { data: config } = await supabaseClient.from('payment_provider_config').select('secret_key, public_key').eq('provider_name', provider).eq('is_active', true).single();
      if (!config) {
        throw new Error(`${provider} not configured`);
      }
      if (provider === 'paystack') {
        const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.secret_key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: user.email,
            amount: Math.round(params.amount * 100),
            reference: transactionId,
            currency: 'NGN',
            callback_url: `${Deno.env.get('FRONTEND_URL')}/wallet/topup-callback`,
            metadata: {
              user_id: user.id,
              topup_wallet: true
            }
          })
        });
        const data = await paystackResponse.json();
        if (!data.status || !data.data) {
          throw new Error(data.message || 'Paystack initialization failed');
        }
        paymentUrl = data.data.authorization_url;
        providerReference = data.data.reference;
      // After user completes payment, Paystack webhook will call topup_wallet_atomic
      }
    }
    return new Response(JSON.stringify({
      success: true,
      message: useMock ? 'Wallet topped up successfully (test mode)' : 'Payment initialized',
      test_mode: useMock,
      data: {
        transaction_id: transactionId,
        payment_url: paymentUrl,
        amount: params.amount,
        reference: providerReference,
        ...useMock && {
          new_balance: 'Check wallet balance'
        }
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('❌ Wallet top-up error:', error);
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
