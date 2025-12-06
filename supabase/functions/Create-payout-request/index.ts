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
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader?.replace('Bearer ', '') ?? '');
    if (userError || !user) {
      throw new Error('Authentication required');
    }
    const params = await req.json();
    // Validate bank details
    if (!params.bankName || !params.accountNumber || !params.accountName) {
      throw new Error('Bank details required: bankName, accountNumber, accountName');
    }
    // Validate account number format (10 digits for Nigerian banks)
    if (!/^\d{10}$/.test(params.accountNumber)) {
      throw new Error('Invalid account number format. Must be 10 digits.');
    }
    console.log(`💸 Creating payout request for user:`, user.id);
    // ⚡ ATOMIC TRANSACTION: Create payout request
    const { data: result, error: txError } = await supabaseClient.rpc('create_payout_request_atomic', {
      p_vendor_id: user.id,
      p_bank_name: params.bankName,
      p_account_number: params.accountNumber,
      p_account_name: params.accountName,
      p_requested_amount: params.amount || null
    });
    if (txError) {
      console.error('Transaction error:', txError);
      throw new Error('Payout request failed: ' + txError.message);
    }
    console.log('✅ Payout request created:', result.payout_id);
    // For mock payments, auto-process immediately
    if (result.has_mock_payments) {
      console.log('🧪 Mock payment detected - auto-processing payout');
      const { error: processError } = await supabaseClient.rpc('process_payout_atomic', {
        p_payout_id: result.payout_id,
        p_admin_id: user.id // Self-approve for mock
      });
      if (processError) {
        console.warn('Mock payout auto-process failed:', processError);
      }
    }
    return new Response(JSON.stringify({
      success: true,
      message: 'Payout request created successfully',
      data: {
        payout_id: result.payout_id,
        amount: result.total_amount,
        transaction_count: result.transaction_count,
        status: result.has_mock_payments ? 'completed' : 'pending',
        bank_details: {
          bank_name: params.bankName,
          account_number: params.accountNumber,
          account_name: params.accountName
        },
        estimated_processing: result.has_mock_payments ? 'Instant (mock mode)' : '1-3 business days',
        next_steps: result.has_mock_payments ? 'Mock payout completed automatically' : 'Admin will review and process your payout request'
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('❌ Payout request error:', error);
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
