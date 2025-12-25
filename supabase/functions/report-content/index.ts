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

    const { contentType, contentId, reason, description } = await req.json();

    if (!contentType || !contentId || !reason) {
      return new Response(
        JSON.stringify({ error: 'Content type, ID, and reason required' }),
        { status: 400 }
      );
    }

    // Create support ticket for content report
    const ticketNumber = `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        ticket_number: ticketNumber,
        user_id: user.id,
        subject: `Content Report: ${contentType}`,
        description: `Reason: ${reason}\n\n${description || ''}`,
        category: 'content_moderation',
        priority: 'high',
        module_name: 'social_media',
        reference_id: contentId,
        status: 'open',
      })
      .select()
      .single();

    if (error) throw error;

    // Log in audit
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'content_reported',
      resource_type: contentType,
      resource_id: contentId,
      new_values: { reason, ticket_id: ticket.id },
    });

    return new Response(JSON.stringify({ success: true, ticket }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
