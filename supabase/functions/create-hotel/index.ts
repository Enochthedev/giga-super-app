import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if user is a hotel manager
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'hotel_manager' && profile?.role !== 'admin') {
      throw new Error('Unauthorized: Only hotel managers can create hotels');
    }

    const hotelData = await req.json();

    // Validate required fields
    if (!hotelData.name || !hotelData.address || !hotelData.city || !hotelData.country) {
      throw new Error('Name, address, city, and country are required');
    }

    // Generate slug from name
    const slug =
      hotelData.slug ||
      hotelData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    // Create hotel
    const { data: hotel, error: hotelError } = await supabaseClient
      .from('hotels')
      .insert({
        host_id: user.id,
        name: hotelData.name,
        slug,
        description: hotelData.description,
        short_description: hotelData.shortDescription,
        address: hotelData.address,
        city: hotelData.city,
        state: hotelData.state,
        country: hotelData.country,
        postal_code: hotelData.postalCode,
        latitude: hotelData.latitude,
        longitude: hotelData.longitude,
        phone: hotelData.phone,
        email: hotelData.email,
        website: hotelData.website,
        star_rating: hotelData.starRating || 3,
        featured_image: hotelData.featuredImage,
        check_in_time: hotelData.checkInTime || '15:00',
        check_out_time: hotelData.checkOutTime || '11:00',
        cancellation_policy: hotelData.cancellationPolicy || {},
        house_rules: hotelData.houseRules || [],
        policies: hotelData.policies || {},
        amenities: hotelData.amenities || [],
        nearby_attractions: hotelData.nearbyAttractions || [],
        video_url: hotelData.videoUrl,
        is_active: false, // Requires admin approval
        is_verified: false,
      })
      .select()
      .single();

    if (hotelError) throw hotelError;

    // Add amenities if provided
    if (hotelData.amenityIds && hotelData.amenityIds.length > 0) {
      const amenityMappings = hotelData.amenityIds.map((amenityId: string) => ({
        hotel_id: hotel.id,
        amenity_id: amenityId,
      }));

      await supabaseClient.from('hotel_amenity_mappings').insert(amenityMappings);
    }

    // Create host profile if it doesn't exist
    const { data: hostProfile } = await supabaseClient
      .from('host_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!hostProfile) {
      await supabaseClient.from('host_profiles').insert({
        user_id: user.id,
        business_name: hotelData.name,
        host_type: 'hotel',
        is_verified: false,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: hotel,
        message: 'Hotel created successfully. Pending admin approval.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
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
