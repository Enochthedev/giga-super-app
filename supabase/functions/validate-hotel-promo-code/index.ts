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

        const { promoCode, hotelId, checkInDate, checkOutDate, totalAmount } = await req.json();

        if (!promoCode) {
            throw new Error('Promo code is required');
        }

        // Fetch promo code details
        const { data: promo, error: promoError } = await supabaseClient
            .from('hotel_promo_codes')
            .select('*')
            .eq('code', promoCode.toUpperCase())
            .eq('is_active', true)
            .single();

        if (promoError || !promo) {
            throw new Error('Invalid or inactive promo code');
        }

        // Check expiration
        const now = new Date();
        const validFrom = new Date(promo.valid_from);
        const validUntil = new Date(promo.valid_until);

        if (now < validFrom) {
            throw new Error('Promo code is not yet valid');
        }

        if (now > validUntil) {
            throw new Error('Promo code has expired');
        }

        // Check usage limit
        if (promo.usage_limit && promo.times_used >= promo.usage_limit) {
            throw new Error('Promo code usage limit reached');
        }

        // Check hotel-specific promo
        if (promo.hotel_id && promo.hotel_id !== hotelId) {
            throw new Error('This promo code is not valid for this hotel');
        }

        // Check minimum booking amount
        if (promo.min_booking_amount && totalAmount < promo.min_booking_amount) {
            throw new Error(`Minimum booking amount of $${promo.min_booking_amount} required`);
        }

        // Check maximum discount
        let discountAmount = 0;
        if (promo.discount_type === 'percentage') {
            discountAmount = (totalAmount * promo.discount_value) / 100;
            if (promo.max_discount_amount && discountAmount > promo.max_discount_amount) {
                discountAmount = promo.max_discount_amount;
            }
        } else if (promo.discount_type === 'fixed') {
            discountAmount = promo.discount_value;
        }

        // Check if dates fall within valid dates (if date range specified)
        if (checkInDate && promo.valid_from && promo.valid_until) {
            const checkIn = new Date(checkInDate);
            if (checkIn < validFrom || checkIn > validUntil) {
                throw new Error('Promo code is not valid for your selected dates');
            }
        }

        // Check user-specific limits (if authenticated)
        const { data: { user } } = await supabaseClient.auth.getUser();

        if (user && promo.usage_limit_per_user) {
            const { count } = await supabaseClient
                .from('hotel_promo_code_usage')
                .select('*', { count: 'exact', head: true })
                .eq('promo_code_id', promo.id)
                .eq('user_id', user.id);

            if (count && count >= promo.usage_limit_per_user) {
                throw new Error('You have already used this promo code the maximum number of times');
            }
        }

        const finalAmount = Math.max(0, totalAmount - discountAmount);

        return new Response(
            JSON.stringify({
                success: true,
                valid: true,
                data: {
                    promoCode: promo.code,
                    description: promo.description,
                    discountType: promo.discount_type,
                    discountValue: promo.discount_value,
                    discountAmount: Math.round(discountAmount * 100) / 100,
                    originalAmount: totalAmount,
                    finalAmount: Math.round(finalAmount * 100) / 100,
                    savings: Math.round(discountAmount * 100) / 100,
                    promoId: promo.id,
                    terms: promo.terms_and_conditions,
                },
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
                valid: false,
                error: error.message,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        );
    }
});
