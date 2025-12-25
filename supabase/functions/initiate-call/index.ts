import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Agora token generation (simplified - you'll need the full implementation)
function generateAgoraToken(channelName: string, uid: number): string {
  // This is a placeholder - implement proper Agora token generation
  // You'll need to use Agora's token generation library
  // For now, return a mock token
  return `agora_token_${channelName}_${uid}_${Date.now()}`;
}

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

    const { conversationId, callType, participantIds } = await req.json();

    if (!conversationId || !callType || !participantIds || participantIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
      });
    }

    // Verify user is part of the conversation
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .is('left_at', null)
      .single();

    if (!participant) {
      return new Response(
        JSON.stringify({ error: 'Not a participant of this conversation' }),
        { status: 403 }
      );
    }

    // Generate unique channel name
    const channelName = `call_${conversationId}_${Date.now()}`;

    // Generate Agora token (you'll need to implement proper token generation)
    const agoraToken = generateAgoraToken(
      channelName,
      parseInt(user.id.replace(/-/g, '').substring(0, 8), 16)
    );

    // Create call record
    const { data: call, error: callError } = await supabase
      .from('calls')
      .insert({
        call_type: callType,
        conversation_id: conversationId,
        initiated_by: user.id,
        participants: [user.id, ...participantIds],
        agora_channel: channelName,
        agora_token: agoraToken,
        status: 'initiated',
      })
      .select()
      .single();

    if (callError) throw callError;

    // Add initiator to call_participants
    await supabase.from('call_participants').insert({
      call_id: call.id,
      user_id: user.id,
      role: 'initiator',
      joined_at: new Date().toISOString(),
    });

    // Add other participants
    await supabase.from('call_participants').insert(
      participantIds.map((pid: string) => ({
        call_id: call.id,
        user_id: pid,
        role: 'participant',
      }))
    );

    // Create call notification message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      message_type: 'call_notification',
      content: `${callType === 'video' ? 'Video' : 'Voice'} call started`,
    });

    // Queue notifications for participants
    await supabase.from('notification_queue').insert(
      participantIds.map((pid: string) => ({
        user_id: pid,
        template_name: 'incoming_call',
        variables: {
          caller_name: user.email,
          call_type: callType,
          call_id: call.id,
        },
      }))
    );

    return new Response(JSON.stringify({ success: true, call }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
