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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Service role for host actions
    );
    const authHeader = req.headers.get('Authorization');
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(authHeader?.replace('Bearer ', '') ?? '');
    if (userError || !user) {
      throw new Error('Authentication required');
    }
    const params = await req.json();
    console.log('🏨 Processing check-out for booking:', params.bookingId);
    // Get booking details
    const { data: booking, error: bookingError } = await supabaseClient
      .from('hotel_bookings')
      .select(
        `
        *,
        hotel:hotels(
          id,
          name,
          host_id
        )
      `
      )
      .eq('id', params.bookingId)
      .single();
    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }
    // Verify user is the host
    if (booking.hotel.host_id !== user.id) {
      // Check if admin
      const { data: roles } = await supabaseClient
        .from('user_roles')
        .select('role_name')
        .eq('user_id', user.id)
        .eq('role_name', 'ADMIN');
      if (!roles || roles.length === 0) {
        throw new Error('Only the host or admin can check out guests');
      }
    }
    // Validate booking status
    if (booking.booking_status === 'checked_out') {
      throw new Error('Guest already checked out');
    }
    if (
      booking.booking_status !== 'checked_in' &&
      booking.booking_status !== 'confirmed'
    ) {
      throw new Error('Guest must be checked in first');
    }
    // Update booking status
    const { error: updateError } = await supabaseClient
      .from('hotel_bookings')
      .update({
        booking_status: 'checked_out',
        checked_out_at: new Date().toISOString(),
      })
      .eq('id', params.bookingId);
    if (updateError) {
      throw new Error(`Failed to update booking: ${  updateError.message}`);
    }
    // Add status history
    await supabaseClient.from('hotel_booking_status_history').insert({
      booking_id: params.bookingId,
      from_status: booking.booking_status,
      to_status: 'checked_out',
      notes: params.notes || 'Guest checked out',
      changed_by: user.id,
    });
    console.log('✅ Booking updated to checked_out');
    // Auto-release escrow (trigger will handle this, but we can also do it explicitly)
    const { data: escrowRelease, error: escrowError } = await supabaseClient.rpc(
      'release_escrow_atomic',
      {
        p_reference_id: params.bookingId,
        p_module_type: 'hotel_booking',
        p_user_id: user.id,
        p_is_admin: true,
        p_release_reason: 'Guest checked out successfully',
      }
    );
    if (escrowError) {
      console.warn('Escrow release error:', escrowError);
      // Don't fail the check-out if escrow release fails
      // It can be released manually later
    } else {
      console.log('💰 Escrow released:', escrowRelease);
    }
    // Update room availability
    await supabaseClient
      .from('rooms')
      .update({
        status: 'cleaning',
        last_cleaned_at: null,
      })
      .eq('id', booking.room_id);
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Guest checked out successfully',
        data: {
          booking_id: params.bookingId,
          booking_number: booking.booking_number,
          checked_out_at: new Date().toISOString(),
          escrow_released: !escrowError,
          escrow_details: escrowError
            ? null
            : {
                gross_amount: escrowRelease.gross_amount,
                commission: escrowRelease.commission_amount,
                net_amount: escrowRelease.net_amount,
                message: 'Funds now available in your balance',
              },
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
    console.error('❌ Check-out error:', error);
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
