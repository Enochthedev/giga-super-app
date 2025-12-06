import { createClient } from "npm:@supabase/supabase-js@2.31.0";
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const sb = createClient(SUPABASE_URL, SERVICE_KEY);
Deno.serve(async (req)=>{
  try {
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return new Response(JSON.stringify({
      error: 'Unauthorized'
    }), {
      status: 401
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: u, error: ue } = await sb.auth.getUser(token);
    if (ue || !u?.user) return new Response(JSON.stringify({
      error: 'Unauthorized'
    }), {
      status: 401
    });
    const uid = u.user.id;
    // fetch or create cart
    const { data: cart, error: cartErr } = await sb.from('ecommerce_carts').select('id, user_id, subtotal, total_amount, promo_code_id').eq('user_id', uid).limit(1).maybeSingle();
    if (cartErr) return new Response(JSON.stringify({
      error: cartErr.message
    }), {
      status: 500
    });
    let activeCart = cart;
    if (!activeCart) {
      const { data: newCart, error: ncErr } = await sb.from('ecommerce_carts').insert([
        {
          user_id: uid
        }
      ]).select().single();
      if (ncErr) return new Response(JSON.stringify({
        error: ncErr.message
      }), {
        status: 500
      });
      activeCart = newCart;
    }
    // get items
    const { data: items, error: itemsErr } = await sb.from('ecommerce_cart_items').select('id,product_id,variant_id,quantity,price_per_unit,subtotal,added_at').eq('cart_id', activeCart.id);
    if (itemsErr) return new Response(JSON.stringify({
      error: itemsErr.message
    }), {
      status: 500
    });
    const resp = {
      cart: activeCart,
      items
    };
    return new Response(JSON.stringify(resp), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({
      error: 'internal_error'
    }), {
      status: 500
    });
  }
});
