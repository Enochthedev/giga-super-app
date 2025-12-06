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

    // Update call status to declined
    const { error } = await supabase
      .from("calls")
      .update({
        status: "declined",
        ended_at: new Date().toISOString(),
      })
      .eq("id", callId);

    if (error) throw error;

    // Notify initiator
    const { data: call } = await supabase
      .from("calls")
      .select("initiated_by, conversation_id")
      .eq("id", callId)
      .single();

    if (call && call.initiated_by !== user.id) {
      await supabase.from("notification_queue").insert({
        user_id: call.initiated_by,
        template_name: "call_declined",
        variables: {
          decliner_name: user.email,
          call_id: callId,
        },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Call declined" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
