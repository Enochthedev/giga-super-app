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
 * /api/managers/taxi/drivers:
 *   get:
 *     tags: [Manager - Taxi]
 *     summary: Get taxi drivers
 *     description: Retrieve paginated list of drivers with search and status filtering
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by license number
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, online, offline, verified, unverified]
 *     responses:
 *       200:
 *         description: Drivers retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 drivers:
 *                   - id: "d1234567-89ab-cdef-0123-456789abcdef"
 *                     user_id: "u1234567-89ab-cdef-0123-456789abcdef"
 *                     license_number: "LIC-12345"
 *                     vehicle_info:
 *                       make: "Toyota"
 *                       model: "Camry"
 *                       year: 2022
 *                       plate_number: "ABC-123-XY"
 *                     is_online: true
 *                     is_verified: true
 *                     rating: 4.8
 *                     total_rides: 250
 *                     created_at: "2025-06-15T10:30:00Z"
 *                     user_profiles:
 *                       first_name: "John"
 *                       last_name: "Driver"
 *                       email: "john.driver@example.com"
 *                       phone: "+2348012345678"
 *                       avatar_url: "https://storage.example.com/avatars/john.jpg"
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 200
 *                 pages: 10
 */
router.get('/drivers', authenticate, requireAnyAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', search, status } = req.query;
    const { from, to } = getPaginationRange(page as string, limit as string);

    let query = supabase
      .from('driver_profiles')
      .select(
        `id, user_id, license_number, vehicle_info, is_online, rating, total_rides,
         is_verified, created_at, updated_at,
         user_profiles!inner(first_name, last_name, email, phone, avatar_url)`,
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .range(from, to)
      .order('created_at', { ascending: false });

    if (search) query = query.or(`license_number.ilike.%${search}%`);
    if (status === 'active' || status === 'verified') query = query.eq('is_verified', true);
    else if (status === 'inactive' || status === 'unverified')
      query = query.eq('is_verified', false);
    else if (status === 'online') query = query.eq('is_online', true);
    else if (status === 'offline') query = query.eq('is_online', false);

    const { data: drivers, count, error } = await query;
    if (error) throw error;

    await createAudit(req, 'view_drivers', 'driver_profiles');
    res.json({
      success: true,
      data: { drivers },
      pagination: calculatePagination(page as string, limit as string, count || 0),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get drivers', { error: msg });
    res.status(500).json({ success: false, error: 'Failed to fetch drivers' });
  }
});

/**
 * @swagger
 * /api/managers/taxi/drivers/{id}:
 *   get:
 *     tags: [Manager - Taxi]
 *     summary: Get driver details with rides and earnings
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
 *         description: Driver details retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 driver:
 *                   id: "d1234567-89ab-cdef-0123-456789abcdef"
 *                   license_number: "LIC-12345"
 *                   rating: 4.8
 *                   total_rides: 250
 *                   is_verified: true
 *                   is_online: true
 *                   user_profiles:
 *                     first_name: "John"
 *                     last_name: "Driver"
 *                   recent_rides:
 *                     - id: "r1234567"
 *                       pickup_address: "123 Main St, Lagos"
 *                       dropoff_address: "456 Oak Ave, Lagos"
 *                       final_amount: 2500
 *                       status: "completed"
 *                       created_at: "2026-02-15T14:30:00Z"
 *                   earnings_summary:
 *                     today: 15000
 *                     this_week: 85000
 *                     this_month: 350000
 *                     total: 2500000
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/drivers/:id',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { data: driver, error } = await supabase
        .from('driver_profiles')
        .select(`*, user_profiles!inner(first_name, last_name, email, phone, avatar_url)`)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error || !driver) {
        return res.status(404).json({ success: false, error: 'Driver not found' });
      }

      // Get recent rides
      const { data: rides } = await supabase
        .from('rides')
        .select(
          'id, pickup_location, dropoff_location, final_amount, status, created_at, dropoff_time'
        )
        .eq('driver_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get earnings
      const { data: earnings } = await supabase
        .from('driver_earnings')
        .select('*')
        .eq('driver_id', id)
        .order('created_at', { ascending: false })
        .limit(30);

      // Calculate earnings summary
      const [today] = new Date().toISOString().split('T');
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date();
      monthStart.setDate(1);

      const { data: completedRides } = await supabase
        .from('rides')
        .select('final_amount, created_at')
        .eq('driver_id', id)
        .eq('status', 'completed');

      const earningsSummary = { today: 0, this_week: 0, this_month: 0, total: 0 };
      (completedRides || []).forEach((ride: Record<string, unknown>) => {
        const amount = parseFloat(String(ride.final_amount) || '0');
        earningsSummary.total += amount;
        const rideDate = new Date(String(ride.created_at));
        const [rideDateStr] = rideDate.toISOString().split('T');
        if (rideDateStr === today) earningsSummary.today += amount;
        if (rideDate >= weekAgo) earningsSummary.this_week += amount;
        if (rideDate >= monthStart) earningsSummary.this_month += amount;
      });

      await createAudit(req, 'view_driver_details', 'driver_profiles', id);
      res.json({
        success: true,
        data: {
          driver: {
            ...driver,
            recent_rides: rides || [],
            earnings_history: earnings || [],
            earnings_summary: earningsSummary,
          },
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get driver details', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch driver details' });
    }
  }
);

/**
 * @swagger
 * /api/managers/taxi/drivers/{id}/verify:
 *   put:
 *     tags: [Manager - Taxi]
 *     summary: Verify or unverify driver
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
 *         description: Driver verification updated
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 driver:
 *                   id: "d1234567-89ab-cdef-0123-456789abcdef"
 *                   is_verified: true
 *                   updated_at: "2026-02-16T10:30:00Z"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put(
  '/drivers/:id/verify',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { is_verified } = req.body;

      if (typeof is_verified !== 'boolean') {
        return res.status(400).json({ success: false, error: 'is_verified must be a boolean' });
      }

      const { data: driver, error } = await supabase
        .from('driver_profiles')
        .update({ is_verified, updated_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error || !driver) {
        return res.status(404).json({ success: false, error: 'Driver not found' });
      }

      await createAudit(
        req,
        is_verified ? 'verify_driver' : 'unverify_driver',
        'driver_profiles',
        id
      );
      res.json({ success: true, data: { driver } });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to update driver verification', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to update driver verification' });
    }
  }
);

/**
 * @swagger
 * /api/managers/taxi/rides:
 *   get:
 *     tags: [Manager - Taxi]
 *     summary: Get taxi rides
 *     description: Retrieve paginated list of rides with filtering
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, in_progress, completed, cancelled]
 *       - in: query
 *         name: driver_id
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
 *         description: Rides retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 rides:
 *                   - id: "r1234567-89ab-cdef-0123-456789abcdef"
 *                     user_id: "u1234567-89ab-cdef-0123-456789abcdef"
 *                     driver_id: "d1234567-89ab-cdef-0123-456789abcdef"
 *                     pickup_address: "123 Main Street, Lagos"
 *                     dropoff_address: "456 Oak Avenue, Lagos"
 *                     estimated_amount: 2200
 *                     final_amount: 2500
 *                     distance_km: 8.5
 *                     duration_minutes: 25
 *                     status: "completed"
 *                     pickup_time: "2026-02-15T14:30:00Z"
 *                     dropoff_time: "2026-02-15T14:55:00Z"
 *                     created_at: "2026-02-15T14:25:00Z"
 *                     user_profiles:
 *                       first_name: "Jane"
 *                       last_name: "Customer"
 *                       phone: "+2348098765432"
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 1500
 *                 pages: 75
 */
router.get('/rides', authenticate, requireAnyAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', status, driver_id, start_date, end_date } = req.query;
    const { from, to } = getPaginationRange(page as string, limit as string);

    let query = supabase
      .from('rides')
      .select(
        `id, user_id, driver_id, pickup_location, dropoff_location, pickup_address, dropoff_address,
         estimated_amount, final_amount, distance_km, duration_minutes, status,
         pickup_time, dropoff_time, created_at,
         user_profiles!rides_user_id_fkey(first_name, last_name, phone),
         driver:driver_profiles!rides_driver_id_fkey(user_profiles(first_name, last_name))`,
        { count: 'exact' }
      )
      .range(from, to)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (driver_id) query = query.eq('driver_id', driver_id);
    if (start_date) query = query.gte('created_at', start_date);
    if (end_date) query = query.lte('created_at', end_date);

    const { data: rides, count, error } = await query;
    if (error) throw error;

    await createAudit(req, 'view_rides', 'rides');
    res.json({
      success: true,
      data: { rides },
      pagination: calculatePagination(page as string, limit as string, count || 0),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get rides', { error: msg });
    res.status(500).json({ success: false, error: 'Failed to fetch rides' });
  }
});

/**
 * @swagger
 * /api/managers/taxi/dashboard-stats:
 *   get:
 *     tags: [Manager - Taxi]
 *     summary: Get taxi dashboard statistics
 *     description: Comprehensive dashboard stats for taxi module
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
 *                 rides:
 *                   total: 1500
 *                   completed: 1350
 *                   cancelled: 100
 *                   in_progress: 50
 *                   revenue: 3750000
 *                   avg_fare: 2500
 *                 drivers:
 *                   total: 200
 *                   online: 85
 *                   verified: 180
 *                   avg_rating: 4.6
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

      // Get rides stats
      const { data: rides } = await supabase
        .from('rides')
        .select('id, final_amount, status, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const totalRides = rides?.length || 0;
      const completedRides =
        rides?.filter((r: Record<string, unknown>) => r.status === 'completed').length || 0;
      const cancelledRides =
        rides?.filter((r: Record<string, unknown>) => r.status === 'cancelled').length || 0;
      const inProgressRides =
        rides?.filter((r: Record<string, unknown>) => r.status === 'in_progress').length || 0;
      const totalRevenue =
        rides
          ?.filter((r: Record<string, unknown>) => r.status === 'completed')
          .reduce(
            (sum: number, r: Record<string, unknown>) => sum + (Number(r.final_amount) || 0),
            0
          ) || 0;
      const avgFare = completedRides > 0 ? totalRevenue / completedRides : 0;

      // Get drivers stats
      const { count: totalDrivers } = await supabase
        .from('driver_profiles')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null);

      const { count: onlineDrivers } = await supabase
        .from('driver_profiles')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('is_online', true);

      const { count: verifiedDrivers } = await supabase
        .from('driver_profiles')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('is_verified', true);

      const { data: driverRatings } = await supabase
        .from('driver_profiles')
        .select('rating')
        .is('deleted_at', null)
        .not('rating', 'is', null);

      const avgRating = driverRatings?.length
        ? driverRatings.reduce(
            (sum: number, d: Record<string, unknown>) => sum + (d.rating as number),
            0
          ) / driverRatings.length
        : 0;

      await createAudit(req, 'view_taxi_dashboard', 'taxi_dashboard');
      res.json({
        success: true,
        data: {
          rides: {
            total: totalRides,
            completed: completedRides,
            cancelled: cancelledRides,
            in_progress: inProgressRides,
            revenue: Math.round(totalRevenue * 100) / 100,
            avg_fare: Math.round(avgFare * 100) / 100,
          },
          drivers: {
            total: totalDrivers || 0,
            online: onlineDrivers || 0,
            verified: verifiedDrivers || 0,
            avg_rating: Math.round(avgRating * 10) / 10,
          },
          period: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
          },
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get taxi dashboard stats', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
    }
  }
);

export default router;
