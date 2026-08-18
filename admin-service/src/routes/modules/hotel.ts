import { Response, Router } from 'express';
import winston from 'winston';

import { createAudit } from '../../middleware/audit';
import { AuthRequest, authenticate, requireAdmin, requireAnyAccess } from '../../middleware/auth';
import { calculatePagination, getPaginationRange, supabase } from '../../utils/database';

const router = Router();
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

/**
 * @swagger
 * /api/managers/hotel/hotels:
 *   get:
 *     tags: [Manager - Hotel]
 *     summary: Get hotels
 *     description: Retrieve paginated list of hotels with search and filtering
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by hotel name, city, or state
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, verified, unverified]
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Hotels retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 hotels:
 *                   - id: "h1234567-89ab-cdef-0123-456789abcdef"
 *                     name: "Grand Lagos Hotel"
 *                     description: "Luxury 5-star hotel in the heart of Lagos"
 *                     address: "123 Victoria Island"
 *                     city: "Lagos"
 *                     state: "Lagos"
 *                     country: "Nigeria"
 *                     star_rating: 5
 *                     average_rating: 4.7
 *                     total_reviews: 256
 *                     total_bookings: 1250
 *                     is_active: true
 *                     is_verified: true
 *                     created_at: "2025-01-15T10:30:00Z"
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 75
 *                 pages: 4
 */
