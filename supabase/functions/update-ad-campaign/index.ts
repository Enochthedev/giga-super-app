// supabase/functions/update-ad-campaign/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { campaign_id, ...updates } = await req.json();

    if (!campaign_id) throw new Error('Campaign ID is required');

    // Verify ownership via advertiser profile
    const { data: advertiser } = await supabaseClient
      .from('advertiser_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!advertiser) throw new Error('Advertiser profile not found');

    // Check if campaign belongs to advertiser
    const { data: campaign, error: fetchError } = await supabaseClient
      .from('ad_campaigns')
      .select('id, status')
      .eq('id', campaign_id)
      .eq('advertiser_id', advertiser.id)
      .single();

    if (fetchError || !campaign) throw new Error('Campaign not found or access denied');

    // Prevent updates to certain fields if campaign is not draft (optional logic, keeping simple for now)
    // For now, allow updates but maybe reset approval if critical fields change?
    // Let's just allow updates for MVP.

    // Filter allowed fields
    const allowedUpdates = [
      'campaign_name',
      'description',
      'budget',
      'daily_budget',
      'start_date',
      'end_date',
      'target_audience',
      'creative_assets',
      'landing_url',
      'status',
    ];

    const filteredUpdates: any = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    // If status is being changed to 'pending_approval', we might want to trigger something?
    // For now just update.

    const { data, error } = await supabaseClient
      .from('ad_campaigns')
      .update(filteredUpdates)
      .eq('id', campaign_id)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
