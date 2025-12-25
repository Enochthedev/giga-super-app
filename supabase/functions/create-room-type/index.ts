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

    const roomData = await req.json();

    if (!roomData.hotelId || !roomData.name) {
      throw new Error('Hotel ID and room name are required');
    }

    // Verify hotel ownership
    const { data: hotel } = await supabaseClient
      .from('hotels')
      .select('host_id')
      .eq('id', roomData.hotelId)
      .single();

    if (!hotel) throw new Error('Hotel not found');
    if (hotel.host_id !== user.id) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Unauthorized');
      }
    }

    // Generate slug
    const slug =
      roomData.slug ||
      roomData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    // Create room type
    const { data: roomType, error } = await supabaseClient
      .from('room_types')
      .insert({
        hotel_id: roomData.hotelId,
        name: roomData.name,
        slug,
        description: roomData.description,
        capacity: roomData.capacity || 2,
        beds_count: roomData.bedsCount || 1,
        bed_type: roomData.bedType || 'queen',
        room_size_sqft: roomData.roomSizeSqft,
        base_price: roomData.basePrice,
        weekend_price: roomData.weekendPrice || roomData.basePrice,
        seasonal_prices: roomData.seasonalPrices || {},
        amenities: roomData.amenities || [],
        images: roomData.images || [],
        max_adults: roomData.maxAdults || 2,
        max_children: roomData.maxChildren || 0,
        allows_pets: roomData.allowsPets || false,
        allows_smoking: roomData.allowsSmoking || false,
        breakfast_included: roomData.breakfastIncluded || false,
        refundable: roomData.refundable !== false,
        cancellation_hours: roomData.cancellationHours || 24,
        total_rooms: roomData.totalRooms || 1,
        display_order: roomData.displayOrder || 0,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        data: roomType,
        message: 'Room type created successfully',
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
