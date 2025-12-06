// supabase/functions/update-user-profile/index.ts
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
    // Authenticate user
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
    // Parse update data
    const updateData = await req.json();
    // Fields that can be updated
    const allowedFields = [
      'first_name',
      'last_name',
      'phone',
      'avatar',
      'date_of_birth',
      'gender',
      'marital_status',
      'body_weight',
      'height',
      'age_group',
      'areas_of_interest'
    ];
    // Filter only allowed fields
    const filteredData = {};
    for (const field of allowedFields){
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }
    // Add updated_at
    filteredData.updated_at = new Date().toISOString();
    // Update profile
    const { data: profile, error: updateError } = await supabaseClient.from('user_profiles').update(filteredData).eq('id', user.id).select().single();
    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Profile update failed: ${updateError.message}`);
    }
    // Update last_login_at if provided
    if (updateData.update_last_login) {
      await supabaseClient.from('user_profiles').update({
        last_login_at: new Date().toISOString()
      }).eq('id', user.id);
    }
    return new Response(JSON.stringify({
      success: true,
      data: profile
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
