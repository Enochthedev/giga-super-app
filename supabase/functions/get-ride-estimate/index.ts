import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pricing configuration
const PRICING = {
  BASE_FARE: 500, // NGN
  COST_PER_KM: 100, // NGN per km
  COST_PER_MINUTE: 20, // NGN per minute
  MIN_FARE: 300, // Minimum fare
  SURGE_MULTIPLIER_MAX: 3.0,
};

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
      pickup_lat,
      pickup_lng,
      dropoff_lat,
      dropoff_lng,
      vehicle_type = 'standard',
    } = await req.json();

    // Validate inputs
    if (!pickup_lat || !pickup_lng || !dropoff_lat || !dropoff_lng) {
      throw new Error('Pickup and dropoff coordinates are required');
    }

    // Calculate distance using Haversine formula (approximation)
    const distance_km = calculateDistance(
      pickup_lat,
      pickup_lng,
      dropoff_lat,
      dropoff_lng
    );

    // Get Google Maps distance and duration for more accurate estimate
    let maps_distance_km = distance_km;
    let maps_duration_minutes = estimateDuration(distance_km);

    // Try to get accurate data from Google Maps if API key is available
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (GOOGLE_MAPS_API_KEY) {
      try {
        const mapsResponse = await fetch(
          `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${pickup_lat},${pickup_lng}&destinations=${dropoff_lat},${dropoff_lng}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const mapsData = await mapsResponse.json();

        if (mapsData.status === 'OK' && mapsData.rows[0].elements[0].status === 'OK') {
          maps_distance_km = mapsData.rows[0].elements[0].distance.value / 1000; // Convert meters to km
          maps_duration_minutes = mapsData.rows[0].elements[0].duration.value / 60; // Convert seconds to minutes
        }
      } catch (error) {
        console.error('Google Maps API error:', error);
        // Fall back to calculated values
      }
    }

    // Check for surge pricing in the area
    const { data: surgeZone } = await supabaseClient
      .from('surge_pricing_zones')
      .select('multiplier')
      .contains('area', {
        type: 'Point',
        coordinates: [pickup_lng, pickup_lat],
      })
      .eq('is_active', true)
      .single();

    const surge_multiplier = surgeZone?.multiplier || 1.0;

    // Get vehicle type pricing
    const { data: vehicleTypeData } = await supabaseClient
      .from('vehicle_types')
      .select('*')
      .eq('slug', vehicle_type)
      .single();

    const vehicle_multiplier = vehicleTypeData?.price_multiplier || 1.0;

    // Calculate fare
    const base_fare = PRICING.BASE_FARE;
    const distance_cost = maps_distance_km * PRICING.COST_PER_KM;
    const time_cost = maps_duration_minutes * PRICING.COST_PER_MINUTE;

    let estimated_fare =
      (base_fare + distance_cost + time_cost) * surge_multiplier * vehicle_multiplier;
    estimated_fare = Math.max(estimated_fare, PRICING.MIN_FARE); // Apply minimum fare

    // Round to nearest 50 NGN
    estimated_fare = Math.round(estimated_fare / 50) * 50;

    // Get available vehicle types with their estimates
    const { data: allVehicleTypes } = await supabaseClient
      .from('vehicle_types')
      .select('*')
      .eq('is_active', true)
      .order('price_multiplier', { ascending: true });

    const vehicle_options = allVehicleTypes?.map(vt => {
      const fare =
        Math.round(
          ((base_fare + distance_cost + time_cost) *
            surge_multiplier *
            vt.price_multiplier) /
            50
        ) * 50;
      return {
        type: vt.slug,
        name: vt.name,
        description: vt.description,
        capacity: vt.capacity,
        estimated_fare: Math.max(fare, PRICING.MIN_FARE),
        icon: vt.icon,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          pickup: { lat: pickup_lat, lng: pickup_lng },
          dropoff: { lat: dropoff_lat, lng: dropoff_lng },
          distance_km: Math.round(maps_distance_km * 10) / 10,
          duration_minutes: Math.round(maps_duration_minutes),
          estimated_fare,
          base_fare,
          surge_multiplier,
          is_surge_active: surge_multiplier > 1.0,
          vehicle_type,
          vehicle_options,
          currency: 'NGN',
          fare_breakdown: {
            base: base_fare,
            distance: Math.round(distance_cost),
            time: Math.round(time_cost),
            surge:
              surge_multiplier > 1.0
                ? Math.round((estimated_fare / surge_multiplier) * (surge_multiplier - 1))
                : 0,
          },
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

// Calculate distance between two points using Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
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

// Estimate duration based on distance (rough approximation)
function estimateDuration(distance_km: number): number {
  const avg_speed_kmh = 30; // Average city speed
  return (distance_km / avg_speed_kmh) * 60; // Convert to minutes
}
