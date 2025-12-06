import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    console.log('=== Queue Processor Started ===');
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { batch_size = 10 } = await req.json().catch(()=>({}));
    // Get pending notifications (ordered by priority, then FIFO)
    const { data: queueItems, error: fetchError } = await supabaseClient.from('notification_queue').select('*').eq('status', 'pending').lte('process_after', new Date().toISOString()).lt('attempts', 3) // Don't process if already failed 3 times
    .order('priority', {
      ascending: false
    }).order('created_at', {
      ascending: true
    }).limit(batch_size);
    if (fetchError) {
      console.error('Fetch error:', fetchError);
      throw fetchError;
    }
    if (!queueItems || queueItems.length === 0) {
      console.log('No items in queue');
      return new Response(JSON.stringify({
        success: true,
        processed: 0,
        message: 'Queue is empty'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`Processing ${queueItems.length} items`);
    const results = [];
    for (const item of queueItems){
      try {
        // Mark as processing
        await supabaseClient.from('notification_queue').update({
          status: 'processing',
          picked_at: new Date().toISOString(),
          attempts: item.attempts + 1
        }).eq('id', item.id);
        // Call send-notification function
        const sendResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: item.user_id,
            template_name: item.template_name,
            variables: item.variables,
            recipient_email: item.recipient_email,
            recipient_phone: item.recipient_phone,
            recipient_device_token: item.recipient_device_token
          })
        });
        const sendResult = await sendResponse.json();
        if (sendResponse.ok && sendResult.success) {
          // Success - mark as sent
          await supabaseClient.from('notification_queue').update({
            status: 'sent',
            processed_at: new Date().toISOString(),
            notification_log_id: sendResult.data.log_id
          }).eq('id', item.id);
          results.push({
            id: item.id,
            status: 'sent'
          });
        } else {
          throw new Error(sendResult.error || 'Send failed');
        }
      } catch (error) {
        console.error(`Error processing item ${item.id}:`, error);
        // Check if should retry
        const shouldRetry = item.attempts < item.max_attempts;
        await supabaseClient.from('notification_queue').update({
          status: shouldRetry ? 'pending' : 'failed',
          error_message: error.message,
          failed_at: shouldRetry ? null : new Date().toISOString(),
          // Exponential backoff: retry after 2^attempts minutes
          process_after: shouldRetry ? new Date(Date.now() + Math.pow(2, item.attempts) * 60000).toISOString() : null
        }).eq('id', item.id);
        results.push({
          id: item.id,
          status: shouldRetry ? 'retry_scheduled' : 'failed',
          error: error.message
        });
      }
    }
    console.log('Processing complete:', results);
    return new Response(JSON.stringify({
      success: true,
      processed: queueItems.length,
      results
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
