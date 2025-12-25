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

    const { hotelId, ...updates } = await req.json();

    if (!hotelId) {
      throw new Error('Hotel ID is required');
    }

    // Verify ownership
    const { data: hotel } = await supabaseClient
      .from('hotels')
      .select('host_id')
      .eq('id', hotelId)
      .single();

    if (!hotel) throw new Error('Hotel not found');

    // Check if user owns the hotel or is admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (hotel.host_id !== user.id && profile?.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    // Update hotel
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name) updateData.name = updates.name;
    if (updates.description) updateData.description = updates.description;
    if (updates.shortDescription) updateData.short_description = updates.shortDescription;
    if (updates.address) updateData.address = updates.address;
    if (updates.city) updateData.city = updates.city;
    if (updates.state) updateData.state = updates.state;
    if (updates.country) updateData.country = updates.country;
    if (updates.postalCode) updateData.postal_code = updates.postalCode;
    if (updates.latitude !== undefined) updateData.latitude = updates.latitude;
    if (updates.longitude !== undefined) updateData.longitude = updates.longitude;
    if (updates.phone) updateData.phone = updates.phone;
    if (updates.email) updateData.email = updates.email;
    if (updates.website) updateData.website = updates.website;
    if (updates.starRating) updateData.star_rating = updates.starRating;
    if (updates.featuredImage) updateData.featured_image = updates.featuredImage;
    if (updates.checkInTime) updateData.check_in_time = updates.checkInTime;
    if (updates.checkOutTime) updateData.check_out_time = updates.checkOutTime;
    if (updates.cancellationPolicy)
      updateData.cancellation_policy = updates.cancellationPolicy;
    if (updates.houseRules) updateData.house_rules = updates.houseRules;
    if (updates.policies) updateData.policies = updates.policies;
    if (updates.amenities) updateData.amenities = updates.amenities;
    if (updates.nearbyAttractions)
      updateData.nearby_attractions = updates.nearbyAttractions;
    if (updates.videoUrl) updateData.video_url = updates.videoUrl;

    const { data: updatedHotel, error } = await supabaseClient
      .from('hotels')
      .update(updateData)
      .eq('id', hotelId)
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        data: updatedHotel,
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
