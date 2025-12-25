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
      recipients,
      template_name,
      variables_template,
      priority = 5,
    } = await req.json();
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'recipients array is required',
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
    if (recipients.length > 1000) {
      return new Response(
        JSON.stringify({
          error: 'Maximum 1000 recipients per batch',
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
    // Queue all notifications
    const queueItems = recipients.map(recipient => ({
      user_id: recipient.user_id,
      template_name,
      variables: {
        ...variables_template,
        ...recipient.variables,
      },
      recipient_email: recipient.recipient_email,
      recipient_phone: recipient.recipient_phone,
      recipient_device_token: recipient.recipient_device_token,
      priority,
    }));
    const { data: queued, error: queueError } = await supabaseClient
      .from('notification_queue')
      .insert(queueItems)
      .select('id');
    if (queueError) throw queueError;
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          queued_count: queued.length,
          queue_ids: queued.map(q => q.id),
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