router.get('/hotels', authenticate, requireAnyAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', search, status, city, state } = req.query;
    const { from, to } = getPaginationRange(page as string, limit as string);

    let query = supabase
      .from('hotels')
      .select(
        `id, name, description, address, city, state, country, star_rating,
         average_rating, total_reviews, total_bookings, is_active, is_verified,
         created_at, updated_at`,
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .range(from, to)
      .order('created_at', { ascending: false });

    if (search)
      query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%`);
    if (status === 'active') query = query.eq('is_active', true);
    else if (status === 'inactive') query = query.eq('is_active', false);
    else if (status === 'verified') query = query.eq('is_verified', true);
    else if (status === 'unverified') query = query.eq('is_verified', false);
    if (city) query = query.ilike('city', `%${city}%`);
    if (state) query = query.ilike('state', `%${state}%`);

    const { data: hotels, count, error } = await query;
    if (error) throw error;

    await createAudit(req, 'view_hotels', 'hotels');
    res.json({
      success: true,
      data: { hotels },
      pagination: calculatePagination(page as string, limit as string, count || 0),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get hotels', { error: msg });
    res.status(500).json({ success: false, error: 'Failed to fetch hotels' });
  }
});

/**
 * @swagger
 * /api/managers/hotel/hotels/{id}:
 *   get:
 *     tags: [Manager - Hotel]
 *     summary: Get hotel details with rooms, bookings, and reviews
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Hotel details retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 hotel:
 *                   id: "h1234567-89ab-cdef-0123-456789abcdef"
 *                   name: "Grand Lagos Hotel"
 *                   star_rating: 5
 *                   average_rating: 4.7
 *                   is_verified: true
 *                   rooms:
 *                     - id: "rm123"
 *                       name: "Deluxe Suite"
 *                       description: "Spacious suite with ocean view"
 *                       base_price: 50000
 *                       capacity: 2
 *                       total_rooms: 10
 *                       amenities: ["WiFi", "AC", "TV", "Mini Bar"]
 *                   recent_bookings:
 *                     - id: "b123"
 *                       booking_reference: "BK-2026-001234"
 *                       check_in_date: "2026-02-20"
 *                       check_out_date: "2026-02-23"
 *                       total_price: 150000
 *                       booking_status: "confirmed"
 *                       user_profiles:
 *                         first_name: "Jane"
 *                         last_name: "Guest"
 *                   reviews:
 *                     - id: "rev123"
 *                       rating: 5
 *                       comment: "Excellent service and amenities"
 *                       created_at: "2026-02-10T10:30:00Z"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/hotels/:id',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { data: hotel, error } = await supabase
        .from('hotels')
        .select(`*`)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error || !hotel) {
        return res.status(404).json({ success: false, error: 'Hotel not found' });
      }

      // Get room types
      const { data: rooms } = await supabase
        .from('room_types')
        .select('id, name, description, base_price, capacity, total_rooms, amenities')
        .eq('hotel_id', id);

      // Get recent bookings
      const { data: bookings } = await supabase
        .from('hotel_bookings')
        .select(
          `id, check_in_date, check_out_date, total_price, booking_status, created_at,
         user_profiles!inner(first_name, last_name)`
        )
        .eq('hotel_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get reviews
      const { data: reviews } = await supabase
        .from('hotel_reviews')
        .select(`id, rating, comment, created_at, user_profiles!inner(first_name, last_name)`)
        .eq('hotel_id', id)
        .order('created_at', { ascending: false })
        .limit(20);

      await createAudit(req, 'view_hotel_details', 'hotels', id);
      res.json({
        success: true,
        data: {
          hotel: {
            ...hotel,
            rooms: rooms || [],
            recent_bookings: bookings || [],
            reviews: reviews || [],
          },
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get hotel details', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch hotel details' });
    }
  }
);

/**
 * @swagger
 * /api/managers/hotel/hotels/{id}/verify:
 *   put:
 *     tags: [Manager - Hotel]
 *     summary: Verify or unverify hotel
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [is_verified]
 *             properties:
 *               is_verified:
 *                 type: boolean
 *           example:
 *             is_verified: true
 *     responses:
 *       200:
 *         description: Hotel verification updated
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 hotel:
 *                   id: "h1234567-89ab-cdef-0123-456789abcdef"
 *                   name: "Grand Lagos Hotel"
 *                   is_verified: true
 *                   updated_at: "2026-02-16T10:30:00Z"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put(
  '/hotels/:id/verify',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { is_verified } = req.body;

      if (typeof is_verified !== 'boolean') {
        return res.status(400).json({ success: false, error: 'is_verified must be a boolean' });
      }

      const { data: hotel, error } = await supabase
        .from('hotels')
        .update({ is_verified, updated_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error || !hotel) {
        return res.status(404).json({ success: false, error: 'Hotel not found' });
      }

      await createAudit(req, is_verified ? 'verify_hotel' : 'unverify_hotel', 'hotels', id);
      res.json({ success: true, data: { hotel } });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to update hotel verification', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to update hotel verification' });
    }
  }
);

/**
 * @swagger
 * /api/managers/hotel/bookings:
 *   get:
 *     tags: [Manager - Hotel]
 *     summary: Get hotel bookings
 *     description: Retrieve paginated list of bookings with filtering
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, checked_in, checked_out, cancelled]
 *       - in: query
 *         name: hotel_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 bookings:
 *                   - id: "b1234567-89ab-cdef-0123-456789abcdef"
 *                     booking_reference: "BK-2026-001234"
 *                     hotel_id: "h1234567-89ab-cdef-0123-456789abcdef"
 *                     user_id: "u1234567-89ab-cdef-0123-456789abcdef"
 *                     room_type_id: "rt1234567-89ab-cdef-0123-456789abcdef"
 *                     check_in_date: "2026-02-20"
 *                     check_out_date: "2026-02-23"
 *                     num_guests: 2
 *                     total_price: 150000
 *                     booking_status: "confirmed"
 *                     payment_status: "paid"
 *                     created_at: "2026-02-10T10:30:00Z"
 *                     hotels:
 *                       id: "h123"
 *                       name: "Grand Lagos Hotel"
 *                       city: "Lagos"
 *                     user_profiles:
 *                       first_name: "Jane"
 *                       last_name: "Guest"
 *                       email: "jane@example.com"
 *                       phone: "+2348098765432"
 *                     room_types:
 *                       name: "Deluxe Suite"
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 500
 *                 pages: 25
 */
router.get('/bookings', authenticate, requireAnyAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', status, hotel_id, start_date, end_date } = req.query;
    const { from, to } = getPaginationRange(page as string, limit as string);

    let query = supabase
      .from('hotel_bookings')
      .select(
        // Aliased to the real hotel_bookings schema: the table has booking_number /
        // guest_count / total_amount, not booking_reference / num_guests / total_price.
        // The user_profiles!inner embed was also dropped — hotel_bookings.user_id has no
        // FK to user_profiles, so PostgREST could not resolve the relationship and every
        // request 500'd. Guest details live directly on the booking row.
        `id, booking_reference:booking_number, hotel_id, user_id, room_type_id,
         check_in_date, check_out_date, num_guests:guest_count, total_price:total_amount,
         booking_status, payment_status, created_at,
         guest_name, guest_email, guest_phone,
         hotels!inner(id, name, city),
         room_types(name)`,
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .range(from, to)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('booking_status', status);
    if (hotel_id) query = query.eq('hotel_id', hotel_id);
    if (start_date) query = query.gte('check_in_date', start_date);
    if (end_date) query = query.lte('check_out_date', end_date);

    const { data: bookings, count, error } = await query;
    if (error) throw error;

    await createAudit(req, 'view_bookings', 'hotel_bookings');
    res.json({
      success: true,
      data: { bookings },
      pagination: calculatePagination(page as string, limit as string, count || 0),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get bookings', { error: msg });
    res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
  }
});

/**
 * @swagger
 * /api/managers/hotel/bookings/{id}/status:
 *   put:
 *     tags: [Manager - Hotel]
 *     summary: Update booking status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, checked_in, checked_out, cancelled]
 *               notes:
 *                 type: string
 *           example:
 *             status: "checked_in"
 *             notes: "Guest arrived at 2pm"
 *     responses:
 *       200:
 *         description: Booking status updated
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 booking:
 *                   id: "b1234567-89ab-cdef-0123-456789abcdef"
 *                   booking_status: "checked_in"
 *                   updated_at: "2026-02-20T14:00:00Z"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put(
  '/bookings/:id/status',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, error: 'Status is required' });
      }

      const validStatuses = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }

      const { data: booking, error } = await supabase
        .from('hotel_bookings')
        .update({ booking_status: status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error || !booking) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }

      // Add status history
      await supabase.from('hotel_booking_status_history').insert({
        booking_id: id,
        status,
        notes: notes || null,
        created_by: req.user?.id,
      });

      await createAudit(req, 'update_booking_status', 'hotel_bookings', id);
      res.json({ success: true, data: { booking } });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to update booking status', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to update booking status' });
    }
  }
);

/**
 * @swagger
 * /api/managers/hotel/dashboard-stats:
 *   get:
 *     tags: [Manager - Hotel]
 *     summary: Get hotel dashboard statistics
 *     description: Comprehensive dashboard stats for hotel module
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 bookings:
 *                   total: 500
 *                   confirmed: 400
 *                   checked_in: 50
 *                   cancelled: 50
 *                   revenue: 25000000
 *                   avg_booking_value: 50000
 *                 hotels:
 *                   total: 75
 *                   active: 70
 *                   verified: 65
 *                 reviews:
 *                   total: 1200
 *                   average_rating: 4.3
 *                   five_star: 600
 *                   one_star: 50
 *                 period:
 *                   start: "2026-01-16"
 *                   end: "2026-02-16"
 */
router.get(
  '/dashboard-stats',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { start_date, end_date } = req.query;
      const startDate = start_date
        ? new Date(start_date as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = end_date ? new Date(end_date as string) : new Date();

      // Get bookings stats
      const { data: bookings } = await supabase
        .from('hotel_bookings')
        .select('id, total_amount, booking_status, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .is('deleted_at', null);

      const totalBookings = bookings?.length || 0;
      const confirmedBookings =
        bookings?.filter((b: Record<string, unknown>) =>
          ['confirmed', 'checked_in', 'checked_out'].includes(b.booking_status as string)
        ).length || 0;
      const checkedInBookings =
        bookings?.filter((b: Record<string, unknown>) => b.booking_status === 'checked_in')
          .length || 0;
      const cancelledBookings =
        bookings?.filter((b: Record<string, unknown>) => b.booking_status === 'cancelled').length ||
        0;
      const totalRevenue =
        bookings
          ?.filter((b: Record<string, unknown>) => b.booking_status !== 'cancelled')
          .reduce(
            (sum: number, b: Record<string, unknown>) => sum + (Number(b.total_amount) || 0),
            0
          ) || 0;
      const avgBookingValue = confirmedBookings > 0 ? totalRevenue / confirmedBookings : 0;

      // Get hotels stats
      const { count: totalHotels } = await supabase
        .from('hotels')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null);

      const { count: activeHotels } = await supabase
        .from('hotels')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('is_active', true);

      const { count: verifiedHotels } = await supabase
        .from('hotels')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('is_verified', true);

      // Get reviews stats
      const { data: reviews } = await supabase
        .from('hotel_reviews')
        .select('rating')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const avgRating = reviews?.length
        ? reviews.reduce(
            (sum: number, r: Record<string, unknown>) => sum + (r.rating as number),
            0
          ) / reviews.length
        : 0;
      const fiveStarReviews =
        reviews?.filter((r: Record<string, unknown>) => r.rating === 5).length || 0;
      const oneStarReviews =
        reviews?.filter((r: Record<string, unknown>) => r.rating === 1).length || 0;

      await createAudit(req, 'view_hotel_dashboard', 'hotel_dashboard');
      res.json({
        success: true,
        data: {
          bookings: {
            total: totalBookings,
            confirmed: confirmedBookings,
            checked_in: checkedInBookings,
            cancelled: cancelledBookings,
            revenue: Math.round(totalRevenue * 100) / 100,
            avg_booking_value: Math.round(avgBookingValue * 100) / 100,
          },
          hotels: {
            total: totalHotels || 0,
            active: activeHotels || 0,
            verified: verifiedHotels || 0,
          },
          reviews: {
            total: reviews?.length || 0,
            average_rating: Math.round(avgRating * 10) / 10,
            five_star: fiveStarReviews,
            one_star: oneStarReviews,
          },
          period: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
          },
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get hotel dashboard stats', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
    }
  }
);

export default router;
