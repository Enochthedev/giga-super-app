import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SEARCH_RADIUS_KM = 10; // Search for drivers within 10km

serve(async req => {
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

    const {
      pickup_address,
      pickup_lat,
      pickup_lng,
      dropoff_address,
      dropoff_lat,
      dropoff_lng,
      vehicle_type = 'standard',
      payment_method_id,
      notes,
      scheduled_time, // For future rides
    } = await req.json();

    // Validate required fields
    if (!pickup_lat || !pickup_lng || !dropoff_lat || !dropoff_lng) {
      throw new Error('Pickup and dropoff coordinates are required');
    }

    // Check if user has an active ride
    const { data: activeRide } = await supabaseClient
      .from('rides')
      .select('id')
      .eq('rider_id', user.id)
      .in('status', ['pending', 'accepted', 'in_progress'])
      .single();

    if (activeRide) {
      throw new Error(
        'You already have an active ride. Please complete or cancel it first.'
      );
    }

    // Get fare estimate
    const distance = calculateDistance(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng);
    const duration = estimateDuration(distance);

    // Calculate base fare
    const BASE_FARE = 500;
    const COST_PER_KM = 100;
    const COST_PER_MINUTE = 20;

    let estimated_fare = BASE_FARE + distance * COST_PER_KM + duration * COST_PER_MINUTE;
    estimated_fare = Math.max(estimated_fare, 300); // Minimum fare
    estimated_fare = Math.round(estimated_fare / 50) * 50; // Round to nearest 50

    // Create ride record
    const { data: ride, error: rideError } = await supabaseClient
      .from('rides')
      .insert({
        passenger_id: user.id,
        pickup_address,
        pickup_location: `POINT(${pickup_lng} ${pickup_lat})`,
        dropoff_address,
        dropoff_location: `POINT(${dropoff_lng} ${dropoff_lat})`,
        vehicle_type,
        estimated_distance_km: distance,
        estimated_duration_minutes: duration,
        estimated_fare,
        payment_method_id,
        notes,
        status: scheduled_time ? 'scheduled' : 'pending',
        scheduled_time: scheduled_time || null,
      })
      .select()
      .single();

    if (rideError) throw rideError;

    // Find nearby available drivers
    const { data: nearbyDrivers, error: driversError } = await supabaseClient.rpc(
      'find_nearby_drivers',
      {
        target_lat: pickup_lat,
        target_lng: pickup_lng,
        radius_km: SEARCH_RADIUS_KM,
        vehicle_type_filter: vehicle_type,
      }
    );

    if (driversError) {
      console.error('Error finding drivers:', driversError);
    }

    const drivers_found = nearbyDrivers?.length || 0;

    // Send notifications to nearby drivers (top 5)
    if (nearbyDrivers && nearbyDrivers.length > 0) {
      const topDrivers = nearbyDrivers.slice(0, 5);

      // Create notification records
      const notifications = topDrivers.map((driver: any) => ({
        user_id: driver.user_id,
        type: 'ride_request',
        title: 'New Ride Request',
        message: `New ride request ${distance.toFixed(1)}km away. Fare: ₦${estimated_fare}`,
        data: {
          ride_id: ride.id,
          pickup_lat,
          pickup_lng,
          dropoff_lat,
          dropoff_lng,
          estimated_fare,
          distance_km: distance,
        },
      }));

      await supabaseClient.from('notifications').insert(notifications);

      // TODO: Send push notifications via FCM/APNS
      // TODO: Send SMS via Twilio for high-value rides
    }

    // Get rider profile for response
    const { data: riderProfile } = await supabaseClient
      .from('user_profiles')
      .select('first_name, last_name, phone, avatar_url')
      .eq('id', user.id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ride: {
            id: ride.id,
            status: ride.status,
            pickup: {
              address: pickup_address,
              lat: pickup_lat,
              lng: pickup_lng,
            },
            dropoff: {
              address: dropoff_address,
              lat: dropoff_lat,
              lng: dropoff_lng,
            },
            vehicle_type,
            estimated_fare,
            estimated_distance_km: distance,
            estimated_duration_minutes: duration,
            created_at: ride.created_at,
            scheduled_time: ride.scheduled_time,
          },
          rider: riderProfile,
          drivers_notified: drivers_found,
          message:
            drivers_found > 0
              ? `Finding you a driver... ${drivers_found} drivers nearby`
              : 'Searching for available drivers in your area',
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

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function estimateDuration(distance_km: number): number {
  const avg_speed_kmh = 30;
  return (distance_km / avg_speed_kmh) * 60;
}
