import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Authentication required');
    }

    const params = await req.json();

    // Map fields if using alternative naming
    if (!params.checkInDate && params.checkIn) params.checkInDate = params.checkIn;
    if (!params.checkOutDate && params.checkOut) params.checkOutDate = params.checkOut;
    if (!params.numberOfRooms && params.rooms)
      params.numberOfRooms = Number(params.rooms);
    if (!params.guestCount && params.guests) params.guestCount = Number(params.guests);

    console.log('🏨 Creating hotel booking for:', params.hotelId);

    // ===== VALIDATION =====

    // Validate required fields
    if (!params.hotelId) throw new Error('Hotel ID is required');
    if (!params.roomTypeId) throw new Error('Room type ID is required');
    if (!params.checkInDate) throw new Error('Check-in date is required');
    if (!params.checkOutDate) throw new Error('Check-out date is required');
    if (!params.numberOfRooms || params.numberOfRooms < 1)
      throw new Error('Number of rooms must be at least 1');
    if (!params.guestCount || params.guestCount < 1)
      throw new Error('Guest count must be at least 1');

    // Validate guest information (set defaults if empty)
    params.guestName =
      params.guestName?.trim() || user.user_metadata?.full_name || 'Guest';
    params.guestEmail = params.guestEmail?.trim() || user.email || '';
    params.guestPhone = params.guestPhone?.trim() || user.user_metadata?.phone || '';

    if (!params.guestEmail) {
      throw new Error('Guest email is required');
    }

    // Validate payment method (default to card if not provided)
    params.paymentMethod = params.paymentMethod || 'card';
    const validPaymentMethods = ['wallet', 'card', 'bank_transfer'];
    if (!validPaymentMethods.includes(params.paymentMethod)) {
      throw new Error(
        `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`
      );
    }

    // Validate dates
    const checkIn = new Date(params.checkInDate);
    const checkOut = new Date(params.checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(checkIn.getTime())) {
      throw new Error('Invalid check-in date');
    }
    if (isNaN(checkOut.getTime())) {
      throw new Error('Invalid check-out date');
    }

    // Allow same-day bookings
    if (checkIn < today) {
      throw new Error('Check-in date cannot be in the past');
    }
    if (checkOut <= checkIn) {
      throw new Error('Check-out date must be after check-in date');
    }

    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (nights > 365) {
      throw new Error('Booking cannot exceed 365 nights');
    }

    // ===== GET ROOM TYPE =====
    const { data: roomType, error: roomError } = await supabaseClient
      .from('room_types')
      .select(
        `
        *,
        hotel:hotels(
          id,
          name,
          host_id
        )
      `
      )
      .eq('id', params.roomTypeId)
      .single();

    if (roomError || !roomType) {
      throw new Error('Room type not found');
    }

    if (roomType.hotel.id !== params.hotelId) {
      throw new Error('Room type does not belong to specified hotel');
    }

    // ===== CHECK AVAILABILITY =====
    const { data: availability } = await supabaseClient
      .from('room_availability')
      .select('available_rooms')
      .eq('room_type_id', params.roomTypeId)
      .gte('date', params.checkInDate)
      .lt('date', params.checkOutDate)
      .order('available_rooms', { ascending: true });

    if (availability && availability.length > 0) {
      const minAvailable = Math.min(...availability.map(a => a.available_rooms));
      if (minAvailable < params.numberOfRooms) {
        throw new Error(`Only ${minAvailable} room(s) available for selected dates`);
      }
    }

    // ===== CALCULATE PRICING =====
    const roomRate = roomType.base_price;
    const subtotal = roomRate * nights * params.numberOfRooms;
    const taxRate = 0.075; // 7.5% VAT
    const taxAmount = subtotal * taxRate;
    const serviceFee = subtotal * 0.02; // 2% service fee
    const discountAmount = 0;

    // Apply promo code if provided
    if (params.promoCode) {
      // TODO: Implement promo code validation
      console.log(
        'Promo code provided but validation not implemented:',
        params.promoCode
      );
    }

    const totalAmount = subtotal + taxAmount + serviceFee - discountAmount;

    // ===== CREATE BOOKING =====
    const bookingNumber = `BK${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const { data: booking, error: bookingError } = await supabaseClient
      .from('hotel_bookings')
      .insert({
        booking_number: bookingNumber,
        hotel_id: params.hotelId,
        room_type_id: params.roomTypeId,
        user_id: user.id,
        guest_name: params.guestName,
        guest_email: params.guestEmail,
        guest_phone: params.guestPhone,
        guest_count: params.guestCount,
        check_in_date: params.checkInDate,
        check_out_date: params.checkOutDate,
        number_of_nights: nights,
        number_of_rooms: params.numberOfRooms,
        room_rate: roomRate,
        subtotal,
        tax_amount: taxAmount,
        service_fee: serviceFee,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        payment_status: 'pending',
        booking_status: 'pending',
        special_requests: params.specialRequests || null,
        purpose_of_visit: params.purposeOfVisit || null,
        estimated_arrival_time: params.estimatedArrivalTime || null,
        promo_code: params.promoCode || null,
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Booking creation error:', bookingError);
      throw new Error(`Failed to create booking: ${bookingError.message}`);
    }

    console.log('✅ Booking created:', booking.id);

    // ===== INITIALIZE PAYMENT =====
    let paymentResponse;

    if (params.paymentMethod === 'wallet') {
      // Pay with wallet
      const { data: walletPayment, error: walletError } = await supabaseClient.rpc(
        'pay_with_wallet_atomic',
        {
          p_user_id: user.id,
          p_module_type: 'hotel_booking',
          p_reference_id: booking.id,
          p_amount: totalAmount,
          p_metadata: {
            deposit_only: true,
            booking_number: bookingNumber,
          },
        }
      );

      if (walletError) {
        // Rollback booking
        await supabaseClient.from('hotel_bookings').delete().eq('id', booking.id);
        throw new Error(`Wallet payment failed: ${walletError.message}`);
      }

      paymentResponse = {
        success: true,
        payment_method: 'wallet',
        payment_completed: true,
        amount_to_pay: totalAmount,
        new_balance: walletPayment.new_balance,
      };
    } else {
      // Initialize card/bank payment
      const paymentProvider = params.paymentProvider || 'mock';
      const depositAmount = totalAmount * 0.3; // 30% deposit

      const initPaymentResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/initialize-payment`,
        {
          method: 'POST',
          headers: {
            Authorization: req.headers.get('Authorization') || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            moduleType: 'hotel_booking',
            referenceId: booking.id,
            amount: depositAmount,
            paymentProvider,
            paymentMethod: params.paymentMethod,
            userEmail: params.guestEmail,
            depositOnly: true,
            metadata: {
              hotel_name: roomType.hotel.name,
              room_type: roomType.name,
              nights,
              booking_number: bookingNumber,
              total_amount: totalAmount,
              deposit_amount: depositAmount,
            },
          }),
        }
      );

      if (!initPaymentResponse.ok) {
        const errorText = await initPaymentResponse.text();
        console.error('Payment initialization failed:', errorText);
        // Rollback booking
        await supabaseClient.from('hotel_bookings').delete().eq('id', booking.id);
        throw new Error(`Payment initialization failed: ${errorText}`);
      }

      const paymentData = await initPaymentResponse.json();

      if (!paymentData.success) {
        // Rollback booking
        await supabaseClient.from('hotel_bookings').delete().eq('id', booking.id);
        throw new Error(
          `Payment initialization failed: ${paymentData.error || 'Unknown error'}`
        );
      }

      paymentResponse = {
        ...paymentData.data,
        amount_to_pay: depositAmount,
      };
    }

    console.log('💳 Payment initialized');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Booking created successfully',
        data: {
          booking: {
            id: booking.id,
            booking_number: bookingNumber,
            hotel_name: roomType.hotel.name,
            room_type: roomType.name,
            check_in: params.checkInDate,
            check_out: params.checkOutDate,
            nights,
            rooms: params.numberOfRooms,
            guests: params.guestCount,
            subtotal,
            tax_amount: taxAmount,
            service_fee: serviceFee,
            total_amount: totalAmount,
            deposit_amount: paymentResponse.amount_to_pay,
            status: 'pending',
          },
          payment: paymentResponse,
          next_step: paymentResponse.payment_completed
            ? 'Booking confirmed! Check your email for details.'
            : 'Complete payment to confirm your booking',
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
    console.error('❌ Booking creation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred',
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
