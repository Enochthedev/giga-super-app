import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization'),
          },
        },
      }
    );
    const params = await req.json();
    // Validate required fields
    if (!params.hotelId || !params.checkInDate || !params.checkOutDate) {
      throw new Error('hotelId, checkInDate, and checkOutDate are required');
    }
    const roomsNeeded = params.rooms || 1;
    const adults = params.adults || 2;
    const children = params.children || 0;
    // Validate dates
    const checkIn = new Date(params.checkInDate);
    const checkOut = new Date(params.checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkIn < today) {
      throw new Error('Check-in date cannot be in the past');
    }
    if (checkOut <= checkIn) {
      throw new Error('Check-out date must be after check-in date');
    }
    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );
    // Get hotel info
    const { data: hotel, error: hotelError } = await supabaseClient
      .from('hotels')
      .select('id, name, is_active, is_verified')
      .eq('id', params.hotelId)
      .single();
    if (hotelError) throw hotelError;
    if (!hotel) throw new Error('Hotel not found');
    if (!hotel.is_active || !hotel.is_verified) {
      throw new Error('Hotel is not available for booking');
    }
    // Get all room types for this hotel
    const { data: roomTypes, error: roomTypesError } = await supabaseClient
      .from('room_types')
      .select('*')
      .eq('hotel_id', params.hotelId)
      .eq('is_active', true)
      .order('display_order', {
        ascending: true,
      });
    if (roomTypesError) throw roomTypesError;
    if (!roomTypes || roomTypes.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No room types available at this hotel',
          data: {
            hotel_id: params.hotelId,
            check_in_date: params.checkInDate,
            check_out_date: params.checkOutDate,
            nights,
            available_rooms: [],
          },
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 200,
        }
      );
    }
    // Check availability for each room type
    const availableRooms = [];
    for (const roomType of roomTypes) {
      // Check capacity
      const totalGuests = adults + children;
      if (totalGuests > roomType.capacity) {
        continue; // Skip room types that can't accommodate the guests
      }
      // Check if adults fit (most important)
      if (adults > roomType.max_adults) {
        continue;
      }
      // Check if children fit
      if (children > roomType.max_children) {
        continue;
      }
      // Use the database function to get available room count
      let availableCount = roomType.total_rooms; // Default to total rooms
      try {
        const { data: availabilityData, error: availError } = await supabaseClient.rpc(
          'get_available_room_count',
          {
            p_room_type_id: roomType.id,
            p_check_in: params.checkInDate,
            p_check_out: params.checkOutDate,
          }
        );
        if (!availError && availabilityData !== null) {
          availableCount = availabilityData;
        } else {
          // Fallback: manually check availability
          const { data: availRecords } = await supabaseClient
            .from('room_availability')
            .select('available_rooms')
            .eq('room_type_id', roomType.id)
            .gte('date', params.checkInDate)
            .lt('date', params.checkOutDate);
          if (availRecords && availRecords.length > 0) {
            // Get minimum available rooms across the date range
            availableCount = Math.min(...availRecords.map(r => r.available_rooms));
          }
        }
      } catch (error) {
        console.error('Error checking availability:', error);
        // Use total rooms as fallback
      }
      // Check if enough rooms available
      if (availableCount >= roomsNeeded) {
        // Calculate pricing
        const { totalPrice, priceBreakdown } = await calculateRoomPrice(
          supabaseClient,
          roomType,
          params.checkInDate,
          params.checkOutDate,
          roomsNeeded
        );
        availableRooms.push({
          room_type_id: roomType.id,
          name: roomType.name,
          slug: roomType.slug,
          description: roomType.description,
          // Capacity
          capacity: roomType.capacity,
          max_adults: roomType.max_adults,
          max_children: roomType.max_children,
          // Room details
          beds_count: roomType.beds_count,
          bed_type: roomType.bed_type,
          room_size_sqft: roomType.room_size_sqft,
          // Availability
          available_rooms: availableCount,
          total_rooms: roomType.total_rooms,
          // Pricing
          base_price: roomType.base_price,
          price_per_night: priceBreakdown.avg_price_per_night,
          total_price: totalPrice,
          price_breakdown: priceBreakdown,
          // Features
          amenities: roomType.amenities,
          images: roomType.images,
          breakfast_included: roomType.breakfast_included,
          refundable: roomType.refundable,
          cancellation_hours: roomType.cancellation_hours,
          allows_pets: roomType.allows_pets,
          allows_smoking: roomType.allows_smoking,
          // Booking constraints
          is_available: true,
          can_accommodate_guests: true,
        });
      }
    }
    // Sort by price (cheapest first)
    availableRooms.sort((a, b) => a.total_price - b.total_price);
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          hotel_id: params.hotelId,
          hotel_name: hotel.name,
          check_in_date: params.checkInDate,
          check_out_date: params.checkOutDate,
          nights,
          rooms_requested: roomsNeeded,
          guests: {
            adults,
            children,
          },
          available_rooms: availableRooms,
          total_available_types: availableRooms.length,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error checking availability:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    );
  }
});
// Calculate room price considering dynamic pricing and seasonal rates
async function calculateRoomPrice(
  supabase,
  roomType,
  checkInDate,
  checkOutDate,
  roomsCount
) {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  // Get availability records with pricing for date range
  const { data: availability, error } = await supabase
    .from('room_availability')
    .select('date, base_price, dynamic_price')
    .eq('room_type_id', roomType.id)
    .gte('date', checkInDate)
    .lt('date', checkOutDate)
    .order('date', {
      ascending: true,
    });
  if (error) {
    console.error('Error fetching pricing:', error);
  }
  // Build price per night array
  const pricePerNight = [];
  const currentDate = new Date(checkIn);
  while (currentDate < checkOut) {
    const dateStr = currentDate.toISOString().split('T')[0];
    // Find availability record for this date
    const avail = availability?.find(a => a.date === dateStr);
    let nightPrice;
    if (avail?.dynamic_price) {
      // Use dynamic price if set
      nightPrice = parseFloat(avail.dynamic_price);
    } else if (avail?.base_price) {
      // Use availability base price
      nightPrice = parseFloat(avail.base_price);
    } else {
      // Fall back to room type base price
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      if (isWeekend && roomType.weekend_price) {
        nightPrice = parseFloat(roomType.weekend_price);
      } else {
        nightPrice = parseFloat(roomType.base_price);
      }
    }
    pricePerNight.push(nightPrice);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  const subtotal = pricePerNight.reduce((sum, price) => sum + price, 0) * roomsCount;
  const avgPricePerNight =
    pricePerNight.reduce((sum, price) => sum + price, 0) / pricePerNight.length;
  return {
    totalPrice: subtotal,
    priceBreakdown: {
      nights: pricePerNight.length,
      rooms: roomsCount,
      price_per_night: pricePerNight,
      avg_price_per_night: Math.round(avgPricePerNight),
      subtotal,
    },
  };
}
