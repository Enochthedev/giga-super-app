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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const params = await req.json();
    console.log('🧪 Mock webhook triggered:', params.transaction_id, params.status);
    if (params.status === 'success') {
      await handleMockSuccess(supabaseClient, params);
    } else {
      await handleMockFailure(supabaseClient, params);
    }
    return new Response(
      JSON.stringify({
        success: true,
        message: `Mock payment ${params.status} processed`,
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
    console.error('Mock webhook error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      }
    );
  }
});
async function handleMockSuccess(supabase, params) {
  const { transaction_id, card_last4, card_brand } = params;
  // Find payment record
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('*')
    .eq('transaction_id', transaction_id)
    .single();
  if (paymentError || !payment) {
    throw new Error(`Payment record not found: ${transaction_id}`);
  }
  console.log('Processing mock success for:', transaction_id, 'Amount:', payment.amount);
  // Update payment record
  await supabase
    .from('payments')
    .update({
      payment_status: 'completed',
      paid_at: new Date().toISOString(),
      provider_transaction_id: `MOCK_${Date.now()}`,
      card_last4: card_last4 || '4242',
      card_brand: card_brand || 'Visa',
      card_type: 'debit',
      bank_name: 'Test Bank',
      metadata: {
        ...payment.metadata,
        mock_payment: true,
        simulated_at: new Date().toISOString(),
      },
    })
    .eq('id', payment.id);
  // Get module name
  let moduleName = '';
  if (payment.payment_type === 'hotel_booking') moduleName = 'hotels';
  else if (payment.payment_type === 'ecommerce_order') moduleName = 'ecommerce';
  else if (payment.payment_type === 'taxi_ride') moduleName = 'taxi';
  else if (payment.payment_type === 'ad_campaign') moduleName = 'ads';
  // Calculate commission
  const { data: commissionAmount } = await supabase.rpc('calculate_commission', {
    p_module_name: moduleName,
    p_gross_amount: payment.amount,
  });
  const commission = commissionAmount || 0;
  // Get vendor ID
  let vendorId = null;
  let vendorType = '';
  if (payment.payment_type === 'hotel_booking') {
    const { data: booking } = await supabase
      .from('hotel_bookings')
      .select('hotel:hotels(host_id)')
      .eq('id', payment.reference_id)
      .single();
    if (booking?.hotel) {
      vendorId = booking.hotel.host_id;
      vendorType = 'host';
    }
  } else if (payment.payment_type === 'ecommerce_order') {
    const { data: order } = await supabase
      .from('ecommerce_orders')
      .select('items:ecommerce_order_items(vendor_id)')
      .eq('id', payment.reference_id)
      .single();
    if (order?.items?.[0]) {
      vendorId = order.items[0].vendor_id;
      vendorType = 'merchant';
    }
  }
  // Create escrow record
  let escrowId = null;
  if (vendorId) {
    const { data: escrow } = await supabase
      .from('escrow_transactions')
      .insert({
        payment_id: payment.id,
        vendor_id: vendorId,
        vendor_type: vendorType,
        module_name: moduleName,
        gross_amount: payment.amount,
        commission_amount: commission,
        net_amount: payment.amount - commission,
        status: 'held',
        held_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (escrow) escrowId = escrow.id;
  }
  // Update booking/order status
  if (payment.payment_type === 'hotel_booking') {
    const isFullPayment = !payment.metadata?.deposit_only;
    await supabase
      .from('hotel_bookings')
      .update({
        payment_status: isFullPayment ? 'paid' : 'partially_paid',
        booking_status: 'confirmed',
      })
      .eq('id', payment.reference_id);
    await supabase.from('hotel_booking_status_history').insert({
      booking_id: payment.reference_id,
      from_status: 'pending',
      to_status: 'confirmed',
      notes: `Mock payment confirmed - ${transaction_id}`,
      changed_by: payment.user_id,
    });
  } else if (payment.payment_type === 'ecommerce_order') {
    await supabase
      .from('ecommerce_orders')
      .update({
        payment_status: 'paid',
        status: 'confirmed',
        paid_at: new Date().toISOString(),
      })
      .eq('id', payment.reference_id);
    await supabase.from('ecommerce_order_status_history').insert({
      order_id: payment.reference_id,
      from_status: 'pending',
      to_status: 'confirmed',
      notes: `Mock payment confirmed - ${transaction_id}`,
      created_by: payment.user_id,
    });
  }
  // Record platform revenue
  await supabase.from('platform_revenue').insert({
    module_name: moduleName,
    payment_id: payment.id,
    escrow_id: escrowId,
    gross_amount: payment.amount,
    commission_amount: commission,
    tax_collected: 0,
    revenue_date: new Date().toISOString().split('T')[0],
  });
  console.log('✅ Mock payment success processed:', transaction_id);
}
async function handleMockFailure(supabase, params) {
  const { transaction_id } = params;
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('transaction_id', transaction_id)
    .single();
  if (!payment) {
    throw new Error(`Payment record not found: ${transaction_id}`);
  }
  await supabase
    .from('payments')
    .update({
      payment_status: 'failed',
      metadata: {
        ...payment.metadata,
        mock_payment: true,
        failure_reason: 'Mock payment failed (simulated)',
        simulated_at: new Date().toISOString(),
      },
    })
    .eq('id', payment.id);
  await supabase.from('failed_payment_attempts').insert({
    user_id: payment.user_id,
    payment_provider: 'mock',
    payment_method: payment.payment_method,
    amount: payment.amount,
    failure_reason: 'Mock payment failed (simulated)',
  });
  if (payment.payment_type === 'hotel_booking') {
    await supabase
      .from('hotel_bookings')
      .update({
        payment_status: 'failed',
      })
      .eq('id', payment.reference_id);
  } else if (payment.payment_type === 'ecommerce_order') {
    await supabase
      .from('ecommerce_orders')
      .update({
        payment_status: 'failed',
      })
      .eq('id', payment.reference_id);
  }
  console.log('❌ Mock payment failure processed:', transaction_id);
}
