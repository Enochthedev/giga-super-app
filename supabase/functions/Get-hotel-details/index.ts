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

    // Get query parameters from URL (supports GET requests)
    const url = new URL(req.url);
    const hotelId = url.searchParams.get('hotelId') || url.searchParams.get('id');
    const hotelSlug = url.searchParams.get('slug');
    const userLat = url.searchParams.get('lat')
      ? parseFloat(url.searchParams.get('lat')!)
      : null;
    const userLng = url.searchParams.get('lng')
      ? parseFloat(url.searchParams.get('lng')!)
      : null;

    if (!hotelId && !hotelSlug) {
      throw new Error('Either hotelId or hotelSlug query parameter is required');
    }
    // Build query
    let query = supabaseClient.from('hotels').select(`
        *,
        host:host_profiles!hotels_host_id_fkey(
          user_id,
          business_name,
          host_type,
          description,
          rating,
          total_bookings,
          is_verified,
          response_rate,
          response_time
        ),
        room_types(
          id,
          name,
          slug,
          description,
          capacity,
          beds_count,
          bed_type,
          room_size_sqft,
          base_price,
          weekend_price,
          seasonal_prices,
          amenities,
          images,
          max_adults,
          max_children,
          allows_pets,
          allows_smoking,
          breakfast_included,
          refundable,
          cancellation_hours,
          total_rooms,
          is_active,
          display_order
        ),
        hotel_photos!hotel_photos_hotel_id_fkey(
          id,
          url,
          caption,
          photo_type,
          display_order,
          is_featured
        ),
        hotel_reviews(
          id,
          rating,
          cleanliness_rating,
          comfort_rating,
          location_rating,
          service_rating,
          value_rating,
          title,
          comment,
          images,
          helpful_count,
          response_from_host,
          is_verified,
          is_featured,
          created_at,
          user_id
        )
      `);

    // Filter by ID or slug
    if (hotelId) {
      query = query.eq('id', hotelId);
    } else {
      query = query.eq('slug', hotelSlug);
    }

    const { data: hotel, error } = await query.single();
    if (error) throw error;
    if (!hotel) throw new Error('Hotel not found');
    // Calculate distance if user location provided
    let distance = null;
    if (userLat && userLng && hotel.latitude && hotel.longitude) {
      const R = 3959; // Earth's radius in miles
      const dLat = toRad(hotel.latitude - userLat);
      const dLon = toRad(hotel.longitude - userLng);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(userLat)) *
          Math.cos(toRad(hotel.latitude)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distance = Math.round(R * c * 10) / 10;
    }
    // Organize photos by type (like your UI shows)
    const photosByType = {
      featured: hotel.hotel_photos.find(p => p.is_featured)?.url || hotel.featured_image,
      interior: hotel.hotel_photos
        .filter(p => p.photo_type === 'interior')
        .sort((a, b) => a.display_order - b.display_order),
      exterior: hotel.hotel_photos
        .filter(p => p.photo_type === 'exterior')
        .sort((a, b) => a.display_order - b.display_order),
      amenity: hotel.hotel_photos
        .filter(p => p.photo_type === 'amenity')
        .sort((a, b) => a.display_order - b.display_order),
      restaurant: hotel.hotel_photos
        .filter(p => p.photo_type === 'restaurant')
        .sort((a, b) => a.display_order - b.display_order),
      all: hotel.hotel_photos.sort((a, b) => a.display_order - b.display_order),
    };
    // Get amenities from amenity mappings
    const { data: amenityMappings } = await supabaseClient
      .from('hotel_amenity_mappings')
      .select(
        `
        amenity:hotel_amenities(
          id,
          name,
          slug,
          icon,
          category
        )
      `
      )
      .eq('hotel_id', hotel.id);
    const organizedAmenities = amenityMappings?.reduce((acc, mapping) => {
      const category = mapping.amenity.category || 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(mapping.amenity);
      return acc;
    }, {});
    // Calculate review statistics
    const reviewStats = calculateReviewStats(hotel.hotel_reviews);
    // Fetch user profiles for reviews (since we can't join directly)
    const reviewsWithUsers = await Promise.all(
      hotel.hotel_reviews
        .filter(r => r.is_approved)
        .sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 10)
        .map(async review => {
          // Fetch user profile
          const { data: userProfile } = await supabaseClient
            .from('user_profiles')
            .select('first_name, last_name, avatar, avatar_url')
            .eq('id', review.user_id)
            .single();
          return {
            ...review,
            user: userProfile
              ? {
                  first_name: userProfile.first_name,
                  last_name: userProfile.last_name,
                  avatar: userProfile.avatar || userProfile.avatar_url,
                  display_name:
                    `${userProfile.first_name} ${userProfile.last_name}`.trim() ||
                    'Anonymous',
                }
              : {
                  first_name: '',
                  last_name: '',
                  avatar: null,
                  display_name: 'Anonymous',
                },
          };
        })
    );
    // Get minimum room price
    const minRoomPrice =
      hotel.room_types.length > 0
        ? Math.min(...hotel.room_types.map(rt => rt.base_price))
        : null;
    // Format response matching your UI structure
    const response = {
      success: true,
      data: {
        // Basic Info
        id: hotel.id,
        name: hotel.name,
        slug: hotel.slug,
        description: hotel.description,
        short_description: hotel.short_description,
        // Location
        address: hotel.address,
        city: hotel.city,
        state: hotel.state,
        country: hotel.country,
        postal_code: hotel.postal_code,
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        distance_miles: distance,
        // Contact
        phone: hotel.phone,
        email: hotel.email,
        website: hotel.website,
        // Images (organized like your UI)
        images: {
          featured: photosByType.featured,
          gallery: photosByType.all.map(p => ({
            url: p.url,
            caption: p.caption,
            type: p.photo_type,
          })),
          by_type: {
            interior: photosByType.interior.map(p => p.url),
            exterior: photosByType.exterior.map(p => p.url),
            amenities: photosByType.amenity.map(p => p.url),
            restaurant: photosByType.restaurant.map(p => p.url),
          },
        },
        // Ratings
        star_rating: hotel.star_rating,
        average_rating: hotel.average_rating,
        total_reviews: hotel.total_reviews,
        review_stats: reviewStats,
        // Pricing
        min_price: minRoomPrice,
        // Amenities (organized by category like "Facilities" section)
        amenities: organizedAmenities,
        amenities_list: hotel.amenities,
        // Policies
        check_in_time: hotel.check_in_time,
        check_out_time: hotel.check_out_time,
        cancellation_policy: hotel.cancellation_policy,
        house_rules: hotel.house_rules,
        policies: hotel.policies,
        // Host Info
        host: hotel.host,
        // Room Types (for "Select room" section)
        room_types: hotel.room_types
          .filter(rt => rt.is_active)
          .sort((a, b) => a.display_order - b.display_order)
          .map(rt => ({
            ...rt,
            photos: rt.images || [],
          })),
        // Reviews (latest 10, sorted by date)
        reviews: reviewsWithUsers,
        // Meta
        is_active: hotel.is_active,
        is_verified: hotel.is_verified,
        total_bookings: hotel.total_bookings,
        nearby_attractions: hotel.nearby_attractions,
        video_url: hotel.video_url,
      },
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      status: 200,
    });
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
function toRad(degrees) {
  return degrees * (Math.PI / 180);
}
function calculateReviewStats(reviews) {
  if (reviews.length === 0) {
    return {
      total: 0,
      average: 0,
      breakdown: {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
      },
      categories: {
        cleanliness: 0,
        comfort: 0,
        location: 0,
        service: 0,
        value: 0,
      },
    };
  }
  const breakdown = reviews.reduce(
    (acc, review) => {
      acc[review.rating] = (acc[review.rating] || 0) + 1;
      return acc;
    },
    {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    }
  );
  const categoryAverages = {
    cleanliness: average(reviews.map(r => r.cleanliness_rating).filter(Boolean)),
    comfort: average(reviews.map(r => r.comfort_rating).filter(Boolean)),
    location: average(reviews.map(r => r.location_rating).filter(Boolean)),
    service: average(reviews.map(r => r.service_rating).filter(Boolean)),
    value: average(reviews.map(r => r.value_rating).filter(Boolean)),
  };
  return {
    total: reviews.length,
    average: average(reviews.map(r => r.rating)),
    breakdown,
    categories: categoryAverages,
  };
}
function average(nums) {
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}
