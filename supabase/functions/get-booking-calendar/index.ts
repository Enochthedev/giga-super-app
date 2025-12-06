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

        const { roomTypeId, month, year } = await req.json();

        if (!roomTypeId || !month || !year) {
            throw new Error('Room Type ID, Month, and Year are required');
        }

        // 1. Get Room Details
        const { data: roomType } = await supabaseClient
            .from('room_types')
            .select('*')
            .eq('id', roomTypeId)
            .single();

        if (!roomType) throw new Error('Room type not found');

        // Calculate Date Range
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of month
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        // 2. Fetch Overrides (Availability & Price)
        const { data: overrides } = await supabaseClient
            .from('room_availability')
            .select('*')
            .eq('room_type_id', roomTypeId)
            .gte('date', startStr)
            .lte('date', endStr);

        const overrideMap = new Map();
        overrides?.forEach(o => overrideMap.set(o.date, o));

        // 3. Fetch Bookings
        const { data: bookings } = await supabaseClient
            .from('hotel_bookings')
            .select('check_in_date, check_out_date')
            .eq('room_type_id', roomTypeId)
            .neq('status', 'cancelled')
            .or(`check_in_date.lte.${endStr},check_out_date.gte.${startStr}`); // Overlap logic

        // 4. Build Calendar
        const calendar = [];
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const override = overrideMap.get(dateStr);

            // Determine Capacity
            let totalCapacity = roomType.total_rooms;
            let isBlocked = false;
            let price = roomType.base_price;

            if (override) {
                if (override.available_rooms !== null) totalCapacity = override.available_rooms;
                if (override.is_blocked) isBlocked = true;
                if (override.dynamic_price) price = override.dynamic_price;
                else if (override.base_price) price = override.base_price;
            }

            // Determine Booked Count
            // A booking counts if date >= check_in AND date < check_out
            const bookedCount = bookings?.filter(b => {
                return dateStr >= b.check_in_date && dateStr < b.check_out_date;
            }).length || 0;

            const available = Math.max(0, totalCapacity - bookedCount);

            calendar.push({
                date: dateStr,
                available: isBlocked ? 0 : available,
                price: parseFloat(price),
                status: isBlocked ? 'blocked' : (available === 0 ? 'sold_out' : 'available'),
                totalCapacity,
                bookedCount
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    roomTypeId,
                    month,
                    year,
                    calendar
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
