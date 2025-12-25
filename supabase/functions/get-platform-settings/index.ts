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

    // Parse query parameters
    const url = new URL(req.url);
    const category = url.searchParams.get('category');

    let query = supabaseClient
      .from('platform_settings')
      .select('*')
      .order('category')
      .order('key');

    if (category) {
      query = query.eq('category', category);
    }

    const { data: settings, error: settingsError } = await query;

    if (settingsError) throw settingsError;

    // Group by category for easier consumption
    const grouped: Record<string, Record<string, any>> = {};

    settings?.forEach(setting => {
      if (!grouped[setting.category]) {
        grouped[setting.category] = {};
      }
      grouped[setting.category][setting.key] = {
        value: setting.value,
        value_type: setting.value_type,
        description: setting.description,
        updated_at: setting.updated_at,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          settings: grouped,
          raw: settings, // Also provide raw array
        },
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
