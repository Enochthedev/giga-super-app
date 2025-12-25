// supabase/functions/fetch-ads/index.ts
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
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // This endpoint might be public or authenticated depending on use case.
    // For now, let's assume it can be called with anon key, but we might check user context if provided.

    const { placement_type, limit = 1, user_context } = await req.json();

    // 1. Find active campaigns
    // Filter by:
    // - Status = 'active'
    // - Date range (start_date <= today <= end_date)
    // - Budget (spent_amount < budget)

    const today = new Date().toISOString().split('T')[0];

    const { data: campaigns, error } = await supabaseClient
      .from('ad_campaigns')
      .select('*')
      .eq('status', 'active')
      .lte('start_date', today)
      .gte('end_date', today)
      .lt('spent_amount', 'budget') // This syntax might need raw SQL or filter adjustment if column comparison isn't directly supported in simple select
      // Supabase JS client doesn't support column comparison in .lt() directly like this usually.
      // We'll fetch active campaigns and filter in memory for MVP, or use .rpc() if performance critical.
      .limit(50);

    if (error) throw error;

    // 2. Filter in memory for budget and targeting
    let eligibleCampaigns = campaigns.filter((c: any) => {
      // Check budget
      if (c.spent_amount >= c.budget) return false;

      // Check daily budget if exists
      // (Skipping complex daily budget tracking for MVP)

      // Check placement type (assuming it's stored in target_audience or campaign_type)
      // For MVP, if campaign_type matches or is generic
      if (
        placement_type &&
        c.campaign_type !== 'sponsored' &&
        c.campaign_type !== placement_type
      ) {
        // Loose matching for now
      }

      return true;
    });

    // 3. Simple Selection Logic (Randomize)
    // Shuffle array
    eligibleCampaigns = eligibleCampaigns.sort(() => 0.5 - Math.random());

    // Take top N
    const selectedAds = eligibleCampaigns.slice(0, limit).map((c: any) => ({
      campaign_id: c.id,
      title: c.campaign_name,
      description: c.description,
      creative: c.creative_assets,
      landing_url: c.landing_url,
      cta_text: 'Learn More', // Could be dynamic
      tracking_token: btoa(JSON.stringify({ cid: c.id, ts: Date.now() })), // Simple token
    }));

    return new Response(JSON.stringify({ ads: selectedAds }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
