/**
 * Hotel Management routes - For hotel owners/hosts
 * Handles hotel CRUD, room types, availability, analytics
 */

import { Router } from 'express';

import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { databaseService } from '../utils/database.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * Helper function to check if user has a host profile
 */
async function checkHostProfile(userId: string): Promise<{ exists: boolean; profile?: any }> {
  const { data: hostProfile, error } = await databaseService.supabase
    .from('host_profiles')
    .select('id, is_verified, business_name')
    .eq('id', userId)
    .single();

  if (error || !hostProfile) {
    return { exists: false };
  }
  return { exists: true, profile: hostProfile };
}

/**
 * Helper function to return host profile required error
 */
function hostProfileRequiredError(res: any) {
  return res.status(403).json({
    success: false,
    error: 'You must be a registered host to access this feature',
    code: 'HOST_PROFILE_REQUIRED',
    details: {
      message: 'Please apply for the HOST role first using POST /api/v1/roles/apply',
      apply_endpoint: '/api/v1/roles/apply',
      required_data: {
        role_name: 'HOST',
        application_data: {
          business_name: 'Your business name',
          business_type: 'hotel',
          description: 'Description of your business',
        },
      },
    },
  });
}

/**
 * POST /api/v1/management/hotels
 * Create a new hotel
 */
