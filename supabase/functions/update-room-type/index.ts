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

        const { roomTypeId, ...updates } = await req.json();

        if (!roomTypeId) {
            throw new Error('Room Type ID is required');
        }

        // Verify ownership
        const { data: roomType } = await supabaseClient
            .from('room_types')
            .select('hotel_id, hotels(host_id)')
            .eq('id', roomTypeId)
            .single();

        if (!roomType) throw new Error('Room type not found');

        // Check if user is host or admin
        const isHost = roomType.hotels.host_id === user.id;
        if (!isHost) {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role !== 'admin') {
                throw new Error('Unauthorized');
            }
        }

        // Allowed fields to update
        const allowedFields = [
            'name', 'description', 'capacity', 'beds_count', 'bed_type',
            'room_size_sqft', 'base_price', 'weekend_price', 'amenities',
            'images', 'max_adults', 'max_children', 'allows_pets',
            'allows_smoking', 'breakfast_included', 'refundable',
            'cancellation_hours', 'total_rooms', 'display_order', 'is_active'
        ];

        const cleanUpdates: Record<string, any> = {};
        for (const key of Object.keys(updates)) {
            // Convert camelCase to snake_case if needed, or just accept matching keys
            if (allowedFields.includes(key)) {
                cleanUpdates[key] = updates[key];
            } else if (key === 'basePrice') cleanUpdates['base_price'] = updates[key];
            else if (key === 'weekendPrice') cleanUpdates['weekend_price'] = updates[key];
            else if (key === 'maxAdults') cleanUpdates['max_adults'] = updates[key];
            else if (key === 'maxChildren') cleanUpdates['max_children'] = updates[key];
            else if (key === 'allowsPets') cleanUpdates['allows_pets'] = updates[key];
            else if (key === 'allowsSmoking') cleanUpdates['allows_smoking'] = updates[key];
            else if (key === 'breakfastIncluded') cleanUpdates['breakfast_included'] = updates[key];
            else if (key === 'cancellationHours') cleanUpdates['cancellation_hours'] = updates[key];
            else if (key === 'totalRooms') cleanUpdates['total_rooms'] = updates[key];
            else if (key === 'displayOrder') cleanUpdates['display_order'] = updates[key];
            else if (key === 'bedsCount') cleanUpdates['beds_count'] = updates[key];
            else if (key === 'bedType') cleanUpdates['bed_type'] = updates[key];
            else if (key === 'roomSizeSqft') cleanUpdates['room_size_sqft'] = updates[key];
        }

        cleanUpdates['updated_at'] = new Date().toISOString();

        const { data: updatedRoom, error } = await supabaseClient
            .from('room_types')
            .update(cleanUpdates)
            .eq('id', roomTypeId)
            .select()
            .single();

        if (error) throw error;

        return new Response(
            JSON.stringify({
                success: true,
                data: updatedRoom,
                message: 'Room type updated successfully',
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
