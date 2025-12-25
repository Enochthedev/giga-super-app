import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};
serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }
  try {
    // Get Paystack signature
    const paystackSignature = req.headers.get('x-paystack-signature');
    // Read body as text for signature verification
    const body = await req.text();
    // Verify webhook signature
    const secretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!secretKey) {
      throw new Error('Paystack secret key not configured');
    }
    const hash = createHmac('sha512', secretKey).update(body).digest('hex');
    if (hash !== paystackSignature) {
      console.error('Invalid Paystack signature');
      return new Response(
        JSON.stringify({
          error: 'Invalid signature',
        }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }
    // Parse event
    const event = JSON.parse(body);
    console.log('Paystack webhook event:', event.event);
    // Use service role for webhook operations (no user auth needed)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    // Handle different event types
    switch (event.event) {
      case 'charge.success':
        await handleSuccessfulPayment(supabaseClient, event.data);
        break;
      case 'charge.failed':
        await handleFailedPayment(supabaseClient, event.data);
        break;
      default:
        console.log('Unhandled event type:', event.event);
    }
    return new Response(
      JSON.stringify({
        success: true,
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
    console.error('Webhook error:', error);
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
async function handleSuccessfulPayment(supabase, data) {
  const {reference} = data;
  const amountInKobo = data.amount;
  const amount = amountInKobo / 100; // Convert from kobo to naira
  console.log('Processing successful payment:', reference, 'Amount:', amount);
  try {
    // Find payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_id', reference)
      .single();
    if (paymentError || !payment) {
      console.error('Payment record not found:', reference, paymentError);
      return;
    }
    // Update payment record
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        payment_status: 'completed',
        paid_at: new Date().toISOString(),
        provider_transaction_id: data.id?.toString(),
        card_last4: data.authorization?.last4,
        card_brand: data.authorization?.card_type,
        card_type: data.authorization?.account_type,
        bank_name: data.authorization?.bank,
        metadata: {
          ...payment.metadata,
          paystack_response: {
            id: data.id,
            channel: data.channel,
            currency: data.currency,
            ip_address: data.ip_address,
            fees: data.fees,
            paid_at: data.paid_at,
          },
        },
      })
      .eq('id', payment.id);
    if (updateError) {
      console.error('Error updating payment:', updateError);
      throw updateError;
    }
    // Get module name for commission calculation
    // hotel_booking -> hotels, ecommerce_order -> ecommerce, taxi_ride -> taxi, ad_campaign -> ads
    let moduleName = '';
    if (payment.payment_type === 'hotel_booking') {
      moduleName = 'hotels';
    } else if (payment.payment_type === 'ecommerce_order') {
      moduleName = 'ecommerce';
    } else if (payment.payment_type === 'taxi_ride') {
      moduleName = 'taxi';
    } else if (payment.payment_type === 'ad_campaign') {
      moduleName = 'ads';
    }
    // Calculate commission
    const { data: commissionAmount, error: commissionError } = await supabase.rpc(
      'calculate_commission',
      {
        p_module_name: moduleName,
        p_gross_amount: payment.amount,
      }
    );
    const commission = commissionError ? 0 : commissionAmount;
    // Get vendor ID based on module type
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
    } else if (payment.payment_type === 'taxi_ride') {
      const { data: ride } = await supabase
        .from('rides')
        .select('driver_id')
        .eq('id', payment.reference_id)
        .single();
      if (ride) {
        vendorId = ride.driver_id;
        vendorType = 'driver';
      }
    } else if (payment.payment_type === 'ad_campaign') {
      const { data: campaign } = await supabase
        .from('ad_campaigns')
        .select('advertiser_id')
        .eq('id', payment.reference_id)
        .single();
      if (campaign) {
        vendorId = campaign.advertiser_id;
        vendorType = 'advertiser';
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
      if (escrow) {
        escrowId = escrow.id;
      }
    }
    // Update booking/order/ride status based on module type
    if (payment.payment_type === 'hotel_booking') {
      // Check if this is full payment or deposit
      const isFullPayment = !payment.metadata?.deposit_only;
      await supabase
        .from('hotel_bookings')
        .update({
          payment_status: isFullPayment ? 'paid' : 'partially_paid',
          booking_status: 'confirmed',
          paid_at: new Date().toISOString(),
        })
        .eq('id', payment.reference_id);
      // Add status history
      await supabase.from('hotel_booking_status_history').insert({
        booking_id: payment.reference_id,
        from_status: 'pending',
        to_status: 'confirmed',
        notes: `Payment confirmed via Paystack - ${reference}`,
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
      // Add status history
      await supabase.from('ecommerce_order_status_history').insert({
        order_id: payment.reference_id,
        from_status: 'pending',
        to_status: 'confirmed',
        notes: `Payment confirmed via Paystack - ${reference}`,
        created_by: payment.user_id,
      });
    } else if (payment.payment_type === 'taxi_ride') {
      await supabase
        .from('rides')
        .update({
          payment_status: 'paid',
          status: 'confirmed',
          paid_at: new Date().toISOString(),
        })
        .eq('id', payment.reference_id);
    } else if (payment.payment_type === 'ad_campaign') {
      await supabase
        .from('ad_campaigns')
        .update({
          payment_status: 'paid',
          status: 'active',
          paid_at: new Date().toISOString(),
        })
        .eq('id', payment.reference_id);
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
    console.log('Payment processed successfully:', reference);
    // TODO: Queue confirmation email/SMS
    // await queueNotification(payment.user_id, 'payment_confirmed', {...})
  } catch (error) {
    console.error('Error in handleSuccessfulPayment:', error);
    throw error;
  }
}
async function handleFailedPayment(supabase, data) {
  const {reference} = data;
  console.log('Processing failed payment:', reference);
  try {
    // Find payment record
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_id', reference)
      .single();
    if (!payment) {
      console.error('Payment record not found:', reference);
      return;
    }
    // Update payment record
    await supabase
      .from('payments')
      .update({
        payment_status: 'failed',
        metadata: {
          ...payment.metadata,
          paystack_response: data,
          failure_reason: data.gateway_response,
        },
      })
      .eq('id', payment.id);
    // Record failed attempt
    await supabase.from('failed_payment_attempts').insert({
      user_id: payment.user_id,
      payment_provider: 'paystack',
      payment_method: payment.payment_method,
      amount: payment.amount,
      failure_reason: data.gateway_response || 'Payment failed',
      provider_error_code: data.status,
      provider_error_message: data.message,
    });
    // Update booking/order/ride status
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
    } else if (payment.payment_type === 'taxi_ride') {
      await supabase
        .from('rides')
        .update({
          payment_status: 'failed',
        })
        .eq('id', payment.reference_id);
    } else if (payment.payment_type === 'ad_campaign') {
      await supabase
        .from('ad_campaigns')
        .update({
          payment_status: 'failed',
        })
        .eq('id', payment.reference_id);
    }
    console.log('Failed payment recorded:', reference);
  } catch (error) {
    console.error('Error in handleFailedPayment:', error);
  }
}
