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

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { roomTypeId, startDate, endDate, price, isDynamic } = await req.json();

        if (!roomTypeId || !startDate || !endDate || !price) {
            throw new Error('Room Type ID, Start Date, End Date, and Price are required');
        }

        // Verify ownership
        const { data: roomType } = await supabaseClient
            .from('room_types')
            .select('hotel_id, total_rooms, hotels(host_id)')
            .eq('id', roomTypeId)
            .single();

        if (!roomType) throw new Error('Room type not found');

        const isHost = roomType.hotels.host_id === user.id;
        if (!isHost) {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            if (profile?.role !== 'admin') throw new Error('Unauthorized');
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error('Invalid date format');
        if (start > end) throw new Error('Start date must be before end date');

        // We need to be careful not to overwrite existing availability data if it exists.
        // Strategy: Fetch existing records for the range, then merge with new price.

        // 1. Fetch existing records
        const { data: existingRecords } = await supabaseClient
            .from('room_availability')
            .select('*')
            .eq('room_type_id', roomTypeId)
            .gte('date', startDate)
            .lte('date', endDate);

        const existingMap = new Map();
        if (existingRecords) {
            existingRecords.forEach(r => existingMap.set(r.date, r));
        }

        // 2. Prepare upserts
        const records = [];
        const currentDate = new Date(start);

        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const existing = existingMap.get(dateStr) || {};

            const newRecord = {
                room_type_id: roomTypeId,
                date: dateStr,
                available_rooms: existing.available_rooms ?? roomType.total_rooms, // Preserve or default
                is_blocked: existing.is_blocked ?? false, // Preserve
                block_reason: existing.block_reason ?? null, // Preserve
                updated_at: new Date().toISOString()
            };

            if (isDynamic) {
                newRecord['dynamic_price'] = price;
                newRecord['base_price'] = existing.base_price; // Keep existing base
            } else {
                newRecord['base_price'] = price;
                newRecord['dynamic_price'] = null; // Reset dynamic if setting base? Or keep? Let's reset to be clean.
            }

            records.push(newRecord);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // 3. Upsert in batches
        const batchSize = 100;
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            const { error } = await supabaseClient
                .from('room_availability')
                .upsert(batch, { onConflict: 'room_type_id,date' });

            if (error) throw error;
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: `Updated pricing for ${records.length} days`,
                data: {
                    roomTypeId,
                    startDate,
                    endDate,
                    price,
                    type: isDynamic ? 'dynamic' : 'base'
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
