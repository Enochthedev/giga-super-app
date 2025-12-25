// supabase/functions/queue-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const {
      user_id,
      template_name,
      variables,
      recipient_email,
      recipient_phone,
      recipient_device_token,
      priority = 5,
      delay_seconds = 0,
    } = await req.json();
    // Validation
    if (!template_name || !variables) {
      return new Response(
        JSON.stringify({
          error: 'Missing template_name or variables',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    // Calculate process_after time
    const processAfter = new Date();
    processAfter.setSeconds(processAfter.getSeconds() + delay_seconds);
    // Insert into queue (FAST - just database write)
    const { data: queueEntry, error: queueError } = await supabaseClient
      .from('notification_queue')
      .insert({
        user_id,
        template_name,
        variables,
        recipient_email,
        recipient_phone,
        recipient_device_token,
        priority,
        process_after: processAfter.toISOString(),
      })
      .select()
      .single();
    if (queueError) {
      console.error('Queue error:', queueError);
      throw new Error(`Failed to queue notification: ${queueError.message}`);
    }
    console.log('Notification queued:', queueEntry.id);
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          queue_id: queueEntry.id,
          status: 'queued',
          estimated_send_time: processAfter.toISOString(),
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
