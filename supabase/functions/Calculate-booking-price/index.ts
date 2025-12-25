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
    const params = await req.json();
    // Validate required fields
    if (
      !params.hotelId ||
      !params.roomTypeId ||
      !params.checkInDate ||
      !params.checkOutDate
    ) {
      throw new Error('hotelId, roomTypeId, checkInDate, and checkOutDate are required');
    }
    const numberOfRooms = params.numberOfRooms || 1;
    // Calculate nights
    const checkIn = new Date(params.checkInDate);
    const checkOut = new Date(params.checkOutDate);
    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );
    // Get room type info
    const { data: roomType, error: roomError } = await supabaseClient
      .from('room_types')
      .select('*, hotel:hotels!inner(id, name, city, country)')
      .eq('id', params.roomTypeId)
      .eq('hotel_id', params.hotelId)
      .single();
    if (roomError) throw roomError;
    if (!roomType) throw new Error('Room type not found');
    // Calculate room pricing with dynamic/seasonal rates
    let subtotal = 0;
    const pricePerNight = [];
    const currentDate = new Date(checkIn);
    while (currentDate < checkOut) {
      const dateStr = currentDate.toISOString().split('T')[0];
      // Check for dynamic pricing on this date
      const { data: availability } = await supabaseClient
        .from('room_availability')
        .select('dynamic_price, base_price')
        .eq('room_type_id', params.roomTypeId)
        .eq('date', dateStr)
        .single();
      let nightPrice;
      if (availability?.dynamic_price) {
        nightPrice = parseFloat(availability.dynamic_price);
      } else if (availability?.base_price) {
        nightPrice = parseFloat(availability.base_price);
      } else {
        // Use weekend/base price from room type
        const dayOfWeek = currentDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        nightPrice =
          isWeekend && roomType.weekend_price
            ? parseFloat(roomType.weekend_price)
            : parseFloat(roomType.base_price);
      }
      pricePerNight.push({
        date: dateStr,
        price: nightPrice,
      });
      subtotal += nightPrice;
      currentDate.setDate(currentDate.getDate() + 1);
    }
    // Multiply by number of rooms
    subtotal = subtotal * numberOfRooms;
    // Calculate taxes (7.5% VAT in Nigeria, adjust as needed)
    const taxRate = 0.075;
    const taxAmount = Math.round(subtotal * taxRate);
    // Calculate service fee (could be percentage or flat fee)
    const serviceFeeRate = 0.05; // 5% service fee
    const serviceFee = Math.round(subtotal * serviceFeeRate);
    // Initialize discount
    let discountAmount = 0;
    let promoCodeInfo = null;
    // Apply promo code if provided
    if (params.promoCode) {
      const promoResult = await validateAndApplyPromoCode(
        supabaseClient,
        params.promoCode,
        subtotal,
        params.hotelId,
        params.roomTypeId
      );
      if (promoResult.valid) {
        discountAmount = promoResult.discountAmount;
        promoCodeInfo = promoResult.promoCode;
      }
    }
    // Calculate total
    const totalAmount = subtotal + taxAmount + serviceFee - discountAmount;
    // Calculate refund amount if cancelled (based on cancellation policy)
    const refundInfo = calculateRefundPolicy(
      roomType.refundable,
      roomType.cancellation_hours,
      totalAmount,
      params.checkInDate
    );
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          // Booking details
          hotel_id: params.hotelId,
          hotel_name: roomType.hotel.name,
          room_type_id: params.roomTypeId,
          room_type_name: roomType.name,
          check_in_date: params.checkInDate,
          check_out_date: params.checkOutDate,
          number_of_nights: nights,
          number_of_rooms: numberOfRooms,
          // Price breakdown
          pricing: {
            price_per_night: pricePerNight,
            average_per_night: Math.round(subtotal / (nights * numberOfRooms)),
            subtotal,
            tax_amount: taxAmount,
            tax_rate: taxRate,
            service_fee: serviceFee,
            discount_amount: discountAmount,
            total_amount: totalAmount,
          },
          // Promo code info
          promo_code: promoCodeInfo,
          // Refund policy
          cancellation_policy: refundInfo,
          // Additional info
          breakfast_included: roomType.breakfast_included,
          refundable: roomType.refundable,
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
    console.error('Error calculating price:', error);
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
// Validate and apply promo code
async function validateAndApplyPromoCode(supabase, code, subtotal, hotelId, roomTypeId) {
  const { data: promo, error } = await supabase
    .from('ecommerce_promo_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();
  if (error || !promo) {
    return {
      valid: false,
      error: 'Invalid promo code',
    };
  }
  // Check validity dates
  const now = new Date();
  if (promo.valid_from && new Date(promo.valid_from) > now) {
    return {
      valid: false,
      error: 'Promo code not yet valid',
    };
  }
  if (promo.valid_until && new Date(promo.valid_until) < now) {
    return {
      valid: false,
      error: 'Promo code has expired',
    };
  }
  // Check usage limit
  if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
    return {
      valid: false,
      error: 'Promo code usage limit reached',
    };
  }
  // Check minimum order amount
  if (promo.min_order_amount && subtotal < promo.min_order_amount) {
    return {
      valid: false,
      error: `Minimum order amount is ${promo.min_order_amount}`,
    };
  }
  // Calculate discount
  let discountAmount = 0;
  switch (promo.discount_type) {
    case 'percentage':
      discountAmount = Math.round(subtotal * (promo.discount_value / 100));
      break;
    case 'fixed_amount':
      discountAmount = promo.discount_value;
      break;
    case 'free_shipping':
      // For hotels, this could mean free airport transfer or similar
      discountAmount = 0; // Handle separately
      break;
  }
  // Apply max discount cap
  if (promo.max_discount_amount && discountAmount > promo.max_discount_amount) {
    discountAmount = promo.max_discount_amount;
  }
  return {
    valid: true,
    discountAmount,
    promoCode: {
      code: promo.code,
      description: promo.description,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      discount_amount: discountAmount,
    },
  };
}
// Calculate refund policy
function calculateRefundPolicy(refundable, cancellationHours, totalAmount, checkInDate) {
  if (!refundable) {
    return {
      refundable: false,
      message: 'Non-refundable booking',
      refund_amount: 0,
      cancellation_deadline: null,
    };
  }
  // Calculate cancellation deadline
  const checkIn = new Date(checkInDate);
  const deadline = new Date(checkIn);
  deadline.setHours(deadline.getHours() - cancellationHours);
  const now = new Date();
  const hoursUntilCheckIn = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);
  let refundPercentage = 100;
  let message = `Full refund if cancelled before ${deadline.toLocaleString()}`;
  // Adjust refund based on how close to check-in
  if (hoursUntilCheckIn < cancellationHours) {
    refundPercentage = 0;
    message = 'No refund available (past cancellation deadline)';
  } else if (hoursUntilCheckIn < cancellationHours * 2) {
    refundPercentage = 50;
    message = '50% refund available';
  }
  return {
    refundable: true,
    refund_percentage: refundPercentage,
    refund_amount: Math.round((totalAmount * refundPercentage) / 100),
    cancellation_deadline: deadline.toISOString(),
    cancellation_hours: cancellationHours,
    message,
  };
}
