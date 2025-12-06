import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Service role for security
    );
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader?.replace('Bearer ', '') ?? '');
    if (userError || !user) {
      throw new Error('Authentication required');
    }
    const params = await req.json();
    // Determine reference ID and module type
    let referenceId = null;
    let moduleType = null;
    if (params.bookingId) {
      referenceId = params.bookingId;
      moduleType = 'hotel_booking';
    } else if (params.orderId) {
      referenceId = params.orderId;
      moduleType = 'ecommerce_order';
    } else if (params.rideId) {
      referenceId = params.rideId;
      moduleType = 'taxi_ride';
    } else if (params.campaignId) {
      referenceId = params.campaignId;
      moduleType = 'ad_campaign';
    } else {
      throw new Error('Must provide bookingId, orderId, rideId, or campaignId');
    }
    console.log(`💰 Releasing escrow for ${moduleType}:`, referenceId);
    // Check if user is admin or the vendor
    const { data: userRole } = await supabaseClient.from('user_roles').select('role_name').eq('user_id', user.id).single();
    const isAdmin = userRole?.role_name === 'ADMIN';
    // ⚡ ATOMIC TRANSACTION: Release escrow
    const { data: result, error: txError } = await supabaseClient.rpc('release_escrow_atomic', {
      p_reference_id: referenceId,
      p_module_type: moduleType,
      p_user_id: user.id,
      p_is_admin: isAdmin,
      p_release_reason: params.releaseReason || 'Service completed'
    });
    if (txError) {
      console.error('Transaction error:', txError);
      throw new Error('Escrow release failed: ' + txError.message);
    }
    console.log('✅ Escrow released:', result);
    return new Response(JSON.stringify({
      success: true,
      message: 'Escrow released successfully',
      data: {
        gross_amount: result.gross_amount,
        commission_amount: result.commission_amount,
        net_amount: result.net_amount,
        vendor_id: result.vendor_id,
        vendor_type: result.vendor_type,
        released_at: result.released_at,
        next_steps: {
          message: 'Funds are now available for payout',
          action: 'Vendor can request payout from their dashboard'
        }
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('❌ Escrow release error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
