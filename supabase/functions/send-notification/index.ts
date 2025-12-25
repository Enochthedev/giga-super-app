import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
// Template rendering using Handlebars
function renderTemplate(template, variables) {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, String(value));
  }
  return rendered;
}
// Send email (you'll integrate with Resend, SendGrid, etc.)
async function sendEmail(to, subject, body) {
  try {
    // TODO: Integrate with your email provider (Resend, SendGrid, etc.)
    // For now, we'll just log
    console.log('Sending email:', {
      to,
      subject,
      body,
    });
    // Placeholder - Replace with actual email service
    // Example with Resend:
    // const response = await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     from: 'notifications@giga.com',
    //     to,
    //     subject,
    //     html: body
    //   })
    // })
    return {
      success: true,
      provider_id: 'mock-email-id',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
// Send SMS
async function sendSMS(to, body) {
  try {
    // TODO: Integrate with Twilio or similar
    console.log('Sending SMS:', {
      to,
      body,
    });
    return {
      success: true,
      provider_id: 'mock-sms-id',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
// Send push notification
async function sendPush(deviceToken, title, body) {
  try {
    // TODO: Integrate with Firebase Cloud Messaging
    console.log('Sending push:', {
      deviceToken,
      title,
      body,
    });
    return {
      success: true,
      provider_id: 'mock-push-id',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }
  try {
    console.log('=== Send Notification Started ===');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Use service role for sending
    );
    const {
      user_id,
      template_name,
      variables,
      channels,
      recipient_email,
      recipient_phone,
      recipient_device_token,
    } = await req.json();
    console.log('Request:', {
      user_id,
      template_name,
      channels,
    });
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
    // Get template
    const { data: template, error: templateError } = await supabaseClient
      .from('notification_templates')
      .select('*')
      .eq('name', template_name)
      .eq('is_active', true)
      .single();
    if (templateError || !template) {
      console.error('Template error:', templateError);
      return new Response(
        JSON.stringify({
          error: 'Template not found or inactive',
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    console.log('Template found:', template.name);
    // Get user preferences if user_id provided
    let userPreferences = null;
    if (user_id) {
      const { data: prefs } = await supabaseClient
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user_id)
        .single();
      userPreferences = prefs;
    }
    // Determine which channels to use
    const targetChannels = channels || template.channels;
    const enabledChannels = targetChannels.filter(channel => {
      if (!userPreferences) return true;
      // Check if user has opted out globally
      if (userPreferences.global_opt_out) return false;
      // Check channel-specific preferences
      const categoryPrefs = userPreferences.category_preferences[template.category] || {};
      return (
        categoryPrefs[channel] !== false &&
        userPreferences[`${channel}_enabled`] !== false
      );
    });
    console.log('Enabled channels:', enabledChannels);
    if (enabledChannels.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'All channels disabled for user',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    // Render templates
    const renderedSubject = template.subject
      ? renderTemplate(template.subject, variables)
      : null;
    const renderedEmailBody = template.email_body
      ? renderTemplate(template.email_body, variables)
      : null;
    const renderedSmsBody = template.sms_body
      ? renderTemplate(template.sms_body, variables)
      : null;
    const renderedPushTitle = template.push_title
      ? renderTemplate(template.push_title, variables)
      : null;
    const renderedPushBody = template.push_body
      ? renderTemplate(template.push_body, variables)
      : null;
    // Send notifications
    const results = {};
    if (enabledChannels.includes('email') && recipient_email && renderedEmailBody) {
      console.log('Sending email...');
      const emailResult = await sendEmail(
        recipient_email,
        renderedSubject,
        renderedEmailBody
      );
      results.email = emailResult;
    }
    if (enabledChannels.includes('sms') && recipient_phone && renderedSmsBody) {
      console.log('Sending SMS...');
      const smsResult = await sendSMS(recipient_phone, renderedSmsBody);
      results.sms = smsResult;
    }
    if (enabledChannels.includes('push') && recipient_device_token && renderedPushBody) {
      console.log('Sending push...');
      const pushResult = await sendPush(
        recipient_device_token,
        renderedPushTitle,
        renderedPushBody
      );
      results.push = pushResult;
    }
    // Log notification
    const overallStatus = Object.values(results).some(r => r.success) ? 'sent' : 'failed';
    const { data: logEntry, error: logError } = await supabaseClient
      .from('notification_logs')
      .insert({
        user_id,
        template_id: template.id,
        template_name,
        recipient_email,
        recipient_phone,
        recipient_device_token,
        subject: renderedSubject,
        content: renderedEmailBody || renderedSmsBody || renderedPushBody,
        channels: enabledChannels,
        status: overallStatus,
        email_status: results.email?.success ? 'sent' : results.email ? 'failed' : null,
        sms_status: results.sms?.success ? 'sent' : results.sms ? 'failed' : null,
        push_status: results.push?.success ? 'sent' : results.push ? 'failed' : null,
        email_provider_id: results.email?.provider_id,
        sms_provider_id: results.sms?.provider_id,
        sent_at: overallStatus === 'sent' ? new Date().toISOString() : null,
        failed_at: overallStatus === 'failed' ? new Date().toISOString() : null,
        error_message: Object.values(results).find(r => !r.success)?.error,
        metadata: {
          variables,
          results,
        },
      })
      .select()
      .single();
    if (logError) {
      console.error('Failed to log notification:', logError);
    }
    console.log('Notification sent successfully');
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          log_id: logEntry?.id,
          channels: enabledChannels,
          results,
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
