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

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const promoData = await req.json();

        if (!promoData.hotelId || !promoData.code || !promoData.discountValue) {
            throw new Error('Hotel ID, Code, and Discount Value are required');
        }

        // Verify ownership
        const { data: hotel } = await supabaseClient
            .from('hotels')
            .select('host_id')
            .eq('id', promoData.hotelId)
            .single();

        if (!hotel) throw new Error('Hotel not found');
        if (hotel.host_id !== user.id) {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            if (profile?.role !== 'admin') throw new Error('Unauthorized');
        }

        // Create promo code
        const { data: promo, error } = await supabaseClient
            .from('hotel_promo_codes')
            .insert({
                hotel_id: promoData.hotelId,
                code: promoData.code.toUpperCase(),
                description: promoData.description,
                discount_type: promoData.discountType || 'percentage', // percentage or fixed
                discount_value: promoData.discountValue,
                min_spend: promoData.minSpend || 0,
                max_discount: promoData.maxDiscount,
                start_date: promoData.startDate || new Date().toISOString(),
                end_date: promoData.endDate,
                usage_limit: promoData.usageLimit,
                usage_count: 0,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;

        return new Response(
            JSON.stringify({
                success: true,
                data: promo,
                message: 'Promo code created successfully',
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 201,
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
