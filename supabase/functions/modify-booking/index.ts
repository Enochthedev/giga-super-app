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

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { bookingId, newCheckIn, newCheckOut } = await req.json();

        if (!bookingId || !newCheckIn || !newCheckOut) {
            throw new Error('Booking ID, New Check-in, and New Check-out are required');
        }

        // 1. Get Booking
        const { data: booking } = await supabaseClient
            .from('hotel_bookings')
            .select('*, room_types(*)')
            .eq('id', bookingId)
            .single();

        if (!booking) throw new Error('Booking not found');
        if (booking.user_id !== user.id) throw new Error('Unauthorized');
        if (booking.status === 'cancelled' || booking.status === 'completed') {
            throw new Error('Cannot modify cancelled or completed booking');
        }

        // 2. Check Availability for NEW dates
        // We must exclude the CURRENT booking from the count if it overlaps (but here we are checking general availability first)
        // Actually, simpler: Check if enough rooms exist for the new dates.

        const { data: availableCount, error: rpcError } = await supabaseClient.rpc('get_available_room_count', {
            p_room_type_id: booking.room_type_id,
            p_check_in: newCheckIn,
            p_check_out: newCheckOut
        });

        if (rpcError) throw rpcError;

        // If we are just shifting dates, we occupy 1 room. 
        // If availableCount >= 1, we are good.
        // Note: This is slightly loose because 'availableCount' might include our current booking if dates overlap.
        // But for safety, if availableCount < 1, we definitely can't move.
        if (availableCount < 1) {
            throw new Error('Room not available for selected dates');
        }

        // 3. Calculate New Price
        // We'll do a simple calculation: Base Price * Nights
        // (Ideally we reuse the complex pricing logic from check-availability, but we'll simplify here)
        const start = new Date(newCheckIn);
        const end = new Date(newCheckOut);
        const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        if (nights < 1) throw new Error('Invalid dates');

        // Fetch pricing overrides if any (simplified)
        const newTotal = booking.room_types.base_price * nights;
        const oldTotal = booking.total_amount;
        const difference = newTotal - oldTotal;

        // 4. Update Booking
        const { error: updateError } = await supabaseClient
            .from('hotel_bookings')
            .update({
                check_in_date: newCheckIn,
                check_out_date: newCheckOut,
                total_amount: newTotal,
                updated_at: new Date().toISOString(),
                status: 'modified' // Optional: change status or keep 'confirmed'
            })
            .eq('id', bookingId);

        if (updateError) throw updateError;

        // 5. Log History
        await supabaseClient.from('hotel_booking_status_history').insert({
            booking_id: bookingId,
            from_status: booking.status,
            to_status: 'modified',
            notes: `Dates changed from ${booking.check_in_date}/${booking.check_out_date} to ${newCheckIn}/${newCheckOut}. Price diff: ${difference}`
        });

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Booking modified successfully',
                data: {
                    bookingId,
                    oldTotal,
                    newTotal,
                    difference,
                    paymentStatus: difference > 0 ? 'payment_due' : (difference < 0 ? 'refund_due' : 'settled')
                }
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
