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

        const { bookingId, status, notes, updatedBy } = await req.json();

        if (!bookingId || !status) {
            throw new Error('Booking ID and status are required');
        }

        const validStatuses = ['pending', 'confirmed', 'checked_in', 'checked_out', 'completed', 'cancelled', 'no_show'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }

        // Get current booking
        const { data: currentBooking, error: fetchError } = await supabaseClient
            .from('hotel_bookings')
            .select('status')
            .eq('id', bookingId)
            .single();

        if (fetchError) throw fetchError;
        if (!currentBooking) throw new Error('Booking not found');

        // Update booking status
        const { data: updatedBooking, error: updateError } = await supabaseClient
            .from('hotel_bookings')
            .update({
                status,
                updated_at: new Date().toISOString(),
            })
            .eq('id', bookingId)
            .select()
            .single();

        if (updateError) throw updateError;

        // Add to status history
        const { error: historyError } = await supabaseClient
            .from('hotel_booking_status_history')
            .insert({
                booking_id: bookingId,
                from_status: currentBooking.status,
                to_status: status,
                notes: notes || `Status updated to ${status}`,
                created_by: updatedBy,
            });

        if (historyError) throw historyError;

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    booking: updatedBooking,
                    previousStatus: currentBooking.status,
                    newStatus: status,
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
