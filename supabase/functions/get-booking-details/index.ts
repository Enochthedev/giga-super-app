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

    const { bookingId } = await req.json();

    if (!bookingId) {
      throw new Error('Booking ID is required');
    }

    // Get booking details with all related info
    const { data: booking, error } = await supabaseClient
      .from('hotel_bookings')
      .select(
        `
        *,
        hotel:hotels(
          id,
          name,
          slug,
          address,
          city,
          state,
          country,
          phone,
          email,
          featured_image,
          check_in_time,
          check_out_time
        ),
        room_type:room_types(
          id,
          name,
          description,
          bed_type,
          max_adults,
          max_children
        ),
        payment:payments(
          id,
          amount,
          payment_method,
          payment_provider,
          status,
          transaction_id
        )
      `
      )
      .eq('id', bookingId)
      .single();

    if (error) throw error;
    if (!booking) throw new Error('Booking not found');

    // Get booking status history
    const { data: statusHistory } = await supabaseClient
      .from('hotel_booking_status_history')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...booking,
          statusHistory: statusHistory || [],
        },
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
