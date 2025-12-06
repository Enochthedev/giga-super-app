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

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role_name")
      .eq("user_id", user.id);

    if (!roles?.some(r => r.role_name === "ADMIN")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const { campaignId, action, rejectionReason } = await req.json();

    if (!campaignId || !action) {
      return new Response(JSON.stringify({ error: "Campaign ID and action required" }), { status: 400 });
    }

    if (action === "approve") {
      const { error } = await supabase
        .from("ad_campaigns")
        .update({
          status: "active",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, message: "Campaign approved" }), { status: 200 });
    }

    if (action === "reject") {
      const { error } = await supabase
        .from("ad_campaigns")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, message: "Campaign rejected" }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
