import { createClient } from 'npm:@supabase/supabase-js@2.31.0';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

Deno.serve(async req => {
  try {
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer '))
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });

    const token = authHeader.replace('Bearer ', '');
    const { data: u, error: ue } = await sb.auth.getUser(token);
    if (ue || !u?.user)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });

    const uid = u.user.id;

    // fetch or create cart
    const { data: cart, error: cartErr } = await sb
      .from('ecommerce_carts')
      .select('id, user_id, subtotal, total_amount, promo_code_id')
      .eq('user_id', uid)
      .limit(1)
      .maybeSingle();

    if (cartErr)
      return new Response(JSON.stringify({ error: cartErr.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });

    let activeCart = cart;
    if (!activeCart) {
      const { data: newCart, error: ncErr } = await sb
        .from('ecommerce_carts')
        .insert([{ user_id: uid }])
        .select()
        .single();
      if (ncErr)
        return new Response(JSON.stringify({ error: ncErr.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      activeCart = newCart;
    }

    // get items with product details
    const { data: items, error: itemsErr } = await sb
      .from('ecommerce_cart_items')
      .select(
        `
        id,
        product_id,
        variant_id,
        quantity,
        price_per_unit,
        subtotal,
        added_at,
        ecommerce_products(name, images, slug)
      `
      )
      .eq('cart_id', activeCart.id);

    if (itemsErr)
      return new Response(JSON.stringify({ error: itemsErr.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });

    // Calculate totals from items
    let calculatedSubtotal = 0;
    const transformedItems = (items || []).map(item => {
      const itemSubtotal = (item.price_per_unit || 0) * (item.quantity || 0);
      calculatedSubtotal += itemSubtotal;
      return {
        ...item,
        variant_id: item.variant_id ?? '',
        subtotal: itemSubtotal,
        product: item.ecommerce_products || null,
        ecommerce_products: undefined, // Remove the nested object
      };
    });

    // Get promo code discount if applied
    let discount = 0;
    let promoCode = null;
    if (activeCart.promo_code_id) {
      const { data: promo } = await sb
        .from('marketplace_promo_codes')
        .select('code, discount_type, discount_value, min_order_amount')
        .eq('id', activeCart.promo_code_id)
        .single();

      if (promo) {
        promoCode = promo;
        if (promo.discount_type === 'percentage') {
          discount = calculatedSubtotal * (promo.discount_value / 100);
        } else if (promo.discount_type === 'fixed') {
          discount = promo.discount_value;
        }
        // Ensure discount doesn't exceed subtotal
        discount = Math.min(discount, calculatedSubtotal);
      }
    }

    const totalAmount = calculatedSubtotal - discount;

    // Update cart totals in database
    await sb
      .from('ecommerce_carts')
      .update({
        subtotal: calculatedSubtotal,
        total_amount: totalAmount,
      })
      .eq('id', activeCart.id);

    const resp = {
      cart: {
        ...activeCart,
        subtotal: calculatedSubtotal,
        total_amount: totalAmount,
        discount: discount,
        promo_code: promoCode,
        item_count: transformedItems.length,
        total_items: transformedItems.reduce((sum, item) => sum + item.quantity, 0),
      },
      items: transformedItems,
    };

    return new Response(JSON.stringify(resp), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
