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

    const {
      hotelId,
      bookingId,
      rating,
      title,
      comment,
      cleanlinessRating,
      comfortRating,
      locationRating,
      serviceRating,
      valueRating,
      images,
    } = await req.json();

    if (!hotelId || !rating) {
      throw new Error('Hotel ID and rating are required');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Verify booking if provided
    if (bookingId) {
      const { data: booking, error: bookingError } = await supabaseClient
        .from('hotel_bookings')
        .select('id, status')
        .eq('id', bookingId)
        .eq('user_id', user.id)
        .single();

      if (bookingError || !booking) {
        throw new Error('Booking not found or unauthorized');
      }

      if (booking.status !== 'completed' && booking.status !== 'checked_out') {
        throw new Error('Can only review completed bookings');
      }

      // Check if already reviewed
      const { data: existingReview } = await supabaseClient
        .from('hotel_reviews')
        .select('id')
        .eq('booking_id', bookingId)
        .single();

      if (existingReview) {
        throw new Error('You have already reviewed this booking');
      }
    }

    // Create review
    const { data: review, error: reviewError } = await supabaseClient
      .from('hotel_reviews')
      .insert({
        hotel_id: hotelId,
        booking_id: bookingId,
        user_id: user.id,
        rating,
        title,
        comment,
        cleanliness_rating: cleanlinessRating,
        comfort_rating: comfortRating,
        location_rating: locationRating,
        service_rating: serviceRating,
        value_rating: valueRating,
        images: images || [],
        is_verified: bookingId ? true : false, // Mark as verified if linked to booking
      })
      .select()
      .single();

    if (reviewError) throw reviewError;

    // Update hotel's average rating and review count
    const { data: hotelReviews } = await supabaseClient
      .from('hotel_reviews')
      .select('rating')
      .eq('hotel_id', hotelId)
      .eq('is_approved', true);

    if (hotelReviews) {
      const avgRating =
        hotelReviews.reduce((sum, r) => sum + r.rating, 0) / hotelReviews.length;

      await supabaseClient
        .from('hotels')
        .update({
          average_rating: Math.round(avgRating * 10) / 10,
          total_reviews: hotelReviews.length,
        })
        .eq('id', hotelId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: review,
        message: 'Review submitted successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
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
