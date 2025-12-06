// supabase/functions/create-advertiser-profile/index.ts
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

        const { company_name, industry, website } = await req.json();

        if (!company_name) throw new Error('Company name is required');

        // Check if profile already exists
        const { data: existingProfile } = await supabaseClient
            .from('advertiser_profiles')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (existingProfile) {
            return new Response(JSON.stringify({ error: 'Advertiser profile already exists' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const { data, error } = await supabaseClient
            .from('advertiser_profiles')
            .insert({
                user_id: user.id,
                company_name,
                industry,
                website,
                is_verified: false,
                subscription_tier: 'BASIC'
            })
            .select()
            .single();

        if (error) throw error;

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
