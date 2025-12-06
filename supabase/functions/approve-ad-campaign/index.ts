// supabase/functions/approve-ad-campaign/index.ts
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

        // Check if user is admin
        // This depends on how roles are stored. 
        // Option A: Check `user_roles` table
        // Option B: Check `admin_permissions`
        // I'll use the pattern from `get-user-profile` which checks `user_roles`.

        const { data: roles } = await supabaseClient
            .from('user_roles')
            .select('role_name')
            .eq('user_id', user.id);

        const isAdmin = roles?.some(r => r.role_name === 'ADMIN' || r.role_name === 'SUPER_ADMIN');

        if (!isAdmin) {
            return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const { campaign_id, decision, reason } = await req.json();

        if (!campaign_id || !['approve', 'reject'].includes(decision)) {
            throw new Error('Invalid parameters');
        }

        const newStatus = decision === 'approve' ? 'active' : 'rejected';

        // Update campaign
        const { data: campaign, error: updateError } = await supabaseClient
            .from('ad_campaigns')
            .update({
                status: newStatus,
                rejection_reason: decision === 'reject' ? reason : null,
                approved_by: user.id,
                approved_at: new Date().toISOString()
            })
            .eq('id', campaign_id)
            .select()
            .single();

        if (updateError) throw updateError;

        // Log to admin_approvals
        await supabaseClient
            .from('admin_approvals')
            .insert({
                request_type: 'ad_campaign_approval',
                reference_id: campaign_id,
                reference_type: 'ad_campaigns',
                decided_by: user.id,
                decided_at: new Date().toISOString(),
                status: decision === 'approve' ? 'approved' : 'rejected',
                decision_notes: reason
            });

        return new Response(JSON.stringify(campaign), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
