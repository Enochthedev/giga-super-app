import { createClient } from '@supabase/supabase-js';
import { Request, Response, Router } from 'express';

import { authMiddleware } from '../middleware/auth';
import { getDistanceAndDuration } from '../services/googleMaps';
import { NotificationService } from '../services/notificationService';

// Extend Request type to include notificationService
interface RequestWithNotification extends Request {
  notificationService?: NotificationService;
}

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

// Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// STATIC ROUTES (must come before parameterized routes)

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

    // Use Google Maps API for accurate distance and duration
    const { distance_km, duration_minutes, using_fallback } = await getDistanceAndDuration(
      { lat: pickup_lat, lng: pickup_lng },
      { lat: dropoff_lat, lng: dropoff_lng }
    );

    const pricing: Record<string, { base: number; perKm: number; perMin: number }> = {
      standard: { base: 500, perKm: 100, perMin: 20 },
      premium: { base: 800, perKm: 150, perMin: 30 },
      suv: { base: 1000, perKm: 180, perMin: 35 },
    };
    const rates = pricing[vehicle_type] || pricing.standard;
    res.json({
      success: true,
      data: {
        distance_km: Math.round(distance_km * 10) / 10,
        duration_minutes,
        base_fare: rates.base,
        distance_fare: Math.round(distance_km * rates.perKm),
        time_fare: Math.round(duration_minutes * rates.perMin),
        estimated_total:
          rates.base +
          Math.round(distance_km * rates.perKm) +
          Math.round(duration_minutes * rates.perMin),
        currency: 'NGN',
        vehicle_type,
        using_google_maps: !using_fallback,
      },
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

router.get('/active', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const { data: ride, error } = await supabase
      .from('rides')
      .select('*')
      .or(`passenger_id.eq.${userId},driver_id.eq.${userId}`)
      .in('status', ['requested', 'pending', 'accepted', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!ride) return res.json({ success: true, data: {}, message: 'No active ride found' });

    let driverProfile = null;
    if (ride.driver_id) {
      const { data: driver } = await supabase
        .from('driver_profiles')
        .select(
          'user_id, vehicle_info, rating, total_rides, vehicle_type, current_location, heading, user:user_profiles(first_name, last_name, avatar_url, phone)'
        )
        .eq('user_id', ride.driver_id)
        .single();
      driverProfile = driver;
    }

    let passengerProfile = null;
    if (ride.passenger_id) {
      const { data: passenger } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, avatar_url, phone')
        .eq('id', ride.passenger_id)
        .single();
      passengerProfile = passenger;
    }

    res.json({ success: true, data: { ride, driver: driverProfile, passenger: passengerProfile } });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

router.get('/requests', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const { data: driver } = await supabase
      .from('driver_profiles')
      .select('id, is_verified')
      .eq('user_id', userId)
      .single();
    if (!driver || !driver.is_verified)
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only verified drivers can view ride requests' },
      });

    // Get ride IDs this driver has already rejected
    const { data: rejections } = await supabase
      .from('ride_rejections')
      .select('ride_id')
      .eq('driver_id', userId);
    const rejectedRideIds = (rejections || []).map(r => r.ride_id);

    const limit = parseInt(req.query.limit as string) || 20;
    let query = supabase
      .from('rides')
      .select('*')
      .in('status', ['requested', 'pending'])
      .is('driver_id', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter out rejected rides if any exist
    if (rejectedRideIds.length > 0) {
      query = query.not('id', 'in', `(${rejectedRideIds.join(',')})`);
    }

    const { data: rides, error } = await query;
    if (error) throw error;

    const enrichedRides = await Promise.all(
      (rides || []).map(async ride => {
        const { data: passenger } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, avatar_url')
          .eq('id', ride.passenger_id)
          .single();
        return { ...ride, passenger };
      })
    );

    res.json({ success: true, data: enrichedRides, count: enrichedRides.length });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const { role, status, limit = 20, offset = 0 } = req.query;
    let query = supabase
      .from('rides')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);
    query = role === 'driver' ? query.eq('driver_id', userId) : query.eq('passenger_id', userId);
    if (status) query = query.eq('status', status);

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

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const reqWithNotification = req as RequestWithNotification;

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

    // Use Google Maps API for accurate distance and duration
    const { distance_km, duration_minutes } = await getDistanceAndDuration(
      { lat: pickup_lat, lng: pickup_lng },
      { lat: dropoff_lat, lng: dropoff_lng }
    );

    // Calculate fare components
    const BASE_FARE = 500;
    const COST_PER_KM = 100;
    const COST_PER_MINUTE = 20;

    const distance_fare = Math.round(distance_km * COST_PER_KM);
    const time_fare = Math.round(duration_minutes * COST_PER_MINUTE);
    const total_fare = BASE_FARE + distance_fare + time_fare;

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
      base_fare: BASE_FARE,
      distance_fare,
      time_fare,
      total_fare,
      final_amount: total_fare,
      final_fare: total_fare,
      status: 'requested',
      passenger_notes,
    };
    if (driver_id) rideData.driver_id = driver_id;
    if (scheduled_time) rideData.scheduled_time = scheduled_time;

    const { data: ride, error } = await supabase.from('rides').insert(rideData).select().single();
    if (error) throw error;

    await logAudit('INSERT', 'rides', ride.id, userId, { action: 'ride_requested', ride_number });

    // Get passenger info for notification
    const { data: passengerProfile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, avatar_url, rating')
      .eq('id', userId)
      .single();

    // Notify drivers of new ride via Socket.IO
    if (reqWithNotification.notificationService) {
      reqWithNotification.notificationService.notifyDriversOfNewRide(ride, passengerProfile);
    }

    res.status(201).json({ success: true, data: ride });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// PARAMETERIZED ROUTES (must come after static routes)

router.get('/:rideId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { rideId } = req.params;

    const { data: ride, error } = await supabase
      .from('rides')
      .select(
        '*, driver:driver_profiles(id, user_id, vehicle_info, rating, total_rides, vehicle_type, user:user_profiles(first_name, last_name, avatar_url, phone))'
      )
      .eq('id', rideId)
      .single();

    if (error || !ride)
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Ride not found' } });
    if (ride.passenger_id !== userId && ride.driver_id !== userId)
      return res
        .status(403)
        .json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });

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

router.put('/:rideId/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

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
    if (!validStatuses.includes(status))
      return res
        .status(400)
        .json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid status' } });

    const { data: currentRide, error: fetchError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .single();
    if (fetchError || !currentRide)
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Ride not found' } });
    if (currentRide.passenger_id !== userId && currentRide.driver_id !== userId)
      return res
        .status(403)
        .json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });

    const updateData: any = { status, updated_at: new Date().toISOString() };
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

router.post('/:rideId/accept', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const reqWithNotification = req as RequestWithNotification;

    const { rideId } = req.params;

    const { data: driver } = await supabase
      .from('driver_profiles')
      .select('id, is_verified, current_location')
      .eq('user_id', userId)
      .single();
    if (!driver || !driver.is_verified)
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only verified drivers can accept rides' },
      });

    const { data: currentRide } = await supabase
      .from('rides')
      .select('status, pickup_location')
      .eq('id', rideId)
      .single();
    if (!currentRide || currentRide.status !== 'requested')
      return res.status(400).json({
        success: false,
        error: { code: 'RIDE_UNAVAILABLE', message: 'Ride is no longer available' },
      });

    // Calculate ETA server-side from driver's current location to pickup
    let driver_eta_minutes: number | null = null;
    const driverLat = driver.current_location?.latitude;
    const driverLng = driver.current_location?.longitude;
    const pickupLat = currentRide.pickup_location?.latitude;
    const pickupLng = currentRide.pickup_location?.longitude;

    if (driverLat && driverLng && pickupLat && pickupLng) {
      try {
        const { duration_minutes } = await getDistanceAndDuration(
          { lat: driverLat, lng: driverLng },
          { lat: pickupLat, lng: pickupLng }
        );
        driver_eta_minutes = duration_minutes;
      } catch {
        // Fallback: use Haversine distance with 30 km/h average
        const distance = calculateDistance(driverLat, driverLng, pickupLat, pickupLng);
        driver_eta_minutes = Math.ceil((distance / 30) * 60);
      }
    }

    // Allow client override if provided (optional)
    if (req.body.driver_eta_minutes && typeof req.body.driver_eta_minutes === 'number') {
      driver_eta_minutes = req.body.driver_eta_minutes;
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
      driver_eta_minutes,
    });

    // Get driver info for notification
    const { data: driverProfile } = await supabase
      .from('driver_profiles')
      .select(
        'user_id, vehicle_info, rating, total_rides, user:user_profiles(first_name, last_name, avatar_url, phone)'
      )
      .eq('user_id', userId)
      .single();

    // Notify passenger that driver accepted
    if (reqWithNotification.notificationService && driverProfile) {
      reqWithNotification.notificationService.notifyPassengerRideAccepted(
        ride.passenger_id,
        ride,
        driverProfile
      );
      // Notify other drivers that ride is no longer available
      reqWithNotification.notificationService.notifyRideUnavailable(rideId, userId);
    }

    res.json({ success: true, data: ride, message: 'Ride accepted successfully' });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

