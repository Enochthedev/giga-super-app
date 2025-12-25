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

    const {
      subject,
      description,
      category,
      priority,
      module_name,
      reference_id,
      attachments,
    } = await req.json();

    if (!subject || !description) {
      return new Response(JSON.stringify({ error: 'Subject and description required' }), {
        status: 400,
      });
    }

    const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        ticket_number: ticketNumber,
        user_id: user.id,
        subject,
        description,
        category: category || 'general',
        priority: priority || 'medium',
        module_name,
        reference_id,
        attachments: attachments || [],
        status: 'open',
      })
      .select()
      .single();

    if (error) throw error;

    // Send notification to support team
    await supabase.from('notification_queue').insert({
      template_name: 'support_ticket_created',
      variables: {
        ticket_number: ticketNumber,
        subject,
        user_name: user.email,
      },
    });

    return new Response(JSON.stringify({ success: true, ticket }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
