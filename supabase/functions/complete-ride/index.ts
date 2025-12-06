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

        const { ride_id, dropoff_lat, dropoff_lng, actual_distance_km } = await req.json();

        if (!ride_id) throw new Error('ride_id is required');

        // Get pricing settings from database
        const { data: pricingSettings } = await supabaseClient
            .from('platform_settings')
            .select('key, value')
            .in('category', ['taxi_pricing', 'taxi_commission']);

        const settings: Record<string, number> = {};
        pricingSettings?.forEach((s: any) => {
            settings[s.key] = parseFloat(s.value);
        });

        const BASE_FARE = settings.base_fare || 500;
        const COST_PER_KM = settings.cost_per_km || 100;
        const COST_PER_MINUTE = settings.cost_per_minute || 20;
        const MIN_FARE = settings.min_fare || 300;
        const DRIVER_COMMISSION = settings.driver_commission_rate || 0.80;

        // Get ride details
        const { data: ride, error: rideError } = await supabaseClient
            .from('rides')
            .select('*')
            .eq('id', ride_id)
            .single();

        if (rideError || !ride) throw new Error('Ride not found');
        if (ride.driver_id !== user.id) throw new Error('Unauthorized');
        if (ride.status !== 'in_progress') throw new Error('Ride is not in progress');

        // Calculate final fare
        const endTime = new Date();
        const startTime = new Date(ride.started_at);
        const durationMinutes = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60));

        // Use actual distance if provided (from app GPS tracking), otherwise fallback to estimated
        const distanceKm = actual_distance_km || ride.estimated_distance_km;

        // Calculate Fare
        let finalFare = BASE_FARE +
            (distanceKm * COST_PER_KM) +
            (durationMinutes * COST_PER_MINUTE);

        finalFare = Math.max(finalFare, MIN_FARE);
        finalFare = Math.round(finalFare / 50) * 50; // Round to nearest 50

        // Calculate Driver Earnings
        const driverEarning = finalFare * DRIVER_COMMISSION;
        const platformFee = finalFare - driverEarning;

        // Update Ride
        const { data: updatedRide, error: updateError } = await supabaseClient
            .from('rides')
            .update({
                status: 'completed',
                completed_at: endTime.toISOString(),
                actual_duration_minutes: durationMinutes,
                actual_distance_km: distanceKm,
                final_fare: finalFare,
                dropoff_location: dropoff_lat && dropoff_lng ? `POINT(${dropoff_lng} ${dropoff_lat})` : ride.dropoff_location
            })
            .eq('id', ride_id)
            .select()
            .single();

        if (updateError) throw updateError;

        // Record Driver Earnings
        await supabaseClient.from('driver_earnings').insert({
            driver_id: user.id,
            ride_id: ride.id,
            amount: finalFare,
            commission: platformFee,
            net_earning: driverEarning,
            payout_status: 'pending'
        });

        // Notify Rider
        await supabaseClient.from('notifications').insert({
            user_id: ride.rider_id,
            type: 'ride_completed',
            title: 'Ride Completed',
            message: `Your ride is complete. Total fare: ₦${finalFare}`,
            data: {
                ride_id: ride.id,
                fare: finalFare,
                distance: distanceKm,
                duration: durationMinutes
            }
        });

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    ride: updatedRide,
                    fare_details: {
                        total: finalFare,
                        distance_km: distanceKm,
                        duration_minutes: durationMinutes,
                        base_fare: BASE_FARE
                    },
                    earnings: driverEarning,
                    message: 'Ride completed successfully',
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
