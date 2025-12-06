import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

        const { ride_id, rating, comment } = await req.json();

        if (!ride_id || !rating) {
            throw new Error('Ride ID and rating are required');
        }

        // 1. Verify ride
        const { data: ride, error: rideError } = await supabaseClient
            .from('rides')
            .select('*')
            .eq('id', ride_id)
            .single();

        if (rideError || !ride) throw new Error('Ride not found');
        if (ride.passenger_id !== user.id) throw new Error('Unauthorized: Only the passenger can rate the driver');
        if (ride.status !== 'completed') throw new Error('Ride must be completed before rating');

        // 2. Update ride with rating
        const { error: updateError } = await supabaseClient
            .from('rides')
            .update({
                rating,
                review_comment: comment,
                updated_at: new Date().toISOString()
            })
            .eq('id', ride_id);

        if (updateError) throw updateError;

        // 3. Update driver's average rating
        const { data: ratings } = await supabaseClient
            .from('rides')
            .select('rating')
            .eq('driver_id', ride.driver_id)
            .not('rating', 'is', null);

        if (ratings && ratings.length > 0) {
            const total = ratings.reduce((sum, r) => sum + r.rating, 0);
            const average = Number((total / ratings.length).toFixed(1));

            await supabaseClient
                .from('driver_profiles')
                .update({ rating: average })
                .eq('user_id', ride.driver_id);
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Rating submitted successfully'
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
