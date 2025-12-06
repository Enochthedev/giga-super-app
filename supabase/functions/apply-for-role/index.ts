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
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
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
    const { role_name, application_data, document_urls } = await req.json();
    // Validate
    const validRoles = [
      'VENDOR',
      'DRIVER',
      'HOST',
      'ADVERTISER'
    ];
    if (!validRoles.includes(role_name)) {
      return new Response(JSON.stringify({
        error: 'Invalid role'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Check if user already has this role
    const { data: existingRole } = await supabaseClient.from('user_roles').select('role_name').eq('user_id', user.id).eq('role_name', role_name).single();
    if (existingRole) {
      return new Response(JSON.stringify({
        error: 'You already have this role'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Check for pending application
    const { data: pendingApp } = await supabaseClient.from('role_applications').select('id, status').eq('user_id', user.id).eq('role_name', role_name).eq('status', 'pending').single();
    if (pendingApp) {
      return new Response(JSON.stringify({
        error: 'You already have a pending application for this role'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Create application
    const { data: application, error: appError } = await supabaseClient.from('role_applications').insert({
      user_id: user.id,
      role_name,
      status: 'pending',
      application_data,
      document_urls: document_urls || []
    }).select().single();
    if (appError) throw appError;
    return new Response(JSON.stringify({
      success: true,
      data: {
        application
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
