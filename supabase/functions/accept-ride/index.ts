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

        // Get authenticated user
        const {
            data: { user },
            error: userError,
        } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            throw new Error('Unauthorized');
        }

        const { ride_id } = await req.json();

        if (!ride_id) {
            throw new Error('ride_id is required');
        }

        // Verify user is a driver
        const { data: driverProfile, error: driverError } = await supabaseClient
            .from('driver_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (driverError || !driverProfile) {
            throw new Error('Driver profile not found. Only verified drivers can accept rides.');
        }

        if (!driverProfile.is_verified) {
            throw new Error('Your driver account is not verified yet.');
        }

        if (!driverProfile.is_available) {
            throw new Error('You must be online to accept rides. Toggle your availability first.');
        }

        // Check if driver has an active ride
        const { data: activeRide } = await supabaseClient
            .from('rides')
            .select('id')
            .eq('driver_id', user.id)
            .in('status', ['accepted', 'in_progress'])
            .single();

        if (activeRide) {
            throw new Error('You already have an active ride. Complete it before accepting another.');
        }

        // Get the ride and check if it's still available
        const { data: ride, error: rideError } = await supabaseClient
            .from('rides')
            .select(`
        *,
        rider:user_profiles!rides_rider_id_fkey(
          first_name,
          last_name,
          phone,
          avatar_url
        )
      `)
            .eq('id', ride_id)
            .single();

        if (rideError) throw new Error('Ride not found');

        if (ride.status !== 'pending' && ride.status !== 'scheduled') {
            throw new Error('This ride is no longer available');
        }

        // Check if scheduled ride is ready
        if (ride.scheduled_time) {
            const scheduledTime = new Date(ride.scheduled_time);
            const now = new Date();
            const timeDiff = scheduledTime.getTime() - now.getTime();
            const hoursUntil = timeDiff / (1000 * 60 * 60);

            if (hoursUntil > 1) {
                throw new Error(`This ride is scheduled for ${scheduledTime.toLocaleString()}. Too early to accept.`);
            }
        }

        // Calculate ETA from driver's current location to pickup
        const driverLat = driverProfile.last_location?.coordinates?.[1];
        const driverLng = driverProfile.last_location?.coordinates?.[0];

        // Extract pickup coordinates from ride.pickup_location (PostGIS POINT)
        const pickupMatch = ride.pickup_location?.match(/POINT\(([^ ]+) ([^ ]+)\)/);
        const pickupLng = pickupMatch ? parseFloat(pickupMatch[1]) : null;
        const pickupLat = pickupMatch ? parseFloat(pickupMatch[2]) : null;

        let eta_minutes = 5; // Default
        if (driverLat && driverLng && pickupLat && pickupLng) {
            const distance = calculateDistance(driverLat, driverLng, pickupLat, pickupLng);
            eta_minutes = Math.round((distance / 30) * 60); // Assuming 30 km/h average speed
        }

        // Update ride with driver assignment
        const { data: updatedRide, error: updateError } = await supabaseClient
            .from('rides')
            .update({
                driver_id: user.id,
                status: 'accepted',
                driver_eta_minutes: eta_minutes,
                accepted_at: new Date().toISOString(),
            })
            .eq('id', ride_id)
            .eq('status', ride.status) // Ensure status hasn't changed (optimistic locking)
            .select()
            .single();

        if (updateError) {
            // Check if another driver accepted it first
            throw new Error('Failed to accept ride. It may have been accepted by another driver.');
        }

        // Send notification to rider
        await supabaseClient.from('notifications').insert({
            user_id: ride.rider_id,
            type: 'ride_accepted',
            title: 'Driver Found!',
            message: `${driverProfile.first_name} is on the way. ETA: ${eta_minutes} minutes.`,
            data: {
                ride_id: ride.id,
                driver_name: `${driverProfile.first_name} ${driverProfile.last_name}`,
                driver_phone: driverProfile.phone,
                driver_vehicle: `${driverProfile.vehicle_make} ${driverProfile.vehicle_model}`,
                plate_number: driverProfile.vehicle_plate_number,
                eta_minutes,
            },
        });

        // TODO: Send push notification to rider
        // TODO: Send SMS to rider

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    ride: {
                        id: updatedRide.id,
                        status: updatedRide.status,
                        pickup_address: updatedRide.pickup_address,
                        dropoff_address: updatedRide.dropoff_address,
                        estimated_fare: updatedRide.estimated_fare,
                        eta_minutes,
                    },
                    rider: ride.rider,
                    message: 'Ride accepted successfully! Head to the pickup location.',
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

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
}
