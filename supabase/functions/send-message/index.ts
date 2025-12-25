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

    const { conversationId, messageType, content, mediaUrl, replyToId } =
      await req.json();

    if (!conversationId) {
      return new Response(JSON.stringify({ error: 'Conversation ID required' }), {
        status: 400,
      });
    }

    // Verify user is participant
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .is('left_at', null)
      .single();

    if (!participant) {
      return new Response(JSON.stringify({ error: 'Not a participant' }), {
        status: 403,
      });
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        message_type: messageType || 'text',
        content: content || null,
        media_url: mediaUrl || null,
        reply_to_id: replyToId || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Update conversation last message
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_text: content || `Sent a ${messageType}`,
        last_message_sender: user.id,
      })
      .eq('id', conversationId);

    // Get other participants for notifications
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', user.id)
      .is('left_at', null);

    if (participants && participants.length > 0) {
      await supabase.from('notification_queue').insert(
        participants.map(p => ({
          user_id: p.user_id,
          template_name: 'new_message',
          variables: {
            sender_name: user.email,
            conversation_id: conversationId,
          },
        }))
      );
    }

    return new Response(JSON.stringify({ success: true, message }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
