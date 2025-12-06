import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { bookingId, cancellationReason } = await req.json();

    if (!bookingId) {
      throw new Error('Booking ID is required');
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseClient
      .from('hotel_bookings')
      .select('*, hotel:hotels(name, cancellation_policy)')
      .eq('id', bookingId)
      .single();

    if (bookingError) throw bookingError;
    if (!booking) throw new Error('Booking not found');

    // Check if booking can be cancelled
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      throw new Error(`Cannot cancel booking with status: ${booking.status}`);
    }

    // Calculate refund amount based on cancellation policy
    const checkInDate = new Date(booking.check_in_date);
    const now = new Date();
    const hoursUntilCheckIn = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    let refundPercentage = 0;
    const policy = booking.hotel.cancellation_policy || {};

    if (hoursUntilCheckIn >= 48) {
      refundPercentage = 100;
    } else if (hoursUntilCheckIn >= 24) {
      refundPercentage = 50;
    } else {
      refundPercentage = 0;
    }

    const refundAmount = (booking.total_amount * refundPercentage) / 100;

    // Update booking status
    const { error: updateError } = await supabaseClient
      .from('hotel_bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: cancellationReason,
        cancelled_at: new Date().toISOString(),
        refund_amount: refundAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    // Add status history
    await supabaseClient.from('hotel_booking_status_history').insert({
      booking_id: bookingId,
      from_status: booking.status,
      to_status: 'cancelled',
      notes: cancellationReason,
    });

    // Process refund if applicable
    if (refundAmount > 0 && booking.payment_id) {
      const { error: refundError } = await supabaseClient.rpc('process_refund_atomic', {
        p_payment_id: booking.payment_id,
        p_reason: cancellationReason || 'Booking cancelled by user',
        p_refund_amount: refundAmount,
      });

      if (refundError) {
        console.error('Refund processing error:', refundError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          bookingId,
          status: 'cancelled',
          refundAmount,
          refundPercentage,
          message: refundAmount > 0 
            ? `Booking cancelled. Refund of $${refundAmount.toFixed(2)} (${refundPercentage}%) will be processed.`
            : 'Booking cancelled. No refund available due to cancellation policy.',
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
