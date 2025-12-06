import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { callId } = await req.json();

    if (!callId) {
      return new Response(JSON.stringify({ error: "Call ID required" }), { status: 400 });
    }

    // Get call details
    const { data: call } = await supabase
      .from("calls")
      .select("*")
      .eq("id", callId)
      .single();

    if (!call) {
      return new Response(JSON.stringify({ error: "Call not found" }), { status: 404 });
    }

    // Verify user is a participant
    const { data: callParticipant } = await supabase
      .from("call_participants")
      .select("id")
      .eq("call_id", callId)
      .eq("user_id", user.id)
      .single();

    if (!callParticipant) {
      return new Response(JSON.stringify({ error: "Not a participant of this call" }), { status: 403 });
    }

    const endedAt = new Date().toISOString();
    let durationSeconds = 0;

    if (call.started_at) {
      const startTime = new Date(call.started_at).getTime();
      const endTime = new Date(endedAt).getTime();
      durationSeconds = Math.floor((endTime - startTime) / 1000);
    }

    // Update call status
    const { error } = await supabase
      .from("calls")
      .update({
        status: "ended",
        ended_at: endedAt,
        duration_seconds: durationSeconds,
      })
      .eq("id", callId);

    if (error) throw error;

    // Update all participants left_at
    await supabase
      .from("call_participants")
      .update({ left_at: endedAt })
      .eq("call_id", callId)
      .is("left_at", null);

    // Create call summary message
    await supabase
      .from("messages")
      .insert({
        conversation_id: call.conversation_id,
        sender_id: user.id,
        message_type: "call_notification",
        content: `${call.call_type === "video" ? "Video" : "Voice"} call ended (${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s)`,
      });

    return new Response(JSON.stringify({
      success: true,
      duration: durationSeconds,
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
