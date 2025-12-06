// supabase/functions/add-user-address/index.ts
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
    // Create Supabase client with user's auth
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized - Please log in'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Get address data from request
    const { label, name, building_number, street, address2, city, state, zip_code, country, phone, latitude, longitude, is_default// Optional: Set as default address
     } = await req.json();
    // Validate required fields
    if (!label || !street || !city || !country) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: label, street, city, country'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Insert address with authenticated user's ID
    const { data: address, error: insertError } = await supabaseClient.from('user_addresses').insert({
      user_id: user.id,
      label,
      name,
      building_number,
      street,
      address2,
      city,
      state,
      zip_code,
      country,
      phone,
      latitude,
      longitude,
      is_default: is_default ?? false,
      address_type: label?.toLowerCase() // Also set address_type for consistency
    }).select().single();
    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({
        success: false,
        error: insertError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Return success
    return new Response(JSON.stringify({
      success: true,
      data: {
        address
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Function error:', error);
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
