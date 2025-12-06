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

        const { hotelId, hotelSlug, page = 1, limit = 10, sortBy = 'recent', minRating, verified } = await req.json();

        if (!hotelId && !hotelSlug) {
            throw new Error('Either hotelId or hotelSlug is required');
        }

        const offset = (page - 1) * limit;

        // Build query
        let query = supabaseClient
            .from('hotel_reviews')
            .select(`
        *,
        user:profiles!hotel_reviews_user_id_fkey(
          id,
          first_name,
          last_name,
          avatar_url
        )
      `, { count: 'exact' })
            .eq('is_approved', true);

        // Filter by hotel
        if (hotelId) {
            query = query.eq('hotel_id', hotelId);
        } else if (hotelSlug) {
            // Get hotel ID from slug first
            const { data: hotel } = await supabaseClient
                .from('hotels')
                .select('id')
                .eq('slug', hotelSlug)
                .single();

            if (!hotel) throw new Error('Hotel not found');
            query = query.eq('hotel_id', hotel.id);
        }

        // Filter by minimum rating
        if (minRating) {
            query = query.gte('rating', minRating);
        }

        // Filter by verified reviews
        if (verified === true) {
            query = query.eq('is_verified', true);
        }

        // Sort reviews
        switch (sortBy) {
            case 'recent':
                query = query.order('created_at', { ascending: false });
                break;
            case 'oldest':
                query = query.order('created_at', { ascending: true });
                break;
            case 'highest_rating':
                query = query.order('rating', { ascending: false }).order('created_at', { ascending: false });
                break;
            case 'lowest_rating':
                query = query.order('rating', { ascending: true }).order('created_at', { ascending: false });
                break;
            case 'most_helpful':
                query = query.order('helpful_count', { ascending: false }).order('created_at', { ascending: false });
                break;
            default:
                query = query.order('created_at', { ascending: false });
        }

        // Pagination
        query = query.range(offset, offset + limit - 1);

        const { data: reviews, error, count } = await query;

        if (error) throw error;

        // Format reviews
        const formattedReviews = reviews.map(review => ({
            id: review.id,
            rating: review.rating,
            ratings: {
                overall: review.rating,
                cleanliness: review.cleanliness_rating,
                comfort: review.comfort_rating,
                location: review.location_rating,
                service: review.service_rating,
                value: review.value_rating,
            },
            title: review.title,
            comment: review.comment,
            images: review.images || [],
            isVerified: review.is_verified,
            isFeatured: review.is_featured,
            helpfulCount: review.helpful_count || 0,
            unhelpfulCount: review.unhelpful_count || 0,
            responseFromHost: review.response_from_host,
            createdAt: review.created_at,
            user: {
                id: review.user?.id,
                name: review.user ? `${review.user.first_name} ${review.user.last_name}`.trim() : 'Anonymous',
                firstName: review.user?.first_name,
                avatar: review.user?.avatar_url,
            },
        }));

        return new Response(
            JSON.stringify({
                success: true,
                data: formattedReviews,
                pagination: {
                    page,
                    limit,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit),
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
                error: error.message,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        );
    }
});
