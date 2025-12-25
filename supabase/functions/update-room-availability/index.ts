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

    const { roomTypeId, startDate, endDate, availableRooms, isBlocked, reason } =
      await req.json();

    if (!roomTypeId || !startDate || !endDate) {
      throw new Error('Room Type ID, Start Date, and End Date are required');
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
      // Check admin
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
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format');
    }
    if (start > end) {
      throw new Error('Start date must be before end date');
    }

    // Prepare records to upsert
    const records = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      records.push({
        room_type_id: roomTypeId,
        date: currentDate.toISOString().split('T')[0],
        available_rooms: isBlocked ? 0 : (availableRooms ?? roomType.total_rooms),
        is_blocked: isBlocked || false,
        block_reason: reason || null,
        updated_at: new Date().toISOString(),
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Upsert in batches of 100 to avoid limits
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
        message: `Updated availability for ${records.length} days`,
        data: {
          roomTypeId,
          startDate,
          endDate,
          daysUpdated: records.length,
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
