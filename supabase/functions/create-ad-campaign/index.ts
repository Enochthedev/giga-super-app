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

    // Check if user is advertiser
    const { data: advertiser } = await supabase
      .from("advertiser_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .single();

    if (!advertiser) {
      return new Response(JSON.stringify({ error: "Not an advertiser" }), { status: 403 });
    }

    const {
      campaignName,
      campaignType,
      description,
      budget,
      dailyBudget,
      startDate,
      endDate,
      targetAudience,
      creativeAssets,
      landingUrl,
    } = await req.json();

    if (!campaignName || !budget || !startDate || !endDate) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const campaignNumber = `AD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const { data: campaign, error } = await supabase
      .from("ad_campaigns")
      .insert({
        campaign_number: campaignNumber,
        advertiser_id: user.id,
        campaign_name: campaignName,
        campaign_type: campaignType || "banner",
        description,
        budget,
        daily_budget: dailyBudget,
        start_date: startDate,
        end_date: endDate,
        target_audience: targetAudience || {},
        creative_assets: creativeAssets || {},
        landing_url: landingUrl,
        status: "pending_approval",
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, campaign }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