router.post('/:rideId/start', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const { rideId } = req.params;
    const { data: ride, error: fetchError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .single();

    if (fetchError || !ride)
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Ride not found' } });
    if (ride.driver_id !== userId)
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only the assigned driver can start this ride' },
      });
    if (ride.status !== 'accepted')
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Cannot start ride with status: ${ride.status}`,
        },
      });

    const { data: updatedRide, error } = await supabase
      .from('rides')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
        pickup_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', rideId)
      .select()
      .single();

    if (error) throw error;
    await logAudit('UPDATE', 'rides', rideId, userId, { action: 'ride_started' });
    await supabase.from('notifications').insert({
      user_id: ride.passenger_id,
      type: 'ride_started',
      title: 'Ride Started',
      message: 'Your ride has started. Enjoy your trip!',
      data: { ride_id: rideId },
    });

    res.json({ success: true, data: updatedRide, message: 'Ride started successfully' });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

router.post('/:rideId/complete', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const { rideId } = req.params;
    const { dropoff_lat, dropoff_lng, actual_distance_km } = req.body;

    // Get pricing settings
    const { data: pricingSettings } = await supabase
      .from('platform_settings')
      .select('key, value')
      .in('category', ['taxi_pricing', 'taxi_commission']);
    const settings: Record<string, number> = {};
    pricingSettings?.forEach((s: any) => {
      settings[s.key] = parseFloat(s.value);
    });

    const BASE_FARE = settings.base_fare || 500;
    const COST_PER_KM = settings.cost_per_km || 100;
    const COST_PER_MINUTE = settings.cost_per_minute || 20;
    const MIN_FARE = settings.min_fare || 300;
    const DRIVER_COMMISSION = settings.driver_commission_rate || 0.8;

    const { data: ride, error: fetchError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .single();
    if (fetchError || !ride)
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Ride not found' } });
    if (ride.driver_id !== userId)
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only the assigned driver can complete this ride' },
      });
    if (ride.status !== 'in_progress')
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: 'Ride is not in progress' },
      });

    const endTime = new Date();
    const startTime = new Date(ride.started_at);
    const durationMinutes = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    const distanceKm = actual_distance_km || ride.distance_km || ride.estimated_distance_km || 5;

    let finalFare = BASE_FARE + distanceKm * COST_PER_KM + durationMinutes * COST_PER_MINUTE;
    finalFare = Math.max(finalFare, MIN_FARE);
    finalFare = Math.round(finalFare / 50) * 50;

    const driverEarning = finalFare * DRIVER_COMMISSION;
    const platformFee = finalFare - driverEarning;

    const updateData: any = {
      status: 'completed',
      completed_at: endTime.toISOString(),
      dropoff_time: endTime.toISOString(),
      actual_duration_minutes: durationMinutes,
      actual_distance_km: distanceKm,
      final_fare: finalFare,
      final_amount: finalFare,
      updated_at: endTime.toISOString(),
    };
    if (dropoff_lat && dropoff_lng)
      updateData.actual_dropoff_location = { latitude: dropoff_lat, longitude: dropoff_lng };

    const { data: updatedRide, error } = await supabase
      .from('rides')
      .update(updateData)
      .eq('id', rideId)
      .select()
      .single();
    if (error) throw error;

    await supabase.from('driver_earnings').insert({
      driver_id: userId,
      ride_id: rideId,
      amount: finalFare,
      commission: platformFee,
      net_earning: driverEarning,
      payout_status: 'pending',
    });
    await logAudit('UPDATE', 'rides', rideId, userId, {
      action: 'ride_completed',
      final_fare: finalFare,
      duration_minutes: durationMinutes,
    });
    await supabase.from('notifications').insert({
      user_id: ride.passenger_id,
      type: 'ride_completed',
      title: 'Ride Completed',
      message: `Your ride is complete. Total fare: ₦${finalFare}`,
      data: { ride_id: rideId, fare: finalFare, distance: distanceKm, duration: durationMinutes },
    });

    res.json({
      success: true,
      data: updatedRide,
      fare_details: {
        total: finalFare,
        distance_km: distanceKm,
        duration_minutes: durationMinutes,
        base_fare: BASE_FARE,
        driver_earning: driverEarning,
        platform_fee: platformFee,
      },
      message: 'Ride completed successfully',
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

router.post('/:rideId/cancel', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const reqWithNotification = req as RequestWithNotification;

    const { rideId } = req.params;
    const { reason } = req.body;

    const { data: cancellationSettings } = await supabase
      .from('platform_settings')
      .select('key, value')
      .eq('category', 'taxi_pricing')
      .in('key', ['cancellation_fee', 'cancellation_grace_period_minutes']);
    const settings: Record<string, number> = {};
    cancellationSettings?.forEach((s: any) => {
      settings[s.key] = parseFloat(s.value);
    });

    const CANCELLATION_FEE = settings.cancellation_fee || 200;
    const GRACE_PERIOD_MINUTES = settings.cancellation_grace_period_minutes || 5;

    const { data: ride, error: fetchError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .single();
    if (fetchError || !ride)
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Ride not found' } });

    const isPassenger = ride.passenger_id === userId;
    const isDriver = ride.driver_id === userId;
    if (!isPassenger && !isDriver)
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not authorized to cancel this ride' },
      });
    if (['completed', 'cancelled'].includes(ride.status))
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: `Ride is already ${ride.status}` },
      });

    let fee = 0;
    let notificationType = '';
    let messageToOther = '';

    if (isPassenger) {
      notificationType = 'ride_cancelled_by_rider';
      messageToOther = 'Passenger has cancelled the trip.';
      if ((ride.status === 'accepted' || ride.status === 'in_progress') && ride.accepted_at) {
        const minutesSinceAccept =
          (Date.now() - new Date(ride.accepted_at).getTime()) / (1000 * 60);
        if (minutesSinceAccept > GRACE_PERIOD_MINUTES) fee = CANCELLATION_FEE;
      }
    } else {
      notificationType = 'ride_cancelled_by_driver';
      messageToOther = 'Driver has cancelled the trip. Please request another ride.';
    }

    const { data: updatedRide, error } = await supabase
      .from('rides')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
        cancellation_reason: reason,
        cancellation_fee: fee,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rideId)
      .select()
      .single();

    if (error) throw error;
    await logAudit('UPDATE', 'rides', rideId, userId, {
      action: 'ride_cancelled',
      cancelled_by: isPassenger ? 'passenger' : 'driver',
      reason,
      fee,
    });

    const otherUserId = isPassenger ? ride.driver_id : ride.passenger_id;
    if (otherUserId) {
      await supabase.from('notifications').insert({
        user_id: otherUserId,
        type: notificationType,
        title: 'Ride Cancelled',
        message: messageToOther,
        data: { ride_id: rideId, reason, fee_charged: fee > 0 },
      });

      // Send real-time notification via Socket.IO
      if (reqWithNotification.notificationService) {
        const recipientType = isPassenger ? 'driver' : 'passenger';
        const cancelledBy = isPassenger ? 'passenger' : 'driver';
        reqWithNotification.notificationService.notifyRideCancelled(
          updatedRide,
          otherUserId,
          recipientType,
          cancelledBy,
          reason
        );
      }
    }

    res.json({
      success: true,
      data: updatedRide,
      fee_charged: fee,
      message: 'Ride cancelled successfully',
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

router.post('/:rideId/reject', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const { rideId } = req.params;
    const { reason } = req.body;

    const { data: driver } = await supabase
      .from('driver_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    if (!driver)
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only drivers can reject rides' },
      });

    // Persist the rejection so this ride won't appear in the driver's poll again
    const { error: rejectionError } = await supabase
      .from('ride_rejections')
      .upsert({ ride_id: rideId, driver_id: userId, reason }, { onConflict: 'ride_id,driver_id' });

    if (rejectionError) {
      console.error('Failed to save ride rejection:', rejectionError);
    }

    await logAudit('UPDATE', 'rides', rideId, userId, { action: 'ride_rejected', reason });
    res.json({ success: true, message: 'Ride rejected' });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

router.post('/:rideId/rate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const { rideId } = req.params;
    const { rating, review_comment } = req.body;

    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Rating must be 1-5' },
      });

    const { data: ride, error: fetchError } = await supabase
      .from('rides')
      .select('passenger_id, driver_id, status')
      .eq('id', rideId)
      .single();
    if (fetchError || !ride)
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Ride not found' } });
    if (ride.status !== 'completed')
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: 'Can only rate completed rides' },
      });
    if (ride.passenger_id !== userId)
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only passengers can rate rides' },
      });

    const { data: updatedRide, error } = await supabase
      .from('rides')
      .update({ rating, review_comment, updated_at: new Date().toISOString() })
      .eq('id', rideId)
      .select()
      .single();
    if (error) throw error;

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

export default router;