router.post('/hotels', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    // Check if user has a host profile
    const hostCheck = await checkHostProfile(userId);
    if (!hostCheck.exists) {
      return hostProfileRequiredError(res);
    }

    const {
      name,
      description,
      short_description,
      address,
      city,
      state,
      country,
      postal_code,
      latitude,
      longitude,
      phone,
      email,
      website,
      star_rating,
      amenities,
      check_in_time,
      check_out_time,
      cancellation_policy,
      house_rules,
      policies,
      featured_image,
    } = req.body;

    if (!name || !address || !city || !country) {
      res
        .status(400)
        .json({ success: false, error: 'Name, address, city, and country are required' });
      return;
    }

    // Generate slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const { data: hotel, error } = await databaseService.supabase
      .from('hotels')
      .insert({
        name,
        slug,
        description,
        short_description,
        address,
        city,
        state,
        country,
        postal_code,
        latitude,
        longitude,
        phone,
        email,
        website,
        star_rating: star_rating || 3,
        amenities: amenities || [],
        check_in_time: check_in_time || '14:00',
        check_out_time: check_out_time || '11:00',
        cancellation_policy,
        house_rules,
        policies,
        featured_image,
        host_id: userId,
        is_active: false,
        is_verified: false,
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, message: 'Hotel created successfully', data: hotel });
  } catch (error) {
    console.error('Create hotel error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * PUT /api/v1/management/hotels/:id
 * Update hotel details
 */
router.put('/hotels/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Verify ownership
    const { data: existing } = await databaseService.supabase
      .from('hotels')
      .select('host_id')
      .eq('id', id)
      .single();

    if (!existing || existing.host_id !== userId) {
      res.status(403).json({ success: false, error: 'Not authorized to update this hotel' });
      return;
    }

    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id;
    delete updates.host_id;
    delete updates.is_verified;

    const { data: hotel, error } = await databaseService.supabase
      .from('hotels')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, message: 'Hotel updated successfully', data: hotel });
  } catch (error) {
    console.error('Update hotel error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * DELETE /api/v1/management/hotels/:id
 * Soft delete a hotel
 */
router.delete('/hotels/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data: existing } = await databaseService.supabase
      .from('hotels')
      .select('host_id')
      .eq('id', id)
      .single();

    if (!existing || existing.host_id !== userId) {
      res.status(403).json({ success: false, error: 'Not authorized to delete this hotel' });
      return;
    }

    const { error } = await databaseService.supabase
      .from('hotels')
      .update({ is_active: false, deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Hotel deleted successfully' });
  } catch (error) {
    console.error('Delete hotel error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/v1/management/hotels
 * Get hotels owned by the user
 */
router.get('/hotels', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    // Check if user has a host profile
    const hostCheck = await checkHostProfile(userId);
    if (!hostCheck.exists) {
      return hostProfileRequiredError(res);
    }

    const { data: hotels, error } = await databaseService.supabase
      .from('hotels')
      .select('*, room_types(id, name, base_price, total_rooms)')
      .eq('host_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: hotels });
  } catch (error) {
    console.error('Get my hotels error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/v1/management/hotels/:hotelId/room-types
 * Create a new room type
 */
router.post('/hotels/:hotelId/room-types', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { hotelId } = req.params;
    const {
      name,
      description,
      capacity,
      beds_count,
      bed_type,
      room_size_sqft,
      base_price,
      weekend_price,
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
      display_order,
    } = req.body;

    // Verify ownership
    const { data: hotel } = await databaseService.supabase
      .from('hotels')
      .select('host_id')
      .eq('id', hotelId)
      .single();

    if (!hotel || hotel.host_id !== userId) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    if (!name || !base_price) {
      res.status(400).json({ success: false, error: 'Name and base_price are required' });
      return;
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const { data: roomType, error } = await databaseService.supabase
      .from('room_types')
      .insert({
        hotel_id: hotelId,
        name,
        slug,
        description,
        capacity: capacity || 2,
        beds_count: beds_count || 1,
        bed_type: bed_type || 'queen',
        room_size_sqft,
        base_price,
        weekend_price: weekend_price || base_price,
        amenities: amenities || [],
        images: images || [],
        max_adults: max_adults || 2,
        max_children: max_children || 1,
        allows_pets: allows_pets || false,
        allows_smoking: allows_smoking || false,
        breakfast_included: breakfast_included || false,
        refundable: refundable || true,
        cancellation_hours: cancellation_hours || 24,
        total_rooms: total_rooms || 1,
        display_order: display_order || 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, message: 'Room type created', data: roomType });
  } catch (error) {
    console.error('Create room type error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * PUT /api/v1/management/room-types/:id
 * Update a room type
 */
router.put('/room-types/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Verify ownership via hotel
    const { data: roomType } = await databaseService.supabase
      .from('room_types')
      .select('hotel_id, hotels(host_id)')
      .eq('id', id)
      .single();

    if (!roomType || (roomType as any).hotels?.host_id !== userId) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id;
    delete updates.hotel_id;

    const { data, error } = await databaseService.supabase
      .from('room_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, message: 'Room type updated', data });
  } catch (error) {
    console.error('Update room type error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * DELETE /api/v1/management/room-types/:id
 * Delete a room type
 */
router.delete('/room-types/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data: roomType } = await databaseService.supabase
      .from('room_types')
      .select('hotel_id, hotels(host_id)')
      .eq('id', id)
      .single();

    if (!roomType || (roomType as any).hotels?.host_id !== userId) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    const { error } = await databaseService.supabase
      .from('room_types')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Room type deleted' });
  } catch (error) {
    console.error('Delete room type error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * PUT /api/v1/management/room-types/:id/availability
 * Update room availability for specific dates
 */
router.put('/room-types/:id/availability', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { dates } = req.body; // Array of { date, available_rooms, price_override }

    const { data: roomType } = await databaseService.supabase
      .from('room_types')
      .select('hotel_id, hotels(host_id)')
      .eq('id', id)
      .single();

    if (!roomType || (roomType as any).hotels?.host_id !== userId) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    if (!dates || !Array.isArray(dates)) {
      res.status(400).json({ success: false, error: 'dates array is required' });
      return;
    }

    const results = [];
    for (const entry of dates) {
      const { date, available_rooms, price_override } = entry;
      const { data, error } = await databaseService.supabase
        .from('room_availability')
        .upsert(
          {
            room_type_id: id,
            date,
            available_rooms,
            price_override,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'room_type_id,date' }
        )
        .select()
        .single();

      if (!error) results.push(data);
    }

    res.json({ success: true, message: 'Availability updated', data: results });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/v1/management/hotels/:hotelId/bulk-pricing
 * Bulk update pricing for room types
 */
router.post('/hotels/:hotelId/bulk-pricing', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { hotelId } = req.params;
    const { updates } = req.body; // Array of { room_type_id, base_price, weekend_price }

    const { data: hotel } = await databaseService.supabase
      .from('hotels')
      .select('host_id')
      .eq('id', hotelId)
      .single();

    if (!hotel || hotel.host_id !== userId) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    const results = [];
    for (const update of updates || []) {
      const { room_type_id, base_price, weekend_price } = update;
      const { data, error } = await databaseService.supabase
        .from('room_types')
        .update({ base_price, weekend_price, updated_at: new Date().toISOString() })
        .eq('id', room_type_id)
        .eq('hotel_id', hotelId)
        .select()
        .single();

      if (!error && data) results.push(data);
    }

    res.json({ success: true, message: 'Pricing updated', data: results });
  } catch (error) {
    console.error('Bulk pricing error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/v1/management/hotels/:hotelId/analytics
 * Get hotel analytics
 */
router.get('/hotels/:hotelId/analytics', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { hotelId } = req.params;
    const { start_date, end_date } = req.query;

    const { data: hotel } = await databaseService.supabase
      .from('hotels')
      .select('host_id, name')
      .eq('id', hotelId)
      .single();

    if (!hotel || hotel.host_id !== userId) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    // Get bookings for the period
    let bookingsQuery = databaseService.supabase
      .from('hotel_bookings')
      .select('*')
      .eq('hotel_id', hotelId);

    if (start_date) bookingsQuery = bookingsQuery.gte('created_at', start_date);
    if (end_date) bookingsQuery = bookingsQuery.lte('created_at', end_date);

    const { data: bookings } = await bookingsQuery;

    const totalBookings = bookings?.length || 0;
    const confirmedBookings = bookings?.filter(b => b.booking_status === 'confirmed').length || 0;
    const cancelledBookings = bookings?.filter(b => b.booking_status === 'cancelled').length || 0;
    const totalRevenue =
      bookings?.reduce(
        (sum, b) => (b.payment_status === 'paid' ? sum + parseFloat(b.total_amount || 0) : sum),
        0
      ) || 0;

    // Get reviews
    const { data: reviews } = await databaseService.supabase
      .from('hotel_reviews')
      .select('rating')
      .eq('hotel_id', hotelId);

    const avgRating = reviews?.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    res.json({
      success: true,
      data: {
        hotel_name: hotel.name,
        period: { start_date, end_date },
        bookings: {
          total: totalBookings,
          confirmed: confirmedBookings,
          cancelled: cancelledBookings,
        },
        revenue: {
          total: totalRevenue,
          average_per_booking: totalBookings ? totalRevenue / totalBookings : 0,
        },
        reviews: { total: reviews?.length || 0, average_rating: Math.round(avgRating * 10) / 10 },
      },
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/v1/management/hotels/:hotelId/calendar
 * Get booking calendar for a hotel
 */
router.get('/hotels/:hotelId/calendar', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { hotelId } = req.params;
    const { start_date, end_date } = req.query;

    const { data: hotel } = await databaseService.supabase
      .from('hotels')
      .select('host_id')
      .eq('id', hotelId)
      .single();

    if (!hotel || hotel.host_id !== userId) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    let query = databaseService.supabase
      .from('hotel_bookings')
      .select(
        'id, booking_number, guest_name, check_in_date, check_out_date, booking_status, room_type:room_types(name)'
      )
      .eq('hotel_id', hotelId)
      .not('booking_status', 'eq', 'cancelled');

    if (start_date) query = query.gte('check_out_date', start_date);
    if (end_date) query = query.lte('check_in_date', end_date);

    const { data: bookings, error } = await query.order('check_in_date');
    if (error) throw error;

    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/v1/management/bookings/:id/check-in
 * Check in a guest
 */
router.post('/bookings/:id/check-in', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data: booking } = await databaseService.supabase
      .from('hotel_bookings')
      .select('*, hotels(host_id)')
      .eq('id', id)
      .single();

    if (!booking || (booking as any).hotels?.host_id !== userId) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    if (booking.booking_status !== 'confirmed') {
      res.status(400).json({ success: false, error: 'Booking must be confirmed to check in' });
      return;
    }

    const { data, error } = await databaseService.supabase
      .from('hotel_bookings')
      .update({ booking_status: 'checked_in', checked_in_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, message: 'Guest checked in', data });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/v1/management/bookings/:id/check-out
 * Check out a guest
 */
router.post('/bookings/:id/check-out', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data: booking } = await databaseService.supabase
      .from('hotel_bookings')
      .select('*, hotels(host_id)')
      .eq('id', id)
      .single();

    if (!booking || (booking as any).hotels?.host_id !== userId) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    if (booking.booking_status !== 'checked_in') {
      res.status(400).json({ success: false, error: 'Guest must be checked in first' });
      return;
    }

    const { data, error } = await databaseService.supabase
      .from('hotel_bookings')
      .update({ booking_status: 'checked_out', checked_out_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, message: 'Guest checked out', data });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * PUT /api/v1/management/bookings/:id/status
 * Update booking status
 */
router.put('/bookings/:id/status', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = [
      'pending',
      'confirmed',
      'checked_in',
      'checked_out',
      'cancelled',
      'no_show',
    ];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid status' });
      return;
    }

    const { data: booking } = await databaseService.supabase
      .from('hotel_bookings')
      .select('*, hotels(host_id)')
      .eq('id', id)
      .single();

    if (!booking || (booking as any).hotels?.host_id !== userId) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    const { data, error } = await databaseService.supabase
      .from('hotel_bookings')
      .update({ booking_status: status, host_notes: notes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, message: 'Booking status updated', data });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/v1/management/hotels/:hotelId/promo-codes
 * Create a promo code for a hotel
 */
router.post('/hotels/:hotelId/promo-codes', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { hotelId } = req.params;
    const {
      code,
      description,
      discount_type,
      discount_value,
      min_order_amount,
      max_discount_amount,
      usage_limit,
      per_user_limit,
      min_nights,
      valid_from,
      valid_until,
      first_booking_only,
      applies_to_weekends_only,
    } = req.body;

    const { data: hotel } = await databaseService.supabase
      .from('hotels')
      .select('host_id')
      .eq('id', hotelId)
      .single();

    if (!hotel || hotel.host_id !== userId) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    if (!code || !discount_type || !discount_value) {
      res
        .status(400)
        .json({ success: false, error: 'code, discount_type, and discount_value are required' });
      return;
    }

    const { data: promo, error } = await databaseService.supabase
      .from('hotel_promo_codes')
      .insert({
        code: code.toUpperCase(),
        description,
        discount_type, // 'percentage' or 'fixed'
        discount_value,
        min_order_amount: min_order_amount || 0,
        max_discount_amount,
        usage_limit: usage_limit || null,
        usage_count: 0,
        per_user_limit: per_user_limit || null,
        min_nights: min_nights || null,
        applicable_hotels: [hotelId], // Apply to this specific hotel
        valid_from: valid_from || new Date().toISOString(),
        valid_until,
        first_booking_only: first_booking_only || false,
        applies_to_weekends_only: applies_to_weekends_only || false,
        is_active: true,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, message: 'Promo code created', data: promo });
  } catch (error) {
    console.error('Create promo code error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/v1/management/promo-codes/validate
 * Validate a promo code
 */
router.post('/promo-codes/validate', async (req: AuthenticatedRequest, res) => {
  try {
    const { code, hotel_id, booking_amount } = req.body;

    if (!code || !hotel_id) {
      res.status(400).json({ success: false, error: 'code and hotel_id are required' });
      return;
    }

    // Find promo code that applies to this hotel
    const { data: promo, error } = await databaseService.supabase
      .from('hotel_promo_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !promo) {
      res.status(400).json({ success: false, error: 'Invalid promo code' });
      return;
    }

    // Check if promo applies to this hotel
    if (promo.applicable_hotels && promo.applicable_hotels.length > 0) {
      if (!promo.applicable_hotels.includes(hotel_id)) {
        res.status(400).json({ success: false, error: 'Promo code not valid for this hotel' });
        return;
      }
    }

    // Check if hotel is excluded
    if (promo.excluded_hotels && promo.excluded_hotels.includes(hotel_id)) {
      res.status(400).json({ success: false, error: 'Promo code not valid for this hotel' });
      return;
    }

    const now = new Date();
    if (promo.valid_from && new Date(promo.valid_from) > now) {
      res.status(400).json({ success: false, error: 'Promo code not yet valid' });
      return;
    }
    if (promo.valid_until && new Date(promo.valid_until) < now) {
      res.status(400).json({ success: false, error: 'Promo code has expired' });
      return;
    }
    if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
      res.status(400).json({ success: false, error: 'Promo code usage limit reached' });
      return;
    }
    if (booking_amount && promo.min_order_amount > booking_amount) {
      res
        .status(400)
        .json({ success: false, error: `Minimum booking amount is ${promo.min_order_amount}` });
      return;
    }

    let discount = 0;
    if (promo.discount_type === 'percentage') {
      discount = booking_amount
        ? (booking_amount * promo.discount_value) / 100
        : promo.discount_value;
      // Apply max discount cap if set
      if (promo.max_discount_amount && discount > promo.max_discount_amount) {
        discount = promo.max_discount_amount;
      }
    } else {
      discount = promo.discount_value;
    }

    res.json({
      success: true,
      data: {
        valid: true,
        code: promo.code,
        description: promo.description,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        calculated_discount: discount,
        max_discount_amount: promo.max_discount_amount,
        min_order_amount: promo.min_order_amount,
      },
    });
  } catch (error) {
    console.error('Validate promo code error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/v1/management/reviews/:id/respond
 * Respond to a review
 */
router.post('/reviews/:id/respond', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { response } = req.body;

    if (!response) {
      res.status(400).json({ success: false, error: 'Response is required' });
      return;
    }

    const { data: review } = await databaseService.supabase
      .from('hotel_reviews')
      .select('hotel_id, hotels(host_id)')
      .eq('id', id)
      .single();

    if (!review || (review as any).hotels?.host_id !== userId) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    const { data, error } = await databaseService.supabase
      .from('hotel_reviews')
      .update({ response_from_host: response, response_date: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, message: 'Response added', data });
  } catch (error) {
    console.error('Respond to review error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

export { router as managementRouter };
