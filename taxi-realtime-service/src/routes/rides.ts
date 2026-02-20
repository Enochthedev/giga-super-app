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
      table_name: 'rides',
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
 * /api/rides/estimate:
 *   post:
 *     summary: Get fare estimate for a ride
 *     tags: [Rides]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pickup_lat, pickup_lng, dropoff_lat, dropoff_lng]
 *             properties:
 *               pickup_lat: { type: number, example: 6.5244 }
 *               pickup_lng: { type: number, example: 3.3792 }
 *               dropoff_lat: { type: number, example: 6.6018 }
 *               dropoff_lng: { type: number, example: 3.3515 }
 *               vehicle_type: { type: string, enum: [standard, premium, suv], default: standard }
 *     responses:
 *       200:
 *         description: Fare estimate
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     distance_km: { type: number }
 *                     duration_minutes: { type: number }
 *                     base_fare: { type: number }
 *                     distance_fare: { type: number }
 *                     estimated_total: { type: number }
 *                     currency: { type: string }
 */
router.post('/estimate', async (req: Request, res: Response) => {
  try {
    const {
      pickup_lat,
      pickup_lng,
      dropoff_lat,
      dropoff_lng,
      vehicle_type = 'standard',
    } = req.body;

    if (!pickup_lat || !pickup_lng || !dropoff_lat || !dropoff_lng) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'All coordinates are required' },
      });
    }

    const distance_km = calculateDistance(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng);
    const duration_minutes = Math.ceil((distance_km / 25) * 60); // Avg 25 km/h in city

    // Pricing (NGN)
    const pricing: Record<string, { base: number; perKm: number; perMin: number }> = {
      standard: { base: 500, perKm: 100, perMin: 20 },
      premium: { base: 800, perKm: 150, perMin: 30 },
      suv: { base: 1000, perKm: 180, perMin: 35 },
    };

    const rates = pricing[vehicle_type] || pricing.standard;
    const base_fare = rates.base;
    const distance_fare = Math.round(distance_km * rates.perKm);
    const time_fare = Math.round(duration_minutes * rates.perMin);
    const estimated_total = base_fare + distance_fare + time_fare;

    res.json({
      success: true,
      data: {
        distance_km: Math.round(distance_km * 10) / 10,
        duration_minutes,
        base_fare,
        distance_fare,
        time_fare,
        estimated_total,
        currency: 'NGN',
        vehicle_type,
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
 * /api/rides:
 *   post:
 *     summary: Request a new ride
 *     tags: [Rides]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pickup_lat, pickup_lng, dropoff_lat, dropoff_lng]
 *             properties:
 *               pickup_lat: { type: number }
 *               pickup_lng: { type: number }
 *               pickup_address: { type: string }
 *               dropoff_lat: { type: number }
 *               dropoff_lng: { type: number }
 *               dropoff_address: { type: string }
 *               driver_id: { type: string, format: uuid, description: 'Optional - request specific driver' }
 *               scheduled_time: { type: string, format: date-time, description: 'For scheduled rides' }
 *               passenger_notes: { type: string }
 *     responses:
 *       201:
 *         description: Ride created successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const {
      pickup_lat,
      pickup_lng,
      pickup_address,
      dropoff_lat,
      dropoff_lng,
      dropoff_address,
      driver_id,
      scheduled_time,
      passenger_notes,
    } = req.body;

    if (!pickup_lat || !pickup_lng || !dropoff_lat || !dropoff_lng) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Pickup and dropoff coordinates are required',
        },
      });
    }

    const distance_km = calculateDistance(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng);
    const duration_minutes = Math.ceil((distance_km / 25) * 60);
    const base_fare = 500 + Math.round(distance_km * 100) + Math.round(duration_minutes * 20);

    // Generate ride number
    const ride_number = `RIDE-${Date.now().toString(36).toUpperCase()}`;

    const rideData: any = {
      ride_number,
      passenger_id: userId,
      pickup_location: { latitude: pickup_lat, longitude: pickup_lng },
      pickup_address,
      dropoff_location: { latitude: dropoff_lat, longitude: dropoff_lng },
      dropoff_address,
      distance_km,
      estimated_duration_minutes: duration_minutes,
      base_fare,
      total_fare: base_fare,
      final_amount: base_fare,
      status: 'requested',
      passenger_notes,
    };

    if (driver_id) rideData.driver_id = driver_id;
    if (scheduled_time) rideData.scheduled_time = scheduled_time;

    const { data: ride, error } = await supabase.from('rides').insert(rideData).select().single();

    if (error) throw error;

    // Audit log
    await logAudit('INSERT', 'rides', ride.id, userId, { action: 'ride_requested', ride_number });

    res.status(201).json({ success: true, data: ride });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * @swagger
 * /api/rides/{rideId}:
 *   get:
 *     summary: Get ride details
 *     tags: [Rides]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Ride details
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:rideId', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { rideId } = req.params;

    // Query ride without FK join for passenger (FK points to auth.users, not user_profiles)
    const { data: ride, error } = await supabase
      .from('rides')
      .select(
        `
        *,
        driver:driver_profiles(
          id, user_id, vehicle_info, rating, total_rides, vehicle_type,
          user:user_profiles(first_name, last_name, avatar_url, phone)
        )
      `
      )
      .eq('id', rideId)
      .single();

    if (error || !ride) {
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Ride not found' } });
    }

    // Only allow passenger or driver to view
    if (ride.passenger_id !== userId && ride.driver_id !== userId) {
      return res
        .status(403)
        .json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }

    // Fetch passenger profile separately (passenger_id references auth.users, not user_profiles)
    let passengerProfile = null;
    if (ride.passenger_id) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, avatar_url, phone')
        .eq('id', ride.passenger_id)
        .single();
      passengerProfile = profile;
    }

    res.json({ success: true, data: { ...ride, passenger: passengerProfile } });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * @swagger
 * /api/rides/{rideId}/status:
 *   put:
 *     summary: Update ride status
 *     tags: [Rides]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema: { type: string, format: uuid }
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
 *                 enum: [accepted, arrived, picked_up, in_progress, completed, cancelled]
 *               cancellation_reason: { type: string }
 *     responses:
 *       200:
 *         description: Status updated
 */
