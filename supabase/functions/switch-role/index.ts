// supabase/functions/switch-role/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization'),
          },
        },
      }
    );
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    const { role } = await req.json();
    if (!role) {
      return new Response(
        JSON.stringify({
          error: 'Missing role parameter',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    // Check if user has this role
    const { data: userRole, error: checkError } = await supabaseClient
      .from('user_roles')
      .select('role_name')
      .eq('user_id', user.id)
      .eq('role_name', role)
      .eq('is_active', true)
      .single();
    if (checkError || !userRole) {
      return new Response(
        JSON.stringify({
          error: 'User does not have this role',
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    // Update active role
    const { error: updateError } = await supabaseClient
      .from('user_active_roles')
      .update({
        active_role: role,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);
    if (updateError) throw updateError;
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          active_role: role,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
