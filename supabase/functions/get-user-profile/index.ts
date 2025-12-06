// supabase/functions/get-user-profile/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Create Supabase client with user's auth token
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
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
    // Get user profile
    const { data: profileData, error: profileError } = await supabaseClient.from('user_profiles').select('*').eq('id', user.id).maybeSingle(); // ✅ Use maybeSingle() instead of single()
    if (profileError) {
      throw profileError;
    }
    if (!profileData) {
      return new Response(JSON.stringify({
        error: 'Profile not found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Initialize with defaults
    let roles = [];
    let activeRole = null;
    let addresses = [];
    let notificationPrefs = null;
    // Get user roles
    try {
      const { data, error } = await supabaseClient.from('user_roles').select('role_name').eq('user_id', user.id);
      if (!error && data) {
        roles = data;
      }
    } catch (err) {
      console.log('user_roles query error:', err);
    }
    // Get active role - handle multiple or no results gracefully
    try {
      const { data, error } = await supabaseClient.from('user_active_roles').select('active_role').eq('user_id', user.id).maybeSingle(); // ✅ Changed from single() to maybeSingle()
      if (!error && data) {
        activeRole = data.active_role;
      }
    } catch (err) {
      console.log('user_active_roles query error:', err);
    }
    // Get user addresses
    try {
      const { data, error } = await supabaseClient.from('user_addresses').select('*').eq('user_id', user.id).order('is_default', {
        ascending: false
      });
      if (!error && data) {
        addresses = data;
      }
    } catch (err) {
      console.log('user_addresses query error:', err);
    }
    // Get notification preferences - handle multiple or no results gracefully
    try {
      const { data, error } = await supabaseClient.from('user_notification_preferences').select('*').eq('user_id', user.id).maybeSingle(); // ✅ Changed from single() to maybeSingle()
      if (!error && data) {
        notificationPrefs = data;
      }
    } catch (err) {
      console.log('user_notification_preferences query error:', err);
    }
    // Combine all data
    const userProfile = {
      email: user.email,
      profile: profileData,
      roles: roles.map((r)=>r.role_name),
      active_role: activeRole,
      addresses: addresses,
      notification_preferences: notificationPrefs,
      is_admin: roles.some((r)=>r.role_name === 'ADMIN')
    };
    return new Response(JSON.stringify({
      success: true,
      data: userProfile
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return new Response(JSON.stringify({
      success: false,
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
