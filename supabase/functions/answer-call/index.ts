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

    const { callId } = await req.json();

    if (!callId) {
      return new Response(JSON.stringify({ error: 'Call ID required' }), { status: 400 });
    }

    // Verify user is a participant
    const { data: callParticipant } = await supabase
      .from('call_participants')
      .select('id')
      .eq('call_id', callId)
      .eq('user_id', user.id)
      .single();

    if (!callParticipant) {
      return new Response(JSON.stringify({ error: 'Not a participant of this call' }), {
        status: 403,
      });
    }

    // Get call details
    const { data: call } = await supabase
      .from('calls')
      .select('*')
      .eq('id', callId)
      .single();

    if (!call) {
      return new Response(JSON.stringify({ error: 'Call not found' }), { status: 404 });
    }

    if (call.status !== 'initiated' && call.status !== 'ringing') {
      return new Response(JSON.stringify({ error: 'Call is not available to answer' }), {
        status: 400,
      });
    }

    // Update call status to active if this is the first person joining
    const { data: activeParticipants } = await supabase
      .from('call_participants')
      .select('id')
      .eq('call_id', callId)
      .not('joined_at', 'is', null);

    const isFirstToJoin = activeParticipants?.length === 1; // Only initiator

    if (isFirstToJoin) {
      await supabase
        .from('calls')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .eq('id', callId);
    }

    // Update participant joined_at
    await supabase
      .from('call_participants')
      .update({ joined_at: new Date().toISOString() })
      .eq('call_id', callId)
      .eq('user_id', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        call: {
          ...call,
          status: isFirstToJoin ? 'active' : call.status,
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
