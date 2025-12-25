// supabase/functions/sync-products-to-algolia/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import algoliasearch from 'https://esm.sh/algoliasearch@4';
const algolia = algoliasearch(
  Deno.env.get('ALGOLIA_APP_ID'),
  Deno.env.get('ALGOLIA_ADMIN_KEY')
);
const productsIndex = algolia.initIndex('giga_products');
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { product_id } = await req.json().catch(() => ({}));
    let query = supabaseAdmin
      .from('ecommerce_products')
      .select(
        `
        id,
        name,
        slug,
        description,
        short_description,
        final_price,
        base_price,
        discount_percentage,
        thumbnail,
        images,
        average_rating,
        review_count,
        stock_quantity,
        category:ecommerce_categories(id, name, slug),
        vendor:vendor_id(business_name)
      `
      )
      .eq('is_active', true);
    if (product_id) {
      query = query.eq('id', product_id);
    }
    const { data: products, error } = await query;
    if (error) throw error;
    const algoliaRecords = products.map(product => ({
      objectID: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      short_description: product.short_description,
      price: product.final_price,
      original_price: product.base_price,
      discount: product.discount_percentage,
      image: product.thumbnail,
      images: product.images,
      rating: product.average_rating,
      review_count: product.review_count,
      in_stock: product.stock_quantity > 0,
      category_name: product.category?.name,
      category_slug: product.category?.slug,
      vendor_name: product.vendor?.business_name,
      _tags: [
        product.category?.slug,
        product.stock_quantity > 0 ? 'in_stock' : 'out_of_stock',
        product.discount_percentage > 0 ? 'on_sale' : 'regular',
      ].filter(Boolean),
    }));
    await productsIndex.saveObjects(algoliaRecords);
    if (!product_id) {
      await productsIndex.setSettings({
        searchableAttributes: [
          'name',
          'description',
          'short_description',
          'category_name',
          'vendor_name',
        ],
        attributesForFaceting: [
          'category_slug',
          'vendor_name',
          '_tags',
          'filterOnly(in_stock)',
        ],
        customRanking: ['desc(rating)', 'desc(review_count)'],
      });
    }
    return new Response(
      JSON.stringify({
        success: true,
        synced: products.length,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Algolia sync error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
