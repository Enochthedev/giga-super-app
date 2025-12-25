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

    // Update participant left_at
    const { error } = await supabase
      .from('call_participants')
      .update({ left_at: new Date().toISOString() })
      .eq('call_id', callId)
      .eq('user_id', user.id);

    if (error) throw error;

    // Check if all participants have left
    const { data: remainingParticipants } = await supabase
      .from('call_participants')
      .select('id')
      .eq('call_id', callId)
      .is('left_at', null);

    // If no one left, end the call
    if (!remainingParticipants || remainingParticipants.length === 0) {
      const { data: call } = await supabase
        .from('calls')
        .select('started_at')
        .eq('id', callId)
        .single();

      const endedAt = new Date().toISOString();
      let durationSeconds = 0;

      if (call?.started_at) {
        const startTime = new Date(call.started_at).getTime();
        const endTime = new Date(endedAt).getTime();
        durationSeconds = Math.floor((endTime - startTime) / 1000);
      }

      await supabase
        .from('calls')
        .update({
          status: 'ended',
          ended_at: endedAt,
          duration_seconds: durationSeconds,
        })
        .eq('id', callId);
    }

    return new Response(JSON.stringify({ success: true, message: 'Left call' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
