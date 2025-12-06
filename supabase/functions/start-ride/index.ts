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

        // Get authenticated user (driver)
        const {
            data: { user },
            error: userError,
        } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            throw new Error('Unauthorized');
        }

        const { ride_id, current_lat, current_lng } = await req.json();

        if (!ride_id) {
            throw new Error('ride_id is required');
        }

        // Get the ride
        const { data: ride, error: rideError } = await supabaseClient
            .from('rides')
            .select('*')
            .eq('id', ride_id)
            .single();

        if (rideError || !ride) {
            throw new Error('Ride not found');
        }

        // Verify driver
        if (ride.driver_id !== user.id) {
            throw new Error('You are not authorized to start this ride');
        }

        // Verify status
        if (ride.status !== 'accepted') {
            throw new Error(`Cannot start ride. Current status is ${ride.status}`);
        }

        // Optional: Verify driver is close to pickup location (within 500m)
        if (current_lat && current_lng && ride.pickup_location) {
            // Extract coordinates from PostGIS POINT string if needed, or assume client sends valid coords
            // For MVP, we'll skip strict distance enforcement but log it
        }

        // Update ride status
        const { data: updatedRide, error: updateError } = await supabaseClient
            .from('rides')
            .update({
                status: 'in_progress',
                started_at: new Date().toISOString(),
            })
            .eq('id', ride_id)
            .select()
            .single();

        if (updateError) throw updateError;

        // Notify rider
        await supabaseClient.from('notifications').insert({
            user_id: ride.rider_id,
            type: 'ride_started',
            title: 'Ride Started',
            message: 'Your ride has started. Enjoy your trip!',
            data: { ride_id: ride.id }
        });

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    ride: updatedRide,
                    message: 'Ride started successfully',
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
