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

        const { roomTypeId, date } = await req.json();

        if (!roomTypeId || !date) throw new Error('Room Type ID and Date are required');

        // 1. Get Room Details & Base Price
        const { data: roomType } = await supabaseClient
            .from('room_types')
            .select('*, hotels(city)')
            .eq('id', roomTypeId)
            .single();

        if (!roomType) throw new Error('Room type not found');

        // 2. Get Current Occupancy
        // Count bookings for this room type on this date
        const { count: bookedCount } = await supabaseClient
            .from('hotel_bookings')
            .select('id', { count: 'exact', head: true })
            .eq('room_type_id', roomTypeId)
            .lte('check_in_date', date)
            .gt('check_out_date', date)
            .neq('status', 'cancelled');

        const totalRooms = roomType.total_rooms;
        const occupancyRate = (bookedCount || 0) / totalRooms;

        // 3. Calculate Multipliers
        let multiplier = 1.0;
        const factors = [];

        // Factor A: Occupancy
        if (occupancyRate > 0.9) {
            multiplier += 0.5; // +50% if almost full
            factors.push('High Occupancy (>90%)');
        } else if (occupancyRate > 0.7) {
            multiplier += 0.2; // +20% if busy
            factors.push('Medium Occupancy (>70%)');
        } else if (occupancyRate < 0.2) {
            multiplier -= 0.1; // -10% if empty
            factors.push('Low Occupancy (<20%)');
        }

        // Factor B: Weekend
        const dayOfWeek = new Date(date).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sun or Sat
        if (isWeekend) {
            multiplier += 0.15; // +15% on weekends
            factors.push('Weekend Premium');
        }

        // Factor C: Seasonality (Simple Month check)
        const month = new Date(date).getMonth(); // 0-11
        if (month === 11 || month === 0) { // Dec, Jan
            multiplier += 0.25; // +25% Holiday Season
            factors.push('Holiday Season');
        }

        // 4. Final Calculation
        const basePrice = roomType.base_price;
        const suggestedPrice = Math.round(basePrice * multiplier);

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    roomTypeId,
                    date,
                    basePrice,
                    suggestedPrice,
                    multiplier,
                    occupancyRate,
                    factors
                }
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
