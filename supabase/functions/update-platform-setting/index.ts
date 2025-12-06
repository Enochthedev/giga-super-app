import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        );

        const {
            data: { user },
            error: userError,
        } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            throw new Error('Unauthorized');
        }

        // Verify user is admin
        const { data: adminProfile } = await supabaseClient
            .from('admin_profiles')
            .select('clearance_level')
            .eq('user_id', user.id)
            .single();

        if (!adminProfile || adminProfile.clearance_level < 4) {
            throw new Error('Admin access required (clearance level 4+)');
        }

        const { category, key, value } = await req.json();

        if (!category || !key || value === undefined) {
            throw new Error('category, key, and value are required');
        }

        // Update or insert setting
        const { data: setting, error: settingError } = await supabaseClient
            .from('platform_settings')
            .upsert({
                category,
                key,
                value: String(value),
                updated_by: user.id,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'category,key'
            })
            .select()
            .single();

        if (settingError) throw settingError;

        return new Response(
            JSON.stringify({
                success: true,
                data: setting,
                message: `Setting ${category}.${key} updated successfully`,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        );
    }
});