router.put('/:rideId/status', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { rideId } = req.params;
    const { status, cancellation_reason } = req.body;

    const validStatuses = [
      'accepted',
      'arrived',
      'picked_up',
      'in_progress',
      'completed',
      'cancelled',
      'no_show',
    ];
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid status' } });
    }

    // Get current ride
    const { data: currentRide, error: fetchError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .single();

    if (fetchError || !currentRide) {
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Ride not found' } });
    }

    // Verify user is passenger or driver
    if (currentRide.passenger_id !== userId && currentRide.driver_id !== userId) {
      return res
        .status(403)
        .json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }

    const updateData: any = { status, updated_at: new Date().toISOString() };

    // Set timestamps based on status
    if (status === 'accepted') updateData.accepted_at = new Date().toISOString();
    if (status === 'picked_up') updateData.pickup_time = new Date().toISOString();
    if (status === 'in_progress') updateData.started_at = new Date().toISOString();
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
      updateData.dropoff_time = new Date().toISOString();
    }
    if (status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
      updateData.cancelled_by = userId;
      updateData.cancellation_reason = cancellation_reason;
    }

    const { data: ride, error } = await supabase
      .from('rides')
      .update(updateData)
      .eq('id', rideId)
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await logAudit('UPDATE', 'rides', rideId, userId, {
      action: 'status_changed',
      old_status: currentRide.status,
      new_status: status,
    });

    res.json({ success: true, data: ride });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * @swagger
 * /api/rides/{rideId}/accept:
 *   post:
 *     summary: Driver accepts a ride request
 *     tags: [Rides]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               driver_eta_minutes: { type: integer, description: 'Estimated arrival time' }
 *     responses:
 *       200:
 *         description: Ride accepted
 */
router.post('/:rideId/accept', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { rideId } = req.params;
    const { driver_eta_minutes } = req.body;

    // Verify user is a driver
    const { data: driver } = await supabase
      .from('driver_profiles')
      .select('id, is_verified, is_online')
      .eq('user_id', userId)
      .single();

    if (!driver || !driver.is_verified) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only verified drivers can accept rides' },
      });
    }

    // Check ride is still available
    const { data: currentRide } = await supabase
      .from('rides')
      .select('status')
      .eq('id', rideId)
      .single();

    if (!currentRide || currentRide.status !== 'requested') {
      return res.status(400).json({
        success: false,
        error: { code: 'RIDE_UNAVAILABLE', message: 'Ride is no longer available' },
      });
    }

    const { data: ride, error } = await supabase
      .from('rides')
      .update({
        driver_id: userId,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        driver_eta_minutes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rideId)
      .eq('status', 'requested')
      .select()
      .single();

    if (error) throw error;

    await logAudit('UPDATE', 'rides', rideId, userId, {
      action: 'ride_accepted',
      driver_id: userId,
    });

    res.json({ success: true, data: ride, message: 'Ride accepted successfully' });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * @swagger
 * /api/rides/{rideId}/rate:
 *   post:
 *     summary: Rate a completed ride
 *     tags: [Rides]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               review_comment: { type: string }
 *     responses:
 *       200:
 *         description: Rating submitted
 */
router.post('/:rideId/rate', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { rideId } = req.params;
    const { rating, review_comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Rating must be 1-5' },
      });
    }

    const { data: ride, error: fetchError } = await supabase
      .from('rides')
      .select('passenger_id, driver_id, status')
      .eq('id', rideId)
      .single();

    if (fetchError || !ride) {
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Ride not found' } });
    }

    if (ride.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: 'Can only rate completed rides' },
      });
    }

    if (ride.passenger_id !== userId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only passengers can rate rides' },
      });
    }

    const { data: updatedRide, error } = await supabase
      .from('rides')
      .update({ rating, review_comment, updated_at: new Date().toISOString() })
      .eq('id', rideId)
      .select()
      .single();

    if (error) throw error;

    // Update driver's average rating
    if (ride.driver_id) {
      const { data: driverRides } = await supabase
        .from('rides')
        .select('rating')
        .eq('driver_id', ride.driver_id)
        .not('rating', 'is', null);

      if (driverRides && driverRides.length > 0) {
        const avgRating = driverRides.reduce((sum, r) => sum + r.rating, 0) / driverRides.length;
        await supabase
          .from('driver_profiles')
          .update({ rating: Math.round(avgRating * 10) / 10 })
          .eq('user_id', ride.driver_id);
      }
    }

    await logAudit('UPDATE', 'rides', rideId, userId, { action: 'ride_rated', rating });

    res.json({ success: true, data: updatedRide, message: 'Rating submitted' });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * @swagger
 * /api/rides/history:
 *   get:
 *     summary: Get user's ride history
 *     tags: [Rides]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [passenger, driver] }
 *         description: Filter by role (default based on user type)
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Ride history
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { role, status, limit = 20, offset = 0 } = req.query;

    let query = supabase
      .from('rides')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (role === 'driver') {
      query = query.eq('driver_id', userId);
    } else {
      query = query.eq('passenger_id', userId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: rides, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: rides,
      pagination: { total: count, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
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
