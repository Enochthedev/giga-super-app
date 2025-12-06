import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Authentication required');
    }
    const params = req.method === 'POST' ? await req.json() : {
      status: 'all',
      page: 1,
      limit: 20
    };
    const status = params.status || 'all';
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    // Build base query
    let query = supabaseClient.from('hotel_bookings').select(`
        *,
        hotel:hotels!inner(
          id,
          name,
          slug,
          city,
          state,
          country,
          address,
          featured_image,
          star_rating,
          phone,
          email
        ),
        room_type:room_types!inner(
          id,
          name,
          images,
          amenities,
          breakfast_included
        ),
        payment:hotel_booking_payments(
          id,
          amount,
          payment_status,
          payment_method,
          paid_at
        )
      `, {
      count: 'exact'
    }).eq('user_id', user.id).order('created_at', {
      ascending: false
    });
    // Filter by status
    const today = new Date().toISOString().split('T')[0];
    switch(status){
      case 'upcoming':
        query = query.gte('check_in_date', today).in('booking_status', [
          'pending',
          'confirmed'
        ]);
        break;
      case 'past':
        query = query.lt('check_out_date', today).in('booking_status', [
          'checked_out'
        ]);
        break;
      case 'cancelled':
        query = query.in('booking_status', [
          'cancelled',
          'no_show'
        ]);
        break;
      case 'all':
        break;
    }
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    const { data: bookings, error: bookingsError, count } = await query;
    if (bookingsError) throw bookingsError;
    // Categorize bookings
    const categorized = {
      upcoming: [],
      ongoing: [],
      past: [],
      cancelled: []
    };
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    bookings?.forEach((booking)=>{
      const checkIn = new Date(booking.check_in_date);
      const checkOut = new Date(booking.check_out_date);
      // Enhance booking data
      const enhancedBooking = {
        ...booking,
        // Status indicators
        is_upcoming: checkIn > now && [
          'pending',
          'confirmed'
        ].includes(booking.booking_status),
        is_ongoing: todayStr >= booking.check_in_date && todayStr < booking.check_out_date,
        is_past: checkOut < now,
        is_cancelled: [
          'cancelled',
          'no_show'
        ].includes(booking.booking_status),
        // Time calculations
        days_until_checkin: Math.ceil((checkIn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        // Can user still cancel?
        can_cancel: booking.booking_status === 'confirmed' && checkIn > now,
        // Can user review?
        can_review: booking.booking_status === 'checked_out' && !booking.has_review,
        // Payment summary
        payment_summary: {
          total_paid: booking.payment?.reduce((sum, p)=>p.payment_status === 'completed' ? sum + parseFloat(p.amount) : sum, 0) || 0,
          payment_complete: booking.payment_status === 'paid',
          payment_method: booking.payment?.[0]?.payment_method || null
        }
      };
      // Categorize
      if (enhancedBooking.is_cancelled) {
        categorized.cancelled.push(enhancedBooking);
      } else if (enhancedBooking.is_ongoing) {
        categorized.ongoing.push(enhancedBooking);
      } else if (enhancedBooking.is_upcoming) {
        categorized.upcoming.push(enhancedBooking);
      } else if (enhancedBooking.is_past) {
        categorized.past.push(enhancedBooking);
      }
    });
    return new Response(JSON.stringify({
      success: true,
      data: {
        bookings: bookings || [],
        categorized,
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit)
        },
        summary: {
          total: count || 0,
          upcoming: categorized.upcoming.length,
          ongoing: categorized.ongoing.length,
          past: categorized.past.length,
          cancelled: categorized.cancelled.length
        }
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
