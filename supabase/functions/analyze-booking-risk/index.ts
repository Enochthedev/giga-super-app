import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        );

        const { userId, amount, checkInDate, ipAddress } = await req.json();

        if (!userId || !amount) throw new Error('User ID and Amount are required');

        let riskScore = 0;
        const riskFactors = [];

        // 1. Check User Account Age
        const { data: user } = await supabaseClient.auth.admin.getUserById(userId);
        if (user) {
            const created = new Date(user.created_at);
            const now = new Date();
            const hoursOld = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

            if (hoursOld < 24) {
                riskScore += 30;
                riskFactors.push('New Account (<24h)');
            }
        }

        // 2. Check High Value
        if (amount > 1000) {
            riskScore += 20;
            riskFactors.push('High Value Transaction (>$1000)');
        }
        if (amount > 5000) {
            riskScore += 30; // Additional
            riskFactors.push('Very High Value (>$5000)');
        }

        // 3. Check Booking Velocity (Last 24h)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: recentBookings } = await supabaseClient
            .from('hotel_bookings')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', yesterday);

        if (recentBookings && recentBookings > 3) {
            riskScore += 40;
            riskFactors.push('High Velocity (>3 bookings in 24h)');
        }

        // 4. Determine Status
        let status = 'approved';
        if (riskScore >= 80) status = 'rejected';
        else if (riskScore >= 50) status = 'review';

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    riskScore,
                    status,
                    riskFactors,
                    timestamp: new Date().toISOString()
                }
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
