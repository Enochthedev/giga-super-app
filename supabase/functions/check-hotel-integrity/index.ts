import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all hotels and profiles
    const { data: hotels, error: hotelsError } = await supabaseClient
      .from('hotels')
      .select('id, name, host_id');

    if (hotelsError) throw hotelsError;

    const { data: profiles, error: profilesError } = await supabaseClient
      .from('host_profiles')
      .select('id, user_id');

    if (profilesError) throw profilesError;

    // Check each hotel for data integrity issues
    const issues = [];
    const stats = {
      total_hotels: hotels?.length || 0,
      correct: 0,
      using_profile_id: 0,
      orphaned: 0,
    };

    for (const hotel of hotels || []) {
      const profileByUserId = profiles?.find(p => p.user_id === hotel.host_id);
      const profileById = profiles?.find(p => p.id === hotel.host_id);

      if (profileByUserId) {
        // ✅ Correct - hotel.host_id matches a profile.user_id
        stats.correct++;
      } else if (profileById) {
        // ❌ Wrong pattern - hotel.host_id matches profile.id (should be user_id)
        stats.using_profile_id++;
        issues.push({
          hotel_id: hotel.id,
          hotel_name: hotel.name,
          current_host_id: hotel.host_id,
          correct_user_id: profileById.user_id,
          issue: 'USING_PROFILE_ID',
          description: 'Hotel.host_id is storing profile.id instead of user_id',
          fix_sql: `UPDATE hotels SET host_id = '${profileById.user_id}' WHERE id = '${hotel.id}';`,
        });
      } else {
        // ❌ Orphaned - host_id doesn't match ANY profile
        stats.orphaned++;
        issues.push({
          hotel_id: hotel.id,
          hotel_name: hotel.name,
          current_host_id: hotel.host_id,
          issue: 'ORPHANED',
          description: 'No matching host_profile found (neither by user_id nor id)',
          fix_sql: `-- Manual review needed: DELETE FROM hotels WHERE id = '${hotel.id}';`,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        issues,
        has_problems: issues.length > 0,
        recommendations:
          issues.length > 0
            ? [
                `Found ${stats.using_profile_id} hotels using wrong pattern (profile.id instead of user_id)`,
                `Found ${stats.orphaned} orphaned hotels with no matching profile`,
                'Deploy fix-hotel-data function to automatically fix issues',
                'Or run the fix SQL queries manually in Supabase SQL Editor',
              ]
            : [
                '✅ All hotels are correctly configured!',
                `All ${stats.correct} hotels correctly reference host_profiles.user_id`,
              ],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
