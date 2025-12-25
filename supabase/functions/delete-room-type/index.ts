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

    const { roomTypeId } = await req.json();

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

    // Soft delete
    const { error } = await supabaseClient
      .from('room_types')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomTypeId);

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Room type deleted successfully (soft delete)',
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
