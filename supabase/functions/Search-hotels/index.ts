import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
serve(async req => {
  // Handle CORS preflight
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
    // Defaults
    const radius = params.radius || 25; // miles
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    const sortBy = params.sortBy || 'distance';
    const sortOrder = params.sortOrder || 'asc';
    // Build the query
    const query = supabaseClient
      .from('hotels')
      .select(
        `
        *,
        host:host_profiles!hotels_host_id_fkey(
          user_id,
          business_name,
          rating,
          response_rate
        ),
        room_types(
          id,
          name,
          base_price,
          weekend_price,
          max_adults,
          max_children,
          breakfast_included,
          images
        ),
        hotel_photos(
          id,
          url,
          caption,
          photo_type,
          display_order,
          is_featured
        )
      `
      )
      .eq('is_active', true)
      .eq('is_verified', true);
    // Calculate distance if user location provided
    let hotelsWithDistance = [];
    if (params.userLat && params.userLng) {
      const { data: hotels, error: hotelsError } = await query;
      if (hotelsError) throw hotelsError;
      // Calculate distance for each hotel using Haversine formula
      hotelsWithDistance = hotels
        .map(hotel => {
          if (!hotel.latitude || !hotel.longitude) return null;
          const R = 3959; // Earth's radius in miles
          const dLat = toRad(hotel.latitude - params.userLat);
          const dLon = toRad(hotel.longitude - params.userLng);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(params.userLat)) *
              Math.cos(toRad(hotel.latitude)) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;
          return {
            ...hotel,
            distance_miles: Math.round(distance * 10) / 10, // Round to 1 decimal
          };
        })
        .filter(hotel => hotel !== null && hotel.distance_miles <= radius);
    } else if (params.city) {
      // Search by city name
      const { data: hotels, error: hotelsError } = await query.ilike(
        'city',
        `%${params.city}%`
      );
      if (hotelsError) throw hotelsError;
      hotelsWithDistance = hotels.map(h => ({
        ...h,
        distance_miles: null,
      }));
    } else {
      // No location filter, just get all hotels
      const { data: hotels, error: hotelsError } = await query;
      if (hotelsError) throw hotelsError;
      hotelsWithDistance = hotels.map(h => ({
        ...h,
        distance_miles: null,
      }));
    }
    // Filter by price range
    if (params.minPrice || params.maxPrice) {
      hotelsWithDistance = hotelsWithDistance.filter(hotel => {
        const minRoomPrice = Math.min(...hotel.room_types.map(rt => rt.base_price));
        if (params.minPrice && minRoomPrice < params.minPrice) return false;
        if (params.maxPrice && minRoomPrice > params.maxPrice) return false;
        return true;
      });
    }
    // Filter by star rating
    if (params.starRating && params.starRating.length > 0) {
      hotelsWithDistance = hotelsWithDistance.filter(hotel =>
        params.starRating.includes(hotel.star_rating)
      );
    }
    // Filter by amenities
    if (params.amenities && params.amenities.length > 0) {
      hotelsWithDistance = hotelsWithDistance.filter(hotel => {
        const hotelAmenities = hotel.amenities || [];
        return params.amenities.every(amenity => hotelAmenities.includes(amenity));
      });
    }
    // Check availability for dates if provided
    if (params.checkInDate && params.checkOutDate) {
      const availableHotels = await checkAvailability(
        supabaseClient,
        hotelsWithDistance,
        params.checkInDate,
        params.checkOutDate,
        params.rooms || 1
      );
      hotelsWithDistance = availableHotels;
    }
    // Sorting
    hotelsWithDistance.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'distance':
          comparison = (a.distance_miles || 0) - (b.distance_miles || 0);
          break;
        case 'price':
          const minPriceA = Math.min(...a.room_types.map(rt => rt.base_price));
          const minPriceB = Math.min(...b.room_types.map(rt => rt.base_price));
          comparison = minPriceA - minPriceB;
          break;
        case 'rating':
          comparison = (b.average_rating || 0) - (a.average_rating || 0);
          break;
        case 'popular':
          comparison = (b.total_bookings || 0) - (a.total_bookings || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    // Pagination
    const total = hotelsWithDistance.length;
    const paginatedHotels = hotelsWithDistance.slice(offset, offset + limit);
    // Format response
    const results = paginatedHotels.map(hotel => ({
      id: hotel.id,
      name: hotel.name,
      slug: hotel.slug,
      short_description: hotel.short_description,
      address: hotel.address,
      city: hotel.city,
      state: hotel.state,
      country: hotel.country,
      distance_miles: hotel.distance_miles,
      featured_image: hotel.featured_image,
      star_rating: hotel.star_rating,
      average_rating: hotel.average_rating,
      total_reviews: hotel.total_reviews,
      amenities: hotel.amenities,
      min_price: Math.min(...hotel.room_types.map(rt => rt.base_price)),
      check_in_time: hotel.check_in_time,
      check_out_time: hotel.check_out_time,
      allows_pets: hotel.room_types.some(rt => rt.allows_pets),
      allows_children: hotel.room_types.some(rt => rt.max_children > 0),
      host: hotel.host,
    }));
    return new Response(
      JSON.stringify({
        success: true,
        data: results,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        filters: {
          radius,
          checkInDate: params.checkInDate,
          checkOutDate: params.checkOutDate,
          sortBy,
          sortOrder,
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
// Helper function to convert degrees to radians
function toRad(degrees) {
  return degrees * (Math.PI / 180);
}
// Check room availability for given dates
async function checkAvailability(supabase, hotels, checkIn, checkOut, roomsNeeded) {
  const availableHotels = [];
  for (const hotel of hotels) {
    // Get all room type IDs for this hotel
    const roomTypeIds = hotel.room_types.map(rt => rt.id);
    // Check if any room type has availability
    const { data: availability, error } = await supabase
      .from('room_availability')
      .select('room_type_id, available_rooms')
      .in('room_type_id', roomTypeIds)
      .gte('date', checkIn)
      .lt('date', checkOut)
      .eq('is_blocked', false);
    if (error) continue;
    // Group by room_type_id and check if any has enough rooms for all dates
    const roomTypeAvailability = availability.reduce((acc, curr) => {
      if (!acc[curr.room_type_id]) {
        acc[curr.room_type_id] = [];
      }
      acc[curr.room_type_id].push(curr.available_rooms);
      return acc;
    }, {});
    // Check if any room type has availability for all nights
    const hasAvailability = Object.values(roomTypeAvailability).some(rooms =>
      rooms.every(count => count >= roomsNeeded)
    );
    if (hasAvailability) {
      availableHotels.push(hotel);
    }
  }
  return availableHotels;
}
