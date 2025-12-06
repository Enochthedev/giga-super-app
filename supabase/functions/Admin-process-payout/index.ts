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
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Get authenticated user (must be admin)
    const authHeader = req.headers.get('Authorization');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader?.replace('Bearer ', '') ?? '');
    if (userError || !user) {
      throw new Error('Authentication required');
    }
    const params = await req.json();
    if (!params.payoutId) {
      throw new Error('payoutId is required');
    }
    console.log(`💸 Processing payout:`, params.payoutId);
    // ⚡ Start payout processing (marks as 'processing')
    const { data: result, error: txError } = await supabaseClient.rpc('process_payout_atomic', {
      p_payout_id: params.payoutId,
      p_admin_id: user.id
    });
    if (txError) {
      throw new Error('Payout processing failed: ' + txError.message);
    }
    // Check if mock payment (auto-complete)
    const { data: payout } = await supabaseClient.from('vendor_payouts').select(`
        *,
        escrow:escrow_transactions!inner(
          payment:payments(payment_provider)
        )
      `).eq('id', params.payoutId).single();
    const isMockPayment = payout?.escrow?.[0]?.payment?.payment_provider === 'mock';
    if (isMockPayment) {
      // Mock payout - complete immediately
      console.log('🧪 Mock payout detected - completing immediately');
      await supabaseClient.rpc('complete_payout_atomic', {
        p_payout_id: params.payoutId,
        p_provider_reference: 'MOCK_PAYOUT_' + Date.now(),
        p_transaction_id: 'MOCK_TX_' + Date.now()
      });
      return new Response(JSON.stringify({
        success: true,
        message: 'Payout completed successfully (mock mode)',
        data: {
          payout_id: params.payoutId,
          amount: result.amount,
          status: 'completed',
          mode: 'mock'
        }
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    // REAL PAYOUT - Transfer via Paystack
    try {
      const { data: config } = await supabaseClient.from('payment_provider_config').select('secret_key').eq('provider_name', 'paystack').single();
      if (!config) {
        throw new Error('Paystack not configured');
      }
      // 1. Create transfer recipient
      const recipientResponse = await createPaystackRecipient(config.secret_key, {
        type: 'nuban',
        name: result.bank_details.account_name,
        account_number: result.bank_details.account_number,
        bank_code: await getBankCode(config.secret_key, result.bank_details.bank_name),
        currency: 'NGN'
      });
      if (!recipientResponse.status) {
        throw new Error('Failed to create recipient: ' + recipientResponse.message);
      }
      // 2. Initiate transfer
      const transferResponse = await initiatePaystackTransfer(config.secret_key, {
        source: 'balance',
        amount: Math.round(result.amount * 100),
        recipient: recipientResponse.data.recipient_code,
        reason: `Payout for vendor: ${result.vendor_id}`,
        reference: `PAYOUT_${params.payoutId}_${Date.now()}`
      });
      if (!transferResponse.status) {
        throw new Error('Transfer failed: ' + transferResponse.message);
      }
      // 3. Complete payout
      await supabaseClient.rpc('complete_payout_atomic', {
        p_payout_id: params.payoutId,
        p_provider_reference: transferResponse.data.transfer_code,
        p_transaction_id: transferResponse.data.id?.toString()
      });
      console.log('✅ Payout completed:', transferResponse.data.transfer_code);
      return new Response(JSON.stringify({
        success: true,
        message: 'Payout completed successfully',
        data: {
          payout_id: params.payoutId,
          amount: result.amount,
          transfer_code: transferResponse.data.transfer_code,
          status: 'completed',
          mode: 'live'
        }
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    } catch (transferError) {
      console.error('❌ Transfer error:', transferError);
      // Mark payout as failed
      await supabaseClient.rpc('fail_payout_atomic', {
        p_payout_id: params.payoutId,
        p_failure_reason: transferError.message
      });
      throw transferError;
    }
  } catch (error) {
    console.error('❌ Payout processing error:', error);
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
async function createPaystackRecipient(secretKey, data) {
  const response = await fetch('https://api.paystack.co/transferrecipient', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return await response.json();
}
async function initiatePaystackTransfer(secretKey, data) {
  const response = await fetch('https://api.paystack.co/transfer', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return await response.json();
}
async function getBankCode(secretKey, bankName) {
  // Map of common Nigerian banks to their codes
  const bankCodes = {
    'access bank': '044',
    'gtbank': '058',
    'guaranty trust bank': '058',
    'first bank': '011',
    'first bank of nigeria': '011',
    'uba': '033',
    'united bank for africa': '033',
    'zenith bank': '057',
    'ecobank': '050',
    'fidelity bank': '070',
    'union bank': '032',
    'stanbic ibtc': '221',
    'sterling bank': '232',
    'wema bank': '035',
    'polaris bank': '076',
    'keystone bank': '082'
  };
  const normalizedName = bankName.toLowerCase().trim();
  const bankCode = bankCodes[normalizedName];
  if (bankCode) {
    return bankCode;
  }
  // Fallback: Fetch from Paystack API
  const response = await fetch('https://api.paystack.co/bank', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await response.json();
  if (data.status && data.data) {
    const bank = data.data.find((b)=>b.name.toLowerCase().includes(normalizedName) || normalizedName.includes(b.name.toLowerCase()));
    if (bank) {
      return bank.code;
    }
  }
  throw new Error(`Bank code not found for: ${bankName}`);
}
