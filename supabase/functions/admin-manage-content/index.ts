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

    const { contentType, contentId, action, reason } = await req.json();

    let table = '';
    if (contentType === 'post') table = 'social_posts';
    else if (contentType === 'product') table = 'ecommerce_products';
    else if (contentType === 'hotel') table = 'hotels';
    else if (contentType === 'review') table = 'hotel_reviews';
    else
      return new Response(JSON.stringify({ error: 'Invalid content type' }), {
        status: 400,
      });

    if (action === 'remove') {
      const { error } = await supabase
        .from(table)
        .update({ is_active: false })
        .eq('id', contentId);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'content_removed',
        resource_type: contentType,
        resource_id: contentId,
        new_values: { reason },
      });

      return new Response(JSON.stringify({ success: true, message: 'Content removed' }), {
        status: 200,
      });
    }

    if (action === 'restore') {
      const { error } = await supabase
        .from(table)
        .update({ is_active: true })
        .eq('id', contentId);

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, message: 'Content restored' }),
        { status: 200 }
      );
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
