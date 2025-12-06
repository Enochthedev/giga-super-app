// supabase/functions/get-ad-analytics/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) throw new Error('Unauthorized');

        const url = new URL(req.url);
        const campaign_id = url.searchParams.get('campaign_id');

        // Get advertiser profile
        const { data: advertiser } = await supabaseClient
            .from('advertiser_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!advertiser) throw new Error('Advertiser profile not found');

        let query = supabaseClient
            .from('ad_campaigns')
            .select('id, campaign_name, impressions, clicks, conversions, ctr, spent_amount, budget, status, start_date, end_date')
            .eq('advertiser_id', advertiser.id);

        if (campaign_id) {
            query = query.eq('id', campaign_id);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Calculate some derived metrics if needed
        const analytics = data.map(campaign => ({
            ...campaign,
            remaining_budget: campaign.budget - (campaign.spent_amount || 0),
            cpc: campaign.clicks > 0 ? (campaign.spent_amount / campaign.clicks).toFixed(2) : 0,
            cpm: campaign.impressions > 0 ? ((campaign.spent_amount / campaign.impressions) * 1000).toFixed(2) : 0
        }));

        return new Response(JSON.stringify(analytics), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
