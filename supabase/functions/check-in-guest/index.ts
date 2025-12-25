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
    const authHeader = req.headers.get('Authorization');
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(authHeader?.replace('Bearer ', '') ?? '');
    if (userError || !user) {
      throw new Error('Authentication required');
    }
    const params = await req.json();
    console.log('🏨 Processing check-in for booking:', params.bookingId);
    // Get booking details
    const { data: booking, error: bookingError } = await supabaseClient
      .from('hotel_bookings')
      .select(
        `
        *,
        hotel:hotels(
          id,
          name,
          host_id,
          check_in_time
        ),
        room_type:room_types(
          id,
          name,
          total_rooms
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
      const { data: roles } = await supabaseClient
        .from('user_roles')
        .select('role_name')
        .eq('user_id', user.id)
        .eq('role_name', 'ADMIN');
      if (!roles || roles.length === 0) {
        throw new Error('Only the host or admin can check in guests');
      }
    }
    // Validate booking status
    if (booking.booking_status === 'checked_in') {
      throw new Error('Guest already checked in');
    }
    if (booking.booking_status !== 'confirmed') {
      throw new Error('Booking must be confirmed before check-in');
    }
    // Verify payment is complete
    if (booking.payment_status !== 'paid') {
      throw new Error(
        `Payment must be completed before check-in. Current status: ${ 
          booking.payment_status}`
      );
    }
    // Check if check-in date is today or past
    const checkInDate = new Date(booking.check_in_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkInDate > today) {
      throw new Error(`Cannot check in before check-in date: ${  booking.check_in_date}`);
    }
    // Assign room if not already assigned
    let assignedRoomId = booking.room_id || params.roomId;
    if (!assignedRoomId) {
      // Find available room of the booking's room type
      const { data: availableRoom } = await supabaseClient
        .from('rooms')
        .select('id')
        .eq('room_type_id', booking.room_type_id)
        .eq('status', 'available')
        .limit(1)
        .single();
      if (!availableRoom) {
        throw new Error('No rooms available. Please assign a room manually.');
      }
      assignedRoomId = availableRoom.id;
    }
    // Update room status
    const { error: roomUpdateError } = await supabaseClient
      .from('rooms')
      .update({
        status: 'occupied',
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignedRoomId);
    if (roomUpdateError) {
      throw new Error(`Failed to update room status: ${  roomUpdateError.message}`);
    }
    // Update booking status
    const { error: updateError } = await supabaseClient
      .from('hotel_bookings')
      .update({
        booking_status: 'checked_in',
        checked_in_at: new Date().toISOString(),
        room_id: assignedRoomId,
      })
      .eq('id', params.bookingId);
    if (updateError) {
      // Rollback room status
      await supabaseClient
        .from('rooms')
        .update({
          status: 'available',
        })
        .eq('id', assignedRoomId);
      throw new Error(`Failed to update booking: ${  updateError.message}`);
    }
    // Add status history
    await supabaseClient.from('hotel_booking_status_history').insert({
      booking_id: params.bookingId,
      from_status: 'confirmed',
      to_status: 'checked_in',
      notes: params.notes || 'Guest checked in',
      changed_by: user.id,
    });
    console.log('✅ Guest checked in successfully');
    // Send notification to guest
    await supabaseClient.functions.invoke('queue-notification', {
      body: {
        userId: booking.user_id,
        templateName: 'hotel_check_in',
        variables: {
          guest_name: booking.guest_name,
          hotel_name: booking.hotel.name,
          booking_number: booking.booking_number,
          room_number: 'TBD',
          check_out_date: booking.check_out_date,
        },
      },
    });
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Guest checked in successfully',
        data: {
          booking_id: params.bookingId,
          booking_number: booking.booking_number,
          room_id: assignedRoomId,
          checked_in_at: new Date().toISOString(),
          check_out_date: booking.check_out_date,
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
    console.error('❌ Check-in error:', error);
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
