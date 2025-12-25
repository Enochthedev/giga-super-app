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

    const { ticketId, message, attachments, isInternalNote } = await req.json();

    if (!ticketId || !message) {
      return new Response(JSON.stringify({ error: 'Ticket ID and message required' }), {
        status: 400,
      });
    }

    // Check if user has access to this ticket
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('user_id, assigned_to')
      .eq('id', ticketId)
      .single();

    if (!ticket) {
      return new Response(JSON.stringify({ error: 'Ticket not found' }), { status: 404 });
    }

    // Determine sender type
    const { data: staffCheck } = await supabase
      .from('support_staff')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const senderType = staffCheck ? 'staff' : 'customer';

    if (senderType === 'customer' && ticket.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const { data: reply, error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: user.id,
        sender_type: senderType,
        message,
        attachments: attachments || [],
        is_internal_note: isInternalNote || false,
      })
      .select()
      .single();

    if (error) throw error;

    // Update ticket first_response_at if this is first staff response
    if (senderType === 'staff') {
      const { data: existingReplies } = await supabase
        .from('ticket_messages')
        .select('id')
        .eq('ticket_id', ticketId)
        .eq('sender_type', 'staff')
        .limit(1);

      if (existingReplies?.length === 1) {
        await supabase
          .from('support_tickets')
          .update({ first_response_at: new Date().toISOString() })
          .eq('id', ticketId);
      }
    }

    return new Response(JSON.stringify({ success: true, reply }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
