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
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Get admin user
    const authClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Check if user is admin
    const { data: adminRole } = await supabaseClient.from('user_roles').select('role_name').eq('user_id', user.id).eq('role_name', 'ADMIN').single();
    if (!adminRole) {
      return new Response(JSON.stringify({
        error: 'Forbidden: Admin access required'
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { application_id, action, rejection_reason } = await req.json();
    if (![
      'approve',
      'reject'
    ].includes(action)) {
      return new Response(JSON.stringify({
        error: 'Invalid action'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Get application
    const { data: application, error: appError } = await supabaseClient.from('role_applications').select('*').eq('id', application_id).eq('status', 'pending').single();
    if (appError || !application) {
      return new Response(JSON.stringify({
        error: 'Application not found or already processed'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (action === 'approve') {
      // Add role to user
      const { error: roleError } = await supabaseClient.from('user_roles').insert({
        user_id: application.user_id,
        role_name: application.role_name
      });
      if (roleError) throw roleError;
      // Update application status
      await supabaseClient.from('role_applications').update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      }).eq('id', application_id);
    // Send notification (optional)
    // await sendNotification(...)
    } else {
      // Reject application
      await supabaseClient.from('role_applications').update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason
      }).eq('id', application_id);
    }
    return new Response(JSON.stringify({
      success: true,
      data: {
        application_id,
        action,
        role_name: application.role_name
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
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
