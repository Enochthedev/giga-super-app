/**
 * Bookings routes for Hotels Service
 * Handles booking CRUD operations
 */

import { Router } from 'express';

import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { databaseService } from '../utils/database.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/v1/bookings
 * Get user's bookings with filtering and pagination
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const status = (req.query.status as string) || 'all';
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    let query = databaseService.supabase
      .from('hotel_bookings')
      .select(
        `
        *,
        hotel:hotels!inner(id, name, slug, city, state, country, address, featured_image, star_rating, phone, email),
        room_type:room_types!inner(id, name, images, amenities, breakfast_included),
        payment:hotel_booking_payments(id, amount, payment_status, payment_method, paid_at)
      `,
        { count: 'exact' }
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const today = new Date().toISOString().split('T')[0]!;
    switch (status) {
      case 'upcoming':
        query = query.gte('check_in_date', today).in('booking_status', ['pending', 'confirmed']);
        break;
      case 'past':
        query = query.lt('check_out_date', today).in('booking_status', ['checked_out']);
        break;
      case 'cancelled':
        query = query.in('booking_status', ['cancelled', 'no_show']);
        break;
    }

    query = query.range(offset, offset + limit - 1);
    const { data: bookings, error, count } = await query;
    if (error) throw error;

    const categorized = {
      upcoming: [] as any[],
      ongoing: [] as any[],
      past: [] as any[],
      cancelled: [] as any[],
    };
    const now = new Date();

    bookings?.forEach(booking => {
      const checkIn = new Date(booking.check_in_date);
      const checkOut = new Date(booking.check_out_date);

      const enhanced = {
        ...booking,
        is_upcoming: checkIn > now && ['pending', 'confirmed'].includes(booking.booking_status),
        is_ongoing: today >= booking.check_in_date && today < booking.check_out_date,
        is_past: checkOut < now,
        is_cancelled: ['cancelled', 'no_show'].includes(booking.booking_status),
        days_until_checkin: Math.ceil((checkIn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        can_cancel: booking.booking_status === 'confirmed' && checkIn > now,
        can_review: booking.booking_status === 'checked_out' && !booking.has_review,
        payment_summary: {
          total_paid:
            booking.payment?.reduce(
              (sum: number, p: any) =>
                p.payment_status === 'completed' ? sum + parseFloat(p.amount) : sum,
              0
            ) || 0,
          payment_complete: booking.payment_status === 'paid',
          payment_method: booking.payment?.[0]?.payment_method || null,
        },
      };

      if (enhanced.is_cancelled) categorized.cancelled.push(enhanced);
      else if (enhanced.is_ongoing) categorized.ongoing.push(enhanced);
      else if (enhanced.is_upcoming) categorized.upcoming.push(enhanced);
      else if (enhanced.is_past) categorized.past.push(enhanced);
    });

    res.json({
      success: true,
      data: {
        bookings: bookings || [],
        categorized,
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit),
        },
        summary: {
          total: count || 0,
          upcoming: categorized.upcoming.length,
          ongoing: categorized.ongoing.length,
          past: categorized.past.length,
          cancelled: categorized.cancelled.length,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/v1/bookings/:id
 * Get booking details by ID
 */
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const bookingId = req.params.id;

    const { data: booking, error } = await databaseService.supabase
      .from('hotel_bookings')
      .select(
        `
        *,
        hotel:hotels!inner(id, name, slug, city, state, country, address, featured_image, star_rating, phone, email, description),
        room_type:room_types!inner(id, name, description, images, amenities, breakfast_included, base_price),
        payment:hotel_booking_payments(id, amount, payment_status, payment_method, paid_at, transaction_reference)
      `
      )
      .eq('id', bookingId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ success: false, error: 'Booking not found' });
        return;
      }
      throw error;
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/v1/bookings/create
 * Create a new booking
 */
router.post('/create', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email;
    const {
      hotelId,
      hotel_id,
      roomTypeId,
      room_type_id,
      checkInDate,
      check_in_date,
      checkIn,
      check_in,
      checkOutDate,
      check_out_date,
      checkOut,
      check_out,
      numberOfRooms,
      number_of_rooms,
      rooms,
      guestCount,
      guest_count,
      guests,
      guestName,
      guest_name,
      guestEmail,
      guest_email,
      guestPhone,
      guest_phone,
      specialRequests,
      special_requests,
      paymentMethod,
      payment_method,
    } = req.body;

    // Normalize field names
    const hotelIdVal = hotelId || hotel_id;
    const roomTypeIdVal = roomTypeId || room_type_id;
    const checkInVal = checkInDate || check_in_date || checkIn || check_in;
    const checkOutVal = checkOutDate || check_out_date || checkOut || check_out;
    const roomsVal = parseInt(numberOfRooms || number_of_rooms || rooms || '1');
    const guestsVal = parseInt(guestCount || guest_count || guests || '1');
    const guestNameVal = guestName || guest_name || req.user!.email;
    const guestEmailVal = guestEmail || guest_email || userEmail;
    const guestPhoneVal = guestPhone || guest_phone || '';
    const specialRequestsVal = specialRequests || special_requests || null;
    const paymentMethodVal = paymentMethod || payment_method || 'card';

    // Validation
    if (!hotelIdVal) {
      res.status(400).json({ success: false, error: 'Hotel ID is required' });
      return;
    }
    if (!roomTypeIdVal) {
      res.status(400).json({ success: false, error: 'Room type ID is required' });
      return;
    }
    if (!checkInVal) {
      res.status(400).json({ success: false, error: 'Check-in date is required' });
      return;
    }
    if (!checkOutVal) {
      res.status(400).json({ success: false, error: 'Check-out date is required' });
      return;
    }

    const checkIn_d = new Date(checkInVal);
    const checkOut_d = new Date(checkOutVal);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn_d < today) {
      res.status(400).json({ success: false, error: 'Check-in date cannot be in the past' });
      return;
    }
    if (checkOut_d <= checkIn_d) {
      res.status(400).json({ success: false, error: 'Check-out date must be after check-in date' });
      return;
    }

    const nights = Math.ceil((checkOut_d.getTime() - checkIn_d.getTime()) / (1000 * 60 * 60 * 24));

    // Get room type
    const { data: roomType, error: roomError } = await databaseService.supabase
      .from('room_types')
      .select('*, hotel:hotels(id, name, host_id)')
      .eq('id', roomTypeIdVal)
      .single();

    if (roomError || !roomType) {
      res.status(400).json({ success: false, error: 'Room type not found' });
      return;
    }
    if (roomType.hotel.id !== hotelIdVal) {
      res
        .status(400)
        .json({ success: false, error: 'Room type does not belong to specified hotel' });
      return;
    }

    // Check availability
    const { data: availability } = await databaseService.supabase
      .from('room_availability')
      .select('available_rooms')
      .eq('room_type_id', roomTypeIdVal)
      .gte('date', checkInVal)
      .lt('date', checkOutVal)
      .order('available_rooms', { ascending: true });

    if (availability && availability.length > 0) {
      const minAvailable = Math.min(...availability.map(a => a.available_rooms));
      if (minAvailable < roomsVal) {
        res
          .status(400)
          .json({
            success: false,
            error: `Only ${minAvailable} room(s) available for selected dates`,
          });
        return;
      }
    }

    // Calculate pricing
    const roomRate = roomType.base_price;
    const subtotal = roomRate * nights * roomsVal;
    const taxRate = 0.075;
    const taxAmount = subtotal * taxRate;
    const serviceFee = subtotal * 0.02;
    const totalAmount = subtotal + taxAmount + serviceFee;

    // Generate booking number
    const bookingNumber = `BK${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Create booking
    const { data: booking, error: bookingError } = await databaseService.supabase
      .from('hotel_bookings')
      .insert({
        booking_number: bookingNumber,
        hotel_id: hotelIdVal,
        room_type_id: roomTypeIdVal,
        user_id: userId,
        guest_name: guestNameVal,
        guest_email: guestEmailVal,
        guest_phone: guestPhoneVal,
        guest_count: guestsVal,
        check_in_date: checkInVal,
        check_out_date: checkOutVal,
        number_of_nights: nights,
        number_of_rooms: roomsVal,
        room_rate: roomRate,
        subtotal,
        tax_amount: taxAmount,
        service_fee: serviceFee,
        total_amount: totalAmount,
        payment_status: 'pending',
        booking_status: 'pending',
        special_requests: specialRequestsVal,
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    res.json({
      success: true,
      message: 'Booking created successfully',
      data: {
        booking: {
          id: booking.id,
          booking_number: bookingNumber,
          hotel_name: roomType.hotel.name,
          room_type: roomType.name,
          check_in: checkInVal,
          check_out: checkOutVal,
          nights,
          rooms: roomsVal,
          guests: guestsVal,
          subtotal,
          tax_amount: taxAmount,
          service_fee: serviceFee,
          total_amount: totalAmount,
          status: 'pending',
        },
        next_step: 'Complete payment to confirm your booking',
      },
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/v1/bookings/:id/cancel
 * Cancel a booking
 */
router.post('/:id/cancel', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const bookingId = req.params.id;
    const { cancellationReason, cancellation_reason } = req.body;
    const reason = cancellationReason || cancellation_reason || 'User requested cancellation';

    // Get booking
    const { data: booking, error: bookingError } = await databaseService.supabase
      .from('hotel_bookings')
      .select('*, hotel:hotels(name, cancellation_policy)')
      .eq('id', bookingId)
      .eq('user_id', userId)
      .single();

    if (bookingError || !booking) {
      res.status(404).json({ success: false, error: 'Booking not found' });
      return;
    }

    if (['cancelled', 'completed', 'checked_out'].includes(booking.booking_status)) {
      res
        .status(400)
        .json({
          success: false,
          error: `Cannot cancel booking with status: ${booking.booking_status}`,
        });
      return;
    }

    // Calculate refund
    const checkInDate = new Date(booking.check_in_date);
    const now = new Date();
    const hoursUntilCheckIn = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    let refundPercentage = 0;
    if (hoursUntilCheckIn >= 48) refundPercentage = 100;
    else if (hoursUntilCheckIn >= 24) refundPercentage = 50;

    const refundAmount = (booking.total_amount * refundPercentage) / 100;

    // Update booking
    const { error: updateError } = await databaseService.supabase
      .from('hotel_bookings')
      .update({
        booking_status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        refund_amount: refundAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    res.json({
      success: true,
      data: {
        bookingId,
        status: 'cancelled',
        refundAmount,
        refundPercentage,
        message:
          refundAmount > 0
            ? `Booking cancelled. Refund of ${refundAmount.toFixed(2)} (${refundPercentage}%) will be processed.`
            : 'Booking cancelled. No refund available due to cancellation policy.',
      },
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/v1/bookings/price
 * Calculate booking price
 */
router.post('/price', async (req: AuthenticatedRequest, res) => {
  try {
    const {
      hotelId,
      hotel_id,
      roomTypeId,
      room_type_id,
      checkInDate,
      check_in_date,
      checkIn,
      check_in,
      checkOutDate,
      check_out_date,
      checkOut,
      check_out,
      numberOfRooms,
      number_of_rooms,
      rooms,
      promoCode,
      promo_code,
    } = req.body;

    const hotelIdVal = hotelId || hotel_id;
    const roomTypeIdVal = roomTypeId || room_type_id;
    const checkInVal = checkInDate || check_in_date || checkIn || check_in;
    const checkOutVal = checkOutDate || check_out_date || checkOut || check_out;
    const roomsVal = parseInt(numberOfRooms || number_of_rooms || rooms || '1');
    const promoCodeVal = promoCode || promo_code;

    if (!hotelIdVal || !roomTypeIdVal || !checkInVal || !checkOutVal) {
      res
        .status(400)
        .json({
          success: false,
          error: 'hotelId, roomTypeId, checkInDate, and checkOutDate are required',
        });
      return;
    }

    const checkIn_d = new Date(checkInVal);
    const checkOut_d = new Date(checkOutVal);
    const nights = Math.ceil((checkOut_d.getTime() - checkIn_d.getTime()) / (1000 * 60 * 60 * 24));

    // Get room type
    const { data: roomType, error: roomError } = await databaseService.supabase
      .from('room_types')
      .select('*, hotel:hotels!inner(id, name, city, country)')
      .eq('id', roomTypeIdVal)
      .eq('hotel_id', hotelIdVal)
      .single();

    if (roomError || !roomType) {
      res.status(400).json({ success: false, error: 'Room type not found' });
      return;
    }

    // Calculate pricing
    const subtotal = parseFloat(roomType.base_price) * nights * roomsVal;
    const taxRate = 0.075;
    const taxAmount = Math.round(subtotal * taxRate);
    const serviceFee = Math.round(subtotal * 0.05);
    let discountAmount = 0;

    // TODO: Apply promo code if provided
    const totalAmount = subtotal + taxAmount + serviceFee - discountAmount;

    res.json({
      success: true,
      data: {
        hotel_id: hotelIdVal,
        hotel_name: roomType.hotel.name,
        room_type_id: roomTypeIdVal,
        room_type_name: roomType.name,
        check_in_date: checkInVal,
        check_out_date: checkOutVal,
        number_of_nights: nights,
        number_of_rooms: roomsVal,
        pricing: {
          average_per_night: Math.round(subtotal / (nights * roomsVal)),
          subtotal,
          tax_amount: taxAmount,
          tax_rate: taxRate,
          service_fee: serviceFee,
          discount_amount: discountAmount,
          total_amount: totalAmount,
        },
        breakfast_included: roomType.breakfast_included,
        refundable: roomType.refundable,
      },
    });
  } catch (error) {
    console.error('Calculate price error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

export { router as bookingsRouter };
