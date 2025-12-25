import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role_name')
      .eq('user_id', user.id);

    if (!roles?.some(r => r.role_name === 'ADMIN')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const { action, vendorId, updates } = await req.json();

    if (action === 'verify') {
      const { error } = await supabase
        .from('ecommerce_vendors')
        .update({ is_verified: true, verified_at: new Date().toISOString() })
        .eq('id', vendorId);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: 'Vendor verified' }), {
        status: 200,
      });
    }

    if (action === 'suspend') {
      const { error } = await supabase
        .from('ecommerce_vendors')
        .update({ is_active: false })
        .eq('id', vendorId);

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, message: 'Vendor suspended' }),
        { status: 200 }
      );
    }

    if (action === 'update_commission') {
      const { error } = await supabase
        .from('ecommerce_vendors')
        .update({ commission_rate: updates.commission_rate })
        .eq('id', vendorId);

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, message: 'Commission updated' }),
        { status: 200 }
      );
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
