// supabase/functions/apply-vendor/index.ts
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
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');
    const { business_name, business_registration, tax_id, bank_details } = await req.json();
    // Check if already a vendor
    const { data: existingVendor } = await supabaseClient.from('ecommerce_vendors').select('id').eq('id', user.id).single();
    if (existingVendor) {
      return new Response(JSON.stringify({
        error: 'You are already a vendor'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Create vendor (use service role to bypass RLS)
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: vendor, error } = await supabaseAdmin.from('ecommerce_vendors').insert({
      id: user.id,
      business_name,
      business_registration,
      tax_id,
      bank_name: bank_details.bank_name,
      account_number: bank_details.account_number,
      account_name: bank_details.account_name,
      is_verified: false,
      is_active: false
    }).select().single();
    if (error) throw error;
    // Add VENDOR role
    await supabaseAdmin.from('user_roles').insert({
      user_id: user.id,
      role_name: 'VENDOR'
    });
    return new Response(JSON.stringify({
      success: true,
      message: 'Vendor application submitted',
      data: {
        vendor
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
