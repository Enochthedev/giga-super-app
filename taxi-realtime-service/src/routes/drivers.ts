import { createClient } from '@supabase/supabase-js';
import { Request, Response, Router } from 'express';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Audit logging helper
async function logAudit(
  action: string,
  resourceType: string,
  resourceId: string | null,
  userId: string | null,
  details: any
) {
  try {
    await supabase.from('audit_trail').insert({
      table_name: resourceType,
      record_id: resourceId,
      action,
      user_id: userId,
      new_values: details,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}

/**
 * @swagger
 * /api/drivers/profile:
 *   get:
 *     summary: Get current driver's profile
 *     tags: [Drivers]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Driver profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Driver' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { data: driver, error } = await supabase
      .from('driver_profiles')
      .select(
        `
        *,
        user:user_profiles(first_name, last_name, email, phone, avatar_url)
      `
      )
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error || !driver) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Driver profile not found' },
      });
    }

    res.json({ success: true, data: driver });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * @swagger
 * /api/drivers/availability:
 *   put:
 *     summary: Update driver availability status
 *     tags: [Drivers]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [is_online]
 *             properties:
 *               is_online:
 *                 type: boolean
 *                 description: Whether driver is available for rides
 *     responses:
 *       200:
 *         description: Availability updated successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put('/availability', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { is_online } = req.body;
    if (typeof is_online !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'is_online must be a boolean' },
      });
    }

    const { data, error } = await supabase
      .from('driver_profiles')
      .update({ is_online, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await logAudit('UPDATE', 'driver_profiles', data.id, userId, {
      action: 'availability_changed',
      is_online,
    });

    res.json({
      success: true,
      data,
      message: is_online ? 'You are now online' : 'You are now offline',
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * @swagger
 * /api/drivers/location:
 *   put:
 *     summary: Update driver's current location
 *     tags: [Drivers]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [latitude, longitude]
 *             properties:
 *               latitude:
 *                 type: number
 *                 format: double
 *                 example: 6.5244
 *               longitude:
 *                 type: number
 *                 format: double
 *                 example: 3.3792
 *               heading:
 *                 type: number
 *                 description: Direction in degrees (0-360)
 *               speed:
 *                 type: number
 *                 description: Speed in km/h
 *     responses:
 *       200:
 *         description: Location updated successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put('/location', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { latitude, longitude, heading, speed } = req.body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'latitude and longitude are required numbers',
        },
      });
    }

    const updateData: any = {
      current_location: { latitude, longitude },
      last_location_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (typeof heading === 'number') updateData.heading = heading;
    if (typeof speed === 'number') updateData.speed = speed;

    const { data, error } = await supabase
      .from('driver_profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Audit log for location updates (sampled - every 10th update to avoid log spam)
    if (Math.random() < 0.1) {
      await logAudit('UPDATE', 'driver_profiles', data.id, userId, {
        action: 'location_updated',
        latitude,
        longitude,
      });
    }

    res.json({
      success: true,
      data: {
        latitude,
        longitude,
        heading,
        speed,
        updated_at: updateData.last_location_updated_at,
      },
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * @swagger
 * /api/drivers/nearby:
 *   get:
 *     summary: Find nearby available drivers
 *     tags: [Drivers]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *         description: User's latitude
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *         description: User's longitude
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 5
 *         description: Search radius in kilometers
 *       - in: query
 *         name: vehicle_type
 *         schema:
 *           type: string
 *           enum: [standard, premium, suv, motorcycle]
 *         description: Filter by vehicle type
 *     responses:
 *       200:
 *         description: List of nearby drivers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/NearbyDriver'
 */
router.get('/nearby', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radius = 5, vehicle_type } = req.query;

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const searchRadius = parseFloat(radius as string);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valid latitude and longitude are required' },
      });
    }

    // Get online drivers with recent location updates (within last 5 minutes)
    let query = supabase
      .from('driver_profiles')
      .select(
        `
        id, user_id, license_number, vehicle_info, is_online, current_location,
        rating, total_rides, is_verified, vehicle_type, heading, speed,
        last_location_updated_at,
        user:user_profiles(first_name, last_name, avatar_url)
      `
      )
      .eq('is_online', true)
      .eq('is_verified', true)
      .is('deleted_at', null)
      .gte('last_location_updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    if (vehicle_type) {
      query = query.eq('vehicle_type', vehicle_type);
    }

    const { data: drivers, error } = await query;

    if (error) throw error;

    // Calculate distance and filter by radius
    const nearbyDrivers = (drivers || [])
      .map(driver => {
        const driverLat = driver.current_location?.latitude;
        const driverLng = driver.current_location?.longitude;

        if (!driverLat || !driverLng) return null;

        const distance = calculateDistance(lat, lng, driverLat, driverLng);
        if (distance > searchRadius) return null;

        // Estimate ETA (assuming average speed of 30 km/h in city)
        const eta_minutes = Math.ceil((distance / 30) * 60);

        return {
          ...driver,
          distance_km: Math.round(distance * 10) / 10,
          eta_minutes,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.distance_km - b.distance_km)
      .slice(0, 20);

    res.json({ success: true, data: nearbyDrivers, count: nearbyDrivers.length });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * @swagger
 * /api/drivers/earnings:
 *   get:
 *     summary: Get driver's earnings history and summary
 *     tags: [Drivers]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [today, week, month, all], default: all }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Earnings history and summary
 */
router.get('/earnings', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { period = 'all', limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('driver_earnings')
      .select('*', { count: 'exact' })
      .eq('driver_id', userId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    // Apply period filter
    const now = new Date();
    if (period === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      query = query.gte('created_at', startOfDay);
    } else if (period === 'week') {
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', startOfWeek);
    } else if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      query = query.gte('created_at', startOfMonth);
    }

    const { data: earnings, error, count } = await query;

    if (error) throw error;

    // Calculate totals
    const totalEarnings = earnings?.reduce((sum, e) => sum + Number(e.amount || 0), 0) || 0;
    const totalNet = earnings?.reduce((sum, e) => sum + Number(e.net_earning || 0), 0) || 0;
    const totalCommission = earnings?.reduce((sum, e) => sum + Number(e.commission || 0), 0) || 0;
    const totalRides = earnings?.length || 0;

    // Get pending payout amount
    const { data: pendingPayouts } = await supabase
      .from('driver_earnings')
      .select('net_earning')
      .eq('driver_id', userId)
      .eq('payout_status', 'pending');

    const pendingAmount =
      pendingPayouts?.reduce((sum, e) => sum + Number(e.net_earning || 0), 0) || 0;

    res.json({
      success: true,
      data: {
        history: earnings,
        summary: {
          total_earnings: totalEarnings,
          total_net: totalNet,
          total_commission: totalCommission,
          total_rides: totalRides,
          pending_payout: pendingAmount,
          currency: 'NGN',
          period,
        },
      },
      pagination: { total: count, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * @swagger
 * /api/drivers/stats:
 *   get:
 *     summary: Get driver's performance statistics
 *     tags: [Drivers]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Driver statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    // Get driver profile
    const { data: driver, error: driverError } = await supabase
      .from('driver_profiles')
      .select('rating, total_rides, is_verified, created_at')
      .eq('user_id', userId)
      .single();

    if (driverError || !driver) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Driver profile not found' },
      });
    }

    // Get ride statistics
    const { count: completedRides } = await supabase
      .from('rides')
      .select('*', { count: 'exact', head: true })
      .eq('driver_id', userId)
      .eq('status', 'completed');

    const { count: cancelledRides } = await supabase
      .from('rides')
      .select('*', { count: 'exact', head: true })
      .eq('driver_id', userId)
      .eq('status', 'cancelled');

    // Get today's stats
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { count: todayRides } = await supabase
      .from('rides')
      .select('*', { count: 'exact', head: true })
      .eq('driver_id', userId)
      .eq('status', 'completed')
      .gte('completed_at', startOfDay.toISOString());

    const { data: todayEarnings } = await supabase
      .from('driver_earnings')
      .select('net_earning')
      .eq('driver_id', userId)
      .gte('created_at', startOfDay.toISOString());

    const todayTotal = todayEarnings?.reduce((sum, e) => sum + Number(e.net_earning || 0), 0) || 0;

    // Calculate acceptance rate (simplified)
    const totalOffered = (completedRides || 0) + (cancelledRides || 0);
    const acceptanceRate = totalOffered > 0 ? ((completedRides || 0) / totalOffered) * 100 : 100;

    res.json({
      success: true,
      data: {
        rating: driver.rating || 0,
        total_rides: driver.total_rides || completedRides || 0,
        completed_rides: completedRides || 0,
        cancelled_rides: cancelledRides || 0,
        acceptance_rate: Math.round(acceptanceRate),
        is_verified: driver.is_verified,
        member_since: driver.created_at,
        today: {
          rides: todayRides || 0,
          earnings: todayTotal,
          currency: 'NGN',
        },
      },
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// PARAMETERIZED ROUTES (must come after static routes)

/**
 * @swagger
 * /api/drivers/{driverId}:
 *   get:
 *     summary: Get a specific driver's public profile
 *     tags: [Drivers]
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Driver profile
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:driverId', async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;

    const { data: driver, error } = await supabase
      .from('driver_profiles')
      .select(
        `
        id, user_id, vehicle_info, is_online, rating, total_rides, is_verified, vehicle_type,
        user:user_profiles(first_name, last_name, avatar_url)
      `
      )
      .eq('user_id', driverId)
      .is('deleted_at', null)
      .single();

    if (error || !driver) {
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Driver not found' } });
    }

    res.json({ success: true, data: driver });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// Haversine formula for distance calculation
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export default router;
