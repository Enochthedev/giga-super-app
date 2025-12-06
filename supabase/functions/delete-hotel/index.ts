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

        const { hotelId } = await req.json();

        if (!hotelId) {
            throw new Error('Hotel ID is required');
        }

        // Verify ownership or admin
        const { data: hotel } = await supabaseClient
            .from('hotels')
            .select('host_id')
            .eq('id', hotelId)
            .single();

        if (!hotel) throw new Error('Hotel not found');

        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (hotel.host_id !== user.id && profile?.role !== 'admin') {
            throw new Error('Unauthorized');
        }

        // Check for existing bookings
        const { data: activeBookings } = await supabaseClient
            .from('hotel_bookings')
            .select('id')
            .eq('hotel_id', hotelId)
            .in('status', ['pending', 'confirmed']);

        if (activeBookings && activeBookings.length > 0) {
            throw new Error('Cannot delete hotel with active bookings. Please cancel or complete all bookings first.');
        }

        // Soft delete - set to inactive
        const { error } = await supabaseClient
            .from('hotels')
            .update({
                is_active: false,
                deleted_at: new Date().toISOString(),
            })
            .eq('id', hotelId);

        if (error) throw error;

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Hotel deleted successfully',
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
