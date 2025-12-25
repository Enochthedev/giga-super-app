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
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { hotelId, startDate, endDate } = await req.json();

    if (!hotelId) {
      throw new Error('Hotel ID is required');
    }

    // Verify hotel ownership
    const { data: hotel } = await supabaseClient
      .from('hotels')
      .select('host_id, name')
      .eq('id', hotelId)
      .single();

    if (!hotel) throw new Error('Hotel not found');
    if (hotel.host_id !== user.id) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Unauthorized');
      }
    }

    const start =
      startDate || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString();
    const end = endDate || new Date().toISOString();

    // Get booking statistics
    const { data: bookings } = await supabaseClient
      .from('hotel_bookings')
      .select('*')
      .eq('hotel_id', hotelId)
      .gte('created_at', start)
      .lte('created_at', end);

    const totalBookings = bookings?.length || 0;
    const confirmedBookings =
      bookings?.filter(b => b.status === 'confirmed' || b.status === 'completed')
        ?.length || 0;
    const cancelledBookings =
      bookings?.filter(b => b.status === 'cancelled')?.length || 0;
    const totalRevenue =
      bookings?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // Get room type performance
    const { data: roomTypes } = await supabaseClient
      .from('room_types')
      .select('id, name')
      .eq('hotel_id', hotelId);

    const roomPerformance = await Promise.all(
      (roomTypes || []).map(async rt => {
        const { data: roomBookings } = await supabaseClient
          .from('hotel_bookings')
          .select('total_amount')
          .eq('room_type_id', rt.id)
          .gte('created_at', start)
          .lte('created_at', end);

        const bookings = roomBookings?.length || 0;
        const revenue =
          roomBookings?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;

        return {
          roomType: rt.name,
          bookings,
          revenue,
        };
      })
    );

    // Get review stats
    const { data: reviews } = await supabaseClient
      .from('hotel_reviews')
      .select('rating')
      .eq('hotel_id', hotelId)
      .gte('created_at', start)
      .lte('created_at', end);

    const avgRating =
      reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    // Calculate occupancy rate
    const totalDays = Math.ceil(
      (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalRooms =
      roomTypes?.reduce((sum, rt) => sum + (rt as any).total_rooms || 0, 0) || 0;
    const totalNights =
      bookings?.reduce((sum, b) => {
        const checkIn = new Date(b.check_in_date);
        const checkOut = new Date(b.check_out_date);
        const nights = Math.ceil(
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + nights;
      }, 0) || 0;

    const occupancyRate =
      totalRooms > 0 && totalDays > 0
        ? (totalNights / (totalRooms * totalDays)) * 100
        : 0;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          period: { start, end, days: totalDays },
          bookings: {
            total: totalBookings,
            confirmed: confirmedBookings,
            cancelled: cancelledBookings,
            cancellationRate:
              totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0,
          },
          revenue: {
            total: Math.round(totalRevenue * 100) / 100,
            average: Math.round(averageBookingValue * 100) / 100,
          },
          occupancy: {
            rate: Math.round(occupancyRate * 10) / 10,
            totalRooms,
            totalNights,
          },
          reviews: {
            count: reviews?.length || 0,
            averageRating: Math.round(avgRating * 10) / 10,
          },
          roomPerformance,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
