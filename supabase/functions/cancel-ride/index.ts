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
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { ride_id, reason } = await req.json();

    if (!ride_id) throw new Error('ride_id is required');

    // Get cancellation settings from database
    const { data: cancellationSettings } = await supabaseClient
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

    // Get ride details
    const { data: ride, error: rideError } = await supabaseClient
      .from('rides')
      .select('*')
      .eq('id', ride_id)
      .single();

    if (rideError || !ride) throw new Error('Ride not found');

    // Determine if user is rider or driver
    const isRider = ride.rider_id === user.id;
    const isDriver = ride.driver_id === user.id;

    if (!isRider && !isDriver) {
      throw new Error('You are not authorized to cancel this ride');
    }

    if (['completed', 'cancelled'].includes(ride.status)) {
      throw new Error(`Ride is already ${ride.status}`);
    }

    let fee = 0;
    let messageToOtherParty = '';
    let notificationType = '';

    // Cancellation Logic
    if (isRider) {
      // Rider cancelling
      notificationType = 'ride_cancelled_by_rider';
      messageToOtherParty = 'Rider has cancelled the trip.';

      // Check for cancellation fee
      if (ride.status === 'accepted' || ride.status === 'in_progress') {
        const acceptedTime = new Date(ride.accepted_at).getTime();
        const now = new Date().getTime();
        const minutesSinceAccept = (now - acceptedTime) / (1000 * 60);

        if (minutesSinceAccept > GRACE_PERIOD_MINUTES) {
          fee = CANCELLATION_FEE;
        }
      }
    } else {
      // Driver cancelling
      notificationType = 'ride_cancelled_by_driver';
      messageToOtherParty =
        'Driver has cancelled the trip. We are searching for another driver.';
      // Drivers usually don't pay a fee, but might get a penalty score (handled separately)
    }

    // Update Ride
    const { data: updatedRide, error: updateError } = await supabaseClient
      .from('rides')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        cancellation_fee: fee,
        cancelled_by: isRider ? 'rider' : 'driver',
      })
      .eq('id', ride_id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Notify the other party
    const otherUserId = isRider ? ride.driver_id : ride.rider_id;

    if (otherUserId) {
      await supabaseClient.from('notifications').insert({
        user_id: otherUserId,
        type: notificationType,
        title: 'Ride Cancelled',
        message: messageToOtherParty,
        data: {
          ride_id: ride.id,
          reason,
          fee_charged: fee > 0,
        },
      });
    }

    // If driver cancelled, we might want to automatically re-queue the ride for other drivers
    // For MVP, we'll just cancel it and ask rider to request again

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ride: updatedRide,
          fee_charged: fee,
          message: 'Ride cancelled successfully',
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
