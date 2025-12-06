import { createClient } from "npm:@supabase/supabase-js@2.34.0";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false
  }
});
Deno.serve(async (req)=>{
  const url = new URL(req.url);
  const pathname = url.pathname.replace(/\/+$/g, '');
  const method = req.method;
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  async function getUserId() {
    if (!bearer) return null;
    try {
      const { data: userData, error } = await sb.auth.getUser(bearer);
      if (error) return null;
      return userData?.user?.id ?? null;
    } catch (e) {
      console.error('getUserId error', e);
      return null;
    }
  }
  async function getOrCreateCart(user_id, session_id) {
    if (user_id) {
      const { data: carts, error } = await sb.from('ecommerce_carts').select('*').eq('user_id', user_id).limit(1);
      if (error) throw error;
      if (carts?.length) return carts[0];
      const { data, error: err } = await sb.from('ecommerce_carts').insert({
        user_id,
        session_id: session_id ?? null
      }).select().single();
      if (err) throw err;
      return data;
    } else {
      if (!session_id) throw new Error('session_id required for anonymous cart');
      const { data: carts, error } = await sb.from('ecommerce_carts').select('*').eq('session_id', session_id).limit(1);
      if (error) throw error;
      if (carts?.length) return carts[0];
      const { data, error: err } = await sb.from('ecommerce_carts').insert({
        session_id
      }).select().single();
      if (err) throw err;
      return data;
    }
  }
  const route = pathname.split('/').pop();
  try {
    if (route === 'add' && method === 'POST') {
      const body = await req.json();
      // Support either single item fields or items array
      let itemsInput = [];
      if (Array.isArray(body.items)) {
        itemsInput = body.items;
      } else if (body.product_id) {
        itemsInput = [
          {
            product_id: body.product_id,
            variant_id: body.variant_id ?? null,
            quantity: body.quantity ?? 1
          }
        ];
      } else {
        return new Response(JSON.stringify({
          error: 'product_id or items array required'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      const session_id = body.session_id ?? null;
      const promo_code = body.promo_code ?? null;
      if (itemsInput.length === 0) return new Response(JSON.stringify({
        error: 'items array is empty'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (itemsInput.length > 50) return new Response(JSON.stringify({
        error: 'max 50 items per request'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const user_id = await getUserId();
      const cart = await getOrCreateCart(user_id, session_id);
      // Validate all product IDs and variants in a single query
      const productIds = Array.from(new Set(itemsInput.map((i)=>i.product_id)));
      const { data: products } = await sb.from('ecommerce_products').select('id, base_price').in('id', productIds);
      const prodMap = new Map(products?.map((p)=>[
          p.id,
          p
        ]));
      // Collect variant ids if any
      const variantIds = Array.from(new Set(itemsInput.filter((i)=>i.variant_id).map((i)=>i.variant_id)));
      let variantMap = new Map();
      if (variantIds.length) {
        const { data: variants } = await sb.from('ecommerce_product_variants').select('id, price_adjustment, stock_quantity').in('id', variantIds);
        variantMap = new Map(variants?.map((v)=>[
            v.id,
            v
          ]));
      }
      // Fail fast on invalid product/variant
      for (const it of itemsInput){
        if (!it.product_id || !prodMap.has(it.product_id)) return new Response(JSON.stringify({
          error: `product not found: ${it.product_id}`
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        if (it.variant_id && !variantMap.has(it.variant_id)) return new Response(JSON.stringify({
          error: `variant not found: ${it.variant_id}`
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      // attach promo code if present
      if (promo_code) {
        const { data: pc } = await sb.from('ecommerce_promo_codes').select('*').eq('code', promo_code).limit(1);
        if (!pc || !pc.length) return new Response(JSON.stringify({
          error: 'invalid promo code'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        try {
          await sb.from('ecommerce_carts').update({
            promo_code_id: pc[0].id
          }).eq('id', cart.id);
        } catch (e) {
          console.warn('promo attach failed', e);
        }
      }
      // Process each item: insert or increment
      for (const it of itemsInput){
        const quantity = Math.max(1, parseInt(it.quantity ?? 1));
        const product = prodMap.get(it.product_id);
        let price_per_unit = product.base_price ?? null;
        if (it.variant_id) {
          const variant = variantMap.get(it.variant_id);
          price_per_unit = (price_per_unit ?? 0) + (variant.price_adjustment ?? 0);
        }
        // upsert behavior: try update first
        const { data: existing } = await sb.from('ecommerce_cart_items').select('*').eq('cart_id', cart.id).eq('product_id', it.product_id).eq('variant_id', it.variant_id ?? null).limit(1);
        if (existing?.length) {
          const newQty = (existing[0].quantity ?? 0) + quantity;
          const { error: upErr } = await sb.from('ecommerce_cart_items').update({
            quantity: newQty,
            price_per_unit
          }).eq('id', existing[0].id);
          if (upErr) throw upErr;
        } else {
          const insert = {
            cart_id: cart.id,
            product_id: it.product_id,
            variant_id: it.variant_id ?? null,
            quantity,
            price_per_unit
          };
          const { error: insErr } = await sb.from('ecommerce_cart_items').insert(insert);
          if (insErr) throw insErr;
        }
      }
      const { data: items } = await sb.from('ecommerce_cart_items').select('*').eq('cart_id', cart.id);
      return new Response(JSON.stringify({
        cart_id: cart.id,
        items
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    if (route === 'item' && method === 'PATCH') {
      const body = await req.json();
      const { item_id, quantity } = body;
      if (!item_id) return new Response(JSON.stringify({
        error: 'item_id required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (typeof quantity !== 'number' || quantity < 1) return new Response(JSON.stringify({
        error: 'quantity must be a positive integer'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const { data, error } = await sb.from('ecommerce_cart_items').update({
        quantity,
        updated_at: new Date().toISOString()
      }).eq('id', item_id).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({
        item: data
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    if (route === 'item' && method === 'DELETE') {
      const item_id = url.searchParams.get('item_id');
      if (!item_id) return new Response(JSON.stringify({
        error: 'item_id query required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const { error } = await sb.from('ecommerce_cart_items').delete().eq('id', item_id);
      if (error) throw error;
      return new Response(JSON.stringify({
        success: true
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    if (route === 'cart' && method === 'GET') {
      const session_id = url.searchParams.get('session_id');
      const user_id = await getUserId();
      let cart = null;
      if (user_id) {
        const { data: carts } = await sb.from('ecommerce_carts').select('*').eq('user_id', user_id).limit(1);
        cart = carts?.[0] ?? null;
      } else if (session_id) {
        const { data: carts } = await sb.from('ecommerce_carts').select('*').eq('session_id', session_id).limit(1);
        cart = carts?.[0] ?? null;
      }
      if (!cart) return new Response(JSON.stringify({
        cart: null,
        items: []
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const { data: items } = await sb.from('ecommerce_cart_items').select('*').eq('cart_id', cart.id);
      return new Response(JSON.stringify({
        cart,
        items
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    return new Response(JSON.stringify({
      error: 'Not found'
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error('handler error', err);
    return new Response(JSON.stringify({
      error: err.message ?? String(err)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
