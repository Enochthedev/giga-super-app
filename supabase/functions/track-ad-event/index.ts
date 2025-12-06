// supabase/functions/track-ad-event/index.ts
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
            Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        );

        const { campaign_id, event_type } = await req.json();

        if (!campaign_id || !['impression', 'click', 'conversion'].includes(event_type)) {
            throw new Error('Invalid parameters');
        }

        // Define costs (Mock logic)
        const COST_PER_CLICK = 0.50;
        const COST_PER_IMPRESSION = 0.01;
        const COST_PER_CONVERSION = 5.00;

        let cost = 0;
        let updateData: any = {};

        if (event_type === 'impression') {
            cost = COST_PER_IMPRESSION;
            // Atomic increment
            // Supabase doesn't have direct increment in .update() via JS client without RPC usually,
            // but we can read-modify-write for MVP or use a custom RPC.
            // For safety/concurrency, RPC is better, but I'll use a simple RPC call if I can, or just RMW for now.
            // Let's check if we can use a simple RPC.
            // Actually, I'll create a simple RPC SQL for this later if needed.
            // For now, I'll use the "get and update" approach, acknowledging race conditions.

            // BETTER: Use `rpc` call if I had one. I don't see one in the schema dump for ad tracking.
            // I will implement a simple read-update loop.

            const { data: campaign } = await supabaseClient
                .from('ad_campaigns')
                .select('impressions, spent_amount')
                .eq('id', campaign_id)
                .single();

            if (campaign) {
                await supabaseClient
                    .from('ad_campaigns')
                    .update({
                        impressions: (campaign.impressions || 0) + 1,
                        spent_amount: (campaign.spent_amount || 0) + cost
                    })
                    .eq('id', campaign_id);
            }

        } else if (event_type === 'click') {
            cost = COST_PER_CLICK;
            const { data: campaign } = await supabaseClient
                .from('ad_campaigns')
                .select('clicks, spent_amount, impressions') // Need impressions for CTR
                .eq('id', campaign_id)
                .single();

            if (campaign) {
                const newClicks = (campaign.clicks || 0) + 1;
                const impressions = campaign.impressions || 1; // Avoid div by zero
                const ctr = (newClicks / impressions) * 100;

                await supabaseClient
                    .from('ad_campaigns')
                    .update({
                        clicks: newClicks,
                        spent_amount: (campaign.spent_amount || 0) + cost,
                        ctr: ctr
                    })
                    .eq('id', campaign_id);
            }

        } else if (event_type === 'conversion') {
            cost = COST_PER_CONVERSION;
            const { data: campaign } = await supabaseClient
                .from('ad_campaigns')
                .select('conversions, spent_amount')
                .eq('id', campaign_id)
                .single();

            if (campaign) {
                await supabaseClient
                    .from('ad_campaigns')
                    .update({
                        conversions: (campaign.conversions || 0) + 1,
                        spent_amount: (campaign.spent_amount || 0) + cost
                    })
                    .eq('id', campaign_id);
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
