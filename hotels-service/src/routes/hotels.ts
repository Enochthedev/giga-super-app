/**
 * Hotels routes - Search, details, and hotel management
 */

import { Router } from 'express';

import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { databaseService } from '../utils/database.js';

const router = Router();

/**
 * GET /api/v1/hotels/search
 * Search hotels with filters
 */
router.get('/search', async (req, res) => {
  try {
    const {
      city,
      lat,
      lng,
      radius = '25',
      check_in,
      check_out,
      rooms = '1',
      guests,
      min_price,
      max_price,
      sort_by = 'distance',
      sort_order = 'asc',
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offset = (pageNum - 1) * limitNum;
    const radiusNum = parseFloat(radius as string) || 25;

    // Build query
    let query = databaseService.supabase
      .from('hotels')
      .select(
        `
        *,
        room_types(id, name, base_price, weekend_price, max_adults, max_children, breakfast_included, images)
      `
      )
      .eq('is_active', true)
      .eq('is_verified', true);

    const { data: hotels, error } = await query;
    if (error) throw error;

    let results = hotels || [];

    // Filter by location (distance calculation)
    if (lat && lng) {
      const userLat = parseFloat(lat as string);
      const userLng = parseFloat(lng as string);

      results = results
        .map(hotel => {
          if (!hotel.latitude || !hotel.longitude) return null;
          const R = 3959; // Earth's radius in miles
          const dLat = toRad(hotel.latitude - userLat);
          const dLon = toRad(hotel.longitude - userLng);
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(userLat)) * Math.cos(toRad(hotel.latitude)) * Math.sin(dLon / 2) ** 2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;
          return { ...hotel, distance_miles: Math.round(distance * 10) / 10 };
        })
        .filter((h): h is NonNullable<typeof h> => h !== null && h.distance_miles <= radiusNum);
    } else if (city) {
      results = results.filter(h => h.city?.toLowerCase().includes((city as string).toLowerCase()));
    }

    // Filter by price range
    if (min_price || max_price) {
      results = results.filter(hotel => {
        const minRoomPrice = Math.min(
          ...(hotel.room_types?.map((rt: any) => rt.base_price) || [Infinity])
        );
        if (min_price && minRoomPrice < parseFloat(min_price as string)) return false;
        if (max_price && minRoomPrice > parseFloat(max_price as string)) return false;
        return true;
      });
    }

    // Sort results
    results.sort((a, b) => {
      let comparison = 0;
      switch (sort_by) {
        case 'distance':
          comparison = (a.distance_miles || 0) - (b.distance_miles || 0);
          break;
        case 'price':
          const minA = Math.min(...(a.room_types?.map((rt: any) => rt.base_price) || [0]));
          const minB = Math.min(...(b.room_types?.map((rt: any) => rt.base_price) || [0]));
          comparison = minA - minB;
          break;
        case 'rating':
          comparison = (b.average_rating || 0) - (a.average_rating || 0);
          break;
      }
      return sort_order === 'asc' ? comparison : -comparison;
    });

    // Pagination
    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limitNum);

    // Format response
    const formatted = paginatedResults.map(hotel => ({
      id: hotel.id,
      name: hotel.name,
      slug: hotel.slug,
      short_description: hotel.short_description,
      address: hotel.address,
      city: hotel.city,
      state: hotel.state,
      country: hotel.country,
      distance_miles: hotel.distance_miles || null,
      featured_image: hotel.featured_image,
      star_rating: hotel.star_rating,
      average_rating: hotel.average_rating,
      total_reviews: hotel.total_reviews,
      amenities: hotel.amenities,
      min_price: Math.min(...(hotel.room_types?.map((rt: any) => rt.base_price) || [0])),
      check_in_time: hotel.check_in_time,
      check_out_time: hotel.check_out_time,
    }));

    res.json({
      success: true,
      data: formatted,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      filters: {
        radius: radiusNum,
        checkInDate: check_in,
        checkOutDate: check_out,
        sortBy: sort_by,
        sortOrder: sort_order,
      },
    });
  } catch (error) {
    console.error('Search hotels error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/v1/hotels/:id
 * Get hotel details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.query;

    const { data: hotel, error } = await databaseService.supabase
      .from('hotels')
      .select(
        `
        *,
        room_types(
          id, name, slug, description, capacity, beds_count, bed_type, room_size_sqft,
          base_price, weekend_price, amenities, images, max_adults, max_children,
          allows_pets, allows_smoking, breakfast_included, refundable, cancellation_hours,
          total_rooms, is_active, display_order
        ),
        hotel_photos(id, url, caption, photo_type, display_order, is_featured),
        hotel_reviews(
          id, rating, cleanliness_rating, comfort_rating, location_rating, service_rating,
          value_rating, title, comment, images, helpful_count, response_from_host,
          is_verified, is_featured, created_at, user_id, is_approved
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!hotel) {
      res.status(404).json({ success: false, error: 'Hotel not found' });
      return;
    }

    // Calculate distance if user location provided
    let distance = null;
    if (lat && lng && hotel.latitude && hotel.longitude) {
      const userLat = parseFloat(lat as string);
      const userLng = parseFloat(lng as string);
      const R = 3959;
      const dLat = toRad(hotel.latitude - userLat);
      const dLon = toRad(hotel.longitude - userLng);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(userLat)) * Math.cos(toRad(hotel.latitude)) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distance = Math.round(R * c * 10) / 10;
    }

    // Organize photos by type
    const photos = hotel.hotel_photos || [];
    const photosByType = {
      featured: photos.find((p: any) => p.is_featured)?.url || hotel.featured_image,
      all: photos.sort((a: any, b: any) => a.display_order - b.display_order),
    };

    // Calculate review stats
    const reviews = (hotel.hotel_reviews || []).filter((r: any) => r.is_approved);
    const reviewStats = calculateReviewStats(reviews);

    // Get min room price
    const minRoomPrice =
      hotel.room_types?.length > 0
        ? Math.min(...hotel.room_types.map((rt: any) => rt.base_price))
        : null;

    res.json({
      success: true,
      data: {
        id: hotel.id,
        name: hotel.name,
        slug: hotel.slug,
        description: hotel.description,
        short_description: hotel.short_description,
        address: hotel.address,
        city: hotel.city,
        state: hotel.state,
        country: hotel.country,
        postal_code: hotel.postal_code,
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        distance_miles: distance,
        phone: hotel.phone,
        email: hotel.email,
        website: hotel.website,
        images: {
          featured: photosByType.featured,
          gallery: photosByType.all.map((p: any) => ({
            url: p.url,
            caption: p.caption,
            type: p.photo_type,
          })),
        },
        star_rating: hotel.star_rating,
        average_rating: hotel.average_rating,
        total_reviews: hotel.total_reviews,
        review_stats: reviewStats,
        min_price: minRoomPrice,
        amenities_list: hotel.amenities,
        check_in_time: hotel.check_in_time,
        check_out_time: hotel.check_out_time,
        cancellation_policy: hotel.cancellation_policy,
        house_rules: hotel.house_rules,
        policies: hotel.policies,
        room_types: hotel.room_types
          ?.filter((rt: any) => rt.is_active)
          .sort((a: any, b: any) => a.display_order - b.display_order),
        reviews: reviews.slice(0, 10),
        is_active: hotel.is_active,
        is_verified: hotel.is_verified,
      },
    });
  } catch (error) {
    console.error('Get hotel details error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/v1/hotels/:id/reviews
 * Get hotel reviews with pagination
 */
router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '10', sort_by = 'recent', min_rating, verified } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 10, 100);
    const offset = (pageNum - 1) * limitNum;

    let query = databaseService.supabase
      .from('hotel_reviews')
      .select('*', { count: 'exact' })
      .eq('hotel_id', id)
      .eq('is_approved', true);

    if (min_rating) query = query.gte('rating', parseInt(min_rating as string));
    if (verified === 'true') query = query.eq('is_verified', true);

    // Sort
    switch (sort_by) {
      case 'recent':
        query = query.order('created_at', { ascending: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'highest_rating':
        query = query.order('rating', { ascending: false });
        break;
      case 'lowest_rating':
        query = query.order('rating', { ascending: true });
        break;
      case 'most_helpful':
        query = query.order('helpful_count', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + limitNum - 1);

    const { data: reviews, error, count } = await query;
    if (error) throw error;

    // Fetch user profiles
    const userIds = [...new Set(reviews?.map(r => r.user_id).filter(Boolean) || [])];
    let userProfiles: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await databaseService.supabase
        .from('user_profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', userIds);
      if (profiles) {
        userProfiles = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      }
    }

    const formatted = (reviews || []).map(review => {
      const user = userProfiles[review.user_id];
      return {
        id: review.id,
        rating: review.rating,
        ratings: {
          overall: review.rating,
          cleanliness: review.cleanliness_rating,
          comfort: review.comfort_rating,
          location: review.location_rating,
          service: review.service_rating,
          value: review.value_rating,
        },
        title: review.title,
        comment: review.comment,
        images: review.images || [],
        isVerified: review.is_verified,
        helpfulCount: review.helpful_count || 0,
        responseFromHost: review.response_from_host,
        createdAt: review.created_at,
        user: {
          name: user
            ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Anonymous'
            : 'Anonymous',
          avatar: user?.avatar_url,
        },
      };
    });

    res.json({
      success: true,
      data: formatted,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
      },
    });
  } catch (error) {
    console.error('Get hotel reviews error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/v1/hotels/:id/availability
 * Check room availability for a hotel
 */
router.get('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { check_in, check_out, rooms = '1', adults = '2', children = '0' } = req.query;

    if (!check_in || !check_out) {
      res.status(400).json({ success: false, error: 'check_in and check_out dates are required' });
      return;
    }

    const roomsNeeded = parseInt(rooms as string) || 1;
    const adultsNum = parseInt(adults as string) || 2;
    const childrenNum = parseInt(children as string) || 0;

    // Validate dates
    const checkIn = new Date(check_in as string);
    const checkOut = new Date(check_out as string);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn < today) {
      res.status(400).json({ success: false, error: 'Check-in date cannot be in the past' });
      return;
    }
    if (checkOut <= checkIn) {
      res.status(400).json({ success: false, error: 'Check-out date must be after check-in date' });
      return;
    }

    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    // Get hotel and room types
    const { data: hotel, error: hotelError } = await databaseService.supabase
      .from('hotels')
      .select('id, name, is_active, is_verified')
      .eq('id', id)
      .single();

    if (hotelError || !hotel) {
      res.status(404).json({ success: false, error: 'Hotel not found' });
      return;
    }

    const { data: roomTypes, error: roomError } = await databaseService.supabase
      .from('room_types')
      .select('*')
      .eq('hotel_id', id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (roomError) throw roomError;

    const availableRooms = [];
    for (const roomType of roomTypes || []) {
      // Check capacity
      if (adultsNum > roomType.max_adults || childrenNum > roomType.max_children) continue;

      // Check availability
      const { data: availability } = await databaseService.supabase
        .from('room_availability')
        .select('available_rooms')
        .eq('room_type_id', roomType.id)
        .gte('date', check_in)
        .lt('date', check_out);

      let availableCount = roomType.total_rooms;
      if (availability && availability.length > 0) {
        availableCount = Math.min(...availability.map(a => a.available_rooms));
      }

      if (availableCount >= roomsNeeded) {
        // Calculate pricing
        const totalPrice = roomType.base_price * nights * roomsNeeded;
        availableRooms.push({
          room_type_id: roomType.id,
          name: roomType.name,
          description: roomType.description,
          capacity: roomType.capacity,
          max_adults: roomType.max_adults,
          max_children: roomType.max_children,
          available_rooms: availableCount,
          base_price: roomType.base_price,
          total_price: totalPrice,
          amenities: roomType.amenities,
          images: roomType.images,
          breakfast_included: roomType.breakfast_included,
          refundable: roomType.refundable,
        });
      }
    }

    availableRooms.sort((a, b) => a.total_price - b.total_price);

    res.json({
      success: true,
      data: {
        hotel_id: id,
        hotel_name: hotel.name,
        check_in_date: check_in,
        check_out_date: check_out,
        nights,
        rooms_requested: roomsNeeded,
        guests: { adults: adultsNum, children: childrenNum },
        available_rooms: availableRooms,
        total_available_types: availableRooms.length,
      },
    });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/v1/hotels/recommended
 * Get recommended hotels for user
 */
router.get('/recommended', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    let targetCity = 'Lagos';
    let preferredAmenities: string[] = [];

    if (userId) {
      const { data: history } = await databaseService.supabase
        .from('hotel_bookings')
        .select('hotel_id, hotels(city, amenities)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (history && history.length > 0) {
        targetCity = (history[0] as any).hotels?.city || targetCity;
        const amenityCounts: Record<string, number> = {};
        history.forEach((h: any) => {
          h.hotels?.amenities?.forEach((a: string) => {
            amenityCounts[a] = (amenityCounts[a] || 0) + 1;
          });
        });
        preferredAmenities = Object.entries(amenityCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([k]) => k);
      }
    }

    const { data: hotels, error } = await databaseService.supabase
      .from('hotels')
      .select('*')
      .eq('is_active', true)
      .eq('city', targetCity)
      .order('star_rating', { ascending: false })
      .limit(10);

    if (error) throw error;

    const scored = (hotels || []).map(hotel => {
      let score = (hotel.star_rating || 0) * 2;
      if (preferredAmenities.length > 0 && hotel.amenities) {
        const matchCount = hotel.amenities.filter((a: string) =>
          preferredAmenities.includes(a)
        ).length;
        score += matchCount;
      }
      return { ...hotel, recommendation_score: score };
    });

    scored.sort((a, b) => b.recommendation_score - a.recommendation_score);

    res.json({
      success: true,
      data: scored.slice(0, 5),
      context: { basedOnCity: targetCity, preferredAmenities },
    });
  } catch (error) {
    console.error('Get recommended hotels error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// Helper functions
function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function calculateReviewStats(reviews: any[]) {
  if (reviews.length === 0) {
    return { total: 0, average: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
  }
  const breakdown = reviews.reduce(
    (acc, r) => {
      acc[r.rating] = (acc[r.rating] || 0) + 1;
      return acc;
    },
    { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  );
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  return { total: reviews.length, average: Math.round(avg * 10) / 10, breakdown };
}

export { router as hotelsRouter };
