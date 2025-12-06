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

        const {
            data: { user },
            error: userError,
        } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            throw new Error('Unauthorized');
        }

        // Find active ride where user is rider OR driver
        const { data: ride, error: rideError } = await supabaseClient
            .from('rides')
            .select(`
        *,
        driver:driver_profiles!rides_driver_id_fkey(
          user_id,
          first_name,
          last_name,
          phone,
          avatar_url,
          vehicle_make,
          vehicle_model,
          vehicle_color,
          vehicle_plate_number,
          rating,
          last_location,
          heading
        ),
        rider:user_profiles!rides_rider_id_fkey(
          first_name,
          last_name,
          phone,
          avatar_url,
          rating
        )
      `)
            .or(`rider_id.eq.${user.id},driver_id.eq.${user.id}`)
            .in('status', ['pending', 'accepted', 'in_progress'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (rideError && rideError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
            throw rideError;
        }

        if (!ride) {
            return new Response(
                JSON.stringify({
                    success: true,
                    data: null,
                    message: 'No active ride found',
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            );
        }

        // If ride is accepted/in_progress, calculate current ETA/Distance to destination
        let driverLocation = null;
        let eta = ride.driver_eta_minutes;

        if (ride.driver && ride.driver.last_location) {
            // Parse PostGIS point
            const match = ride.driver.last_location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
            if (match) {
                driverLocation = {
                    lng: parseFloat(match[1]),
                    lat: parseFloat(match[2]),
                    heading: ride.driver.heading
                };
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    ride: {
                        id: ride.id,
                        status: ride.status,
                        pickup: {
                            address: ride.pickup_address,
                            location: ride.pickup_location
                        },
                        dropoff: {
                            address: ride.dropoff_address,
                            location: ride.dropoff_location
                        },
                        estimated_fare: ride.estimated_fare,
                        created_at: ride.created_at,
                        otp: ride.otp // If you implement OTP verification
                    },
                    driver: ride.driver ? {
                        name: `${ride.driver.first_name} ${ride.driver.last_name}`,
                        phone: ride.driver.phone,
                        avatar_url: ride.driver.avatar_url,
                        vehicle: {
                            make: ride.driver.vehicle_make,
                            model: ride.driver.vehicle_model,
                            color: ride.driver.vehicle_color,
                            plate: ride.driver.vehicle_plate_number
                        },
                        rating: ride.driver.rating,
                        location: driverLocation
                    } : null,
                    rider: {
                        name: `${ride.rider.first_name} ${ride.rider.last_name}`,
                        phone: ride.rider.phone,
                        avatar_url: ride.rider.avatar_url,
                        rating: ride.rider.rating
                    }
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
