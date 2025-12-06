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

    const { participantIds, conversationType, name, description } = await req.json();

    if (!participantIds || participantIds.length === 0) {
      return new Response(JSON.stringify({ error: "Participants required" }), { status: 400 });
    }

    const type = conversationType || (participantIds.length === 1 ? "direct" : "group");

    // For direct messages, check if conversation already exists
    if (type === "direct") {
      const otherUserId = participantIds[0];
      const { data: existing } = await supabase
        .from("conversations")
        .select(`
          id,
          conversation_participants!inner(user_id)
        `)
        .eq("conversation_type", "direct")
        .eq("conversation_participants.user_id", user.id)
        .eq("conversation_participants.user_id", otherUserId)
        .single();

      if (existing) {
        return new Response(JSON.stringify({ conversation: existing }), { status: 200 });
      }
    }

    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({
        conversation_type: type,
        name: name || null,
        description: description || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Add participants
    const participants = [user.id, ...participantIds].map((userId, index) => ({
      conversation_id: conversation.id,
      user_id: userId,
      role: index === 0 ? "admin" : "member",
    }));

    await supabase
      .from("conversation_participants")
      .insert(participants);

    return new Response(JSON.stringify({ success: true, conversation }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
