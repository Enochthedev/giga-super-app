// supabase/functions/get-current-profile/index.ts
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
      console.error('Auth error:', authError);
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
    console.log('Fetching profile for user:', user.id);
    // Get user profile - use maybeSingle() to avoid errors
    const { data: profile, error: profileError } = await supabaseClient.from('user_profiles').select('*').eq('id', user.id).maybeSingle();
    if (profileError) {
      console.error('Profile error:', profileError);
      return new Response(JSON.stringify({
        success: false,
        error: `Profile fetch error: ${profileError.message}`
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (!profile) {
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
    console.log('Profile found successfully');
    // Initialize related data
    let roles = [];
    let activeRole = null;
    let addresses = [];
    // Get user roles
    try {
      const { data, error } = await supabaseClient.from('user_roles').select('role_name').eq('user_id', user.id);
      if (error) {
        console.log('user_roles query error:', error);
      } else if (data) {
        roles = data;
        console.log('Roles found:', roles.length);
      }
    } catch (err) {
      console.log('user_roles catch error:', err);
    }
    // Get active role
    try {
      const { data, error } = await supabaseClient.from('user_active_roles').select('active_role').eq('user_id', user.id).maybeSingle();
      if (error) {
        console.log('user_active_roles query error:', error);
      } else if (data) {
        activeRole = data.active_role;
        console.log('Active role found:', activeRole);
      }
    } catch (err) {
      console.log('user_active_roles catch error:', err);
    }
    // Get user addresses
    try {
      const { data, error } = await supabaseClient.from('user_addresses').select('*').eq('user_id', user.id).order('is_default', {
        ascending: false
      });
      if (error) {
        console.log('user_addresses query error:', error);
      } else if (data) {
        addresses = data;
        console.log('Addresses found:', addresses.length);
      }
    } catch (err) {
      console.log('user_addresses catch error:', err);
    }
    // Combine all data - matching your expected structure
    const userProfile = {
      email: user.email,
      profile: profile,
      roles: roles.map((r)=>r.role_name),
      active_role: activeRole,
      addresses: addresses
    };
    console.log('Returning profile successfully');
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
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
