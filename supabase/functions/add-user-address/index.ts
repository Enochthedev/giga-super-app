// supabase/functions/add-user-address/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
serve(async req => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }
  try {
    // Create Supabase client with user's auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization'),
          },
        },
      }
    );
    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized - Please log in',
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    // Get address data from request
    const body = await req.json();

    // Support both naming conventions for flexibility
    const label = body.label;
    const name = body.name;
    const building_number = body.building_number;
    // Accept both 'street' and 'address_line1'
    const street = body.street || body.address_line1;
    // Accept both 'address2' and 'address_line2'
    const address2 = body.address2 || body.address_line2;
    const city = body.city;
    const state = body.state;
    // Accept both 'zip_code' and 'postal_code'
    const zip_code = body.zip_code || body.postal_code;
    const country = body.country;
    const phone = body.phone;
    const latitude = body.latitude;
    const longitude = body.longitude;
    const is_default = body.is_default;

    // Validate required fields
    const missingFields = [];
    if (!label) missingFields.push('label');
    if (!street) missingFields.push('street (or address_line1)');
    if (!city) missingFields.push('city');
    if (!country) missingFields.push('country');

    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Missing required fields: ${missingFields.join(', ')}`,
            details: {
              missing_fields: missingFields,
              received_fields: Object.keys(body),
              example: {
                label: 'Home',
                street: '15 Admiralty Way',
                city: 'Lagos',
                country: 'Nigeria',
              },
            },
          },
          metadata: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
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
    // Insert address with authenticated user's ID
    const { data: address, error: insertError } = await supabaseClient
      .from('user_addresses')
      .insert({
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
        address_type: label?.toLowerCase(), // Also set address_type for consistency
      })
      .select()
      .single();
    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: insertError.message,
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
    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          address,
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
        success: false,
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
