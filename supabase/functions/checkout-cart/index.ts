import { createClient } from 'npm:@supabase/supabase-js@2.31.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

interface CheckoutRequest {
  address_id?: string;
  payment_method: 'card' | 'wallet' | 'bank_transfer' | 'cash';
  use_wallet_balance?: boolean;
  coupon_code?: string;
  delivery_notes?: string;
}

Deno.serve(async req => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await sb.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email || '';

    // Parse request body
    const body: CheckoutRequest = await req.json();
    const {
      address_id: requestedAddressId,
      payment_method = 'card',
      use_wallet_balance = false,
      coupon_code,
      delivery_notes,
    } = body;

    // ─── RESOLVE SHIPPING ADDRESS ─────────────────────────────────────────────
    // Priority: 1) address_id sent by client  2) user's default address  3) null
    let resolvedAddressId: string | null = null;

    if (requestedAddressId) {
      // Validate the provided address belongs to this user
      const { data: address } = await sb
        .from('user_addresses')
        .select('id')
        .eq('id', requestedAddressId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!address) {
        return new Response(JSON.stringify({ error: 'Invalid shipping address' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      resolvedAddressId = address.id;
    } else {
      // No address provided — try to find the default address
      const { data: defaultAddress } = await sb
        .from('user_addresses')
        .select('id, label, street, city, state')
        .eq('user_id', userId)
        .eq('is_default', true)
        .maybeSingle();

      if (defaultAddress) {
        resolvedAddressId = defaultAddress.id;
      } else {
        // No default — fall back to the most recently added address
        const { data: latestAddress } = await sb
          .from('user_addresses')
          .select('id, label, street, city, state')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestAddress) {
          resolvedAddressId = latestAddress.id;
        }
        // If still null — user has no addresses saved, order proceeds with null
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Get user's cart
    const { data: cart, error: cartError } = await sb
      .from('ecommerce_carts')
      .select('id, user_id, promo_code_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (cartError) {
      return new Response(JSON.stringify({ error: cartError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!cart) {
      return new Response(JSON.stringify({ error: 'Cart not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get cart items with product details
    const { data: cartItems, error: itemsError } = await sb
      .from('ecommerce_cart_items')
      .select(
        `
        id,
        product_id,
        variant_id,
        quantity,
        price_per_unit,
        ecommerce_products(id, name, slug, vendor_id)
      `
      )
      .eq('cart_id', cart.id);

    if (itemsError) {
      return new Response(JSON.stringify({ error: itemsError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!cartItems || cartItems.length === 0) {
      return new Response(JSON.stringify({ error: 'Cart is empty' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Calculate subtotal
    let subtotal = 0;
    for (const item of cartItems) {
      subtotal += (item.price_per_unit || 0) * (item.quantity || 0);
    }

    // Validate and apply coupon code
    let discount = 0;
    let appliedPromoId = cart.promo_code_id;
    let appliedPromoCode: string | null = null;

    if (coupon_code) {
      const { data: promo, error: promoError } = await sb
        .from('marketplace_promo_codes')
        .select('*')
        .eq('code', coupon_code.toUpperCase())
        .maybeSingle();

      if (promoError || !promo) {
        return new Response(JSON.stringify({ error: 'Invalid coupon code' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const now = new Date();
      if (promo.start_date && new Date(promo.start_date) > now) {
        return new Response(JSON.stringify({ error: 'Coupon not yet active' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (promo.end_date && new Date(promo.end_date) < now) {
        return new Response(JSON.stringify({ error: 'Coupon has expired' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (promo.min_order_amount && subtotal < promo.min_order_amount) {
        return new Response(
          JSON.stringify({ error: `Minimum order amount is ${promo.min_order_amount}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (
        promo.usage_limit &&
        (promo.usage_count || promo.times_used || 0) >= promo.usage_limit
      ) {
        return new Response(JSON.stringify({ error: 'Coupon usage limit reached' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (promo.discount_type === 'percentage') {
        discount = subtotal * (promo.discount_value / 100);
        if (promo.max_discount_amount)
          discount = Math.min(discount, promo.max_discount_amount);
      } else if (promo.discount_type === 'fixed') {
        discount = promo.discount_value;
      }
      discount = Math.min(discount, subtotal);
      appliedPromoId = promo.id;
      appliedPromoCode = promo.code;
    } else if (appliedPromoId) {
      const { data: existingPromo } = await sb
        .from('marketplace_promo_codes')
        .select('*')
        .eq('id', appliedPromoId)
        .maybeSingle();

      if (existingPromo) {
        if (existingPromo.discount_type === 'percentage') {
          discount = subtotal * (existingPromo.discount_value / 100);
          if (existingPromo.max_discount_amount)
            discount = Math.min(discount, existingPromo.max_discount_amount);
        } else if (existingPromo.discount_type === 'fixed') {
          discount = existingPromo.discount_value;
        }
        discount = Math.min(discount, subtotal);
        appliedPromoCode = existingPromo.code;
      }
    }

    const totalAfterDiscount = subtotal - discount;
    let amountToPay = totalAfterDiscount;

    // Handle wallet balance deduction
    let walletDeduction = 0;
    if (use_wallet_balance) {
      const { data: wallet } = await sb
        .from('user_wallets')
        .select('id, balance')
        .eq('user_id', userId)
        .maybeSingle();

      if (wallet && wallet.balance > 0) {
        walletDeduction = Math.min(wallet.balance, amountToPay);
        amountToPay -= walletDeduction;
      }
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Determine payment & order status
    const isCashOnDelivery = payment_method === 'cash';
    const paymentStatus = isCashOnDelivery
      ? 'pending'
      : amountToPay > 0
        ? 'pending'
        : 'paid';
    const orderStatus = isCashOnDelivery
      ? 'confirmed'
      : amountToPay > 0
        ? 'pending_payment'
        : 'confirmed';

    // Create order
    const { data: order, error: orderError } = await sb
      .from('ecommerce_orders')
      .insert({
        user_id: userId,
        order_number: orderNumber,
        status: orderStatus,
        subtotal,
        discount_amount: discount,
        total_amount: totalAfterDiscount,
        shipping_address_id: resolvedAddressId,
        promo_code_id: appliedPromoId || null,
        promo_code: appliedPromoCode,
        payment_method,
        payment_status: paymentStatus,
        customer_notes: delivery_notes || null,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order', details: orderError.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create order items
    const orderItems = cartItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      variant_id: item.variant_id || null,
      quantity: item.quantity,
      price_per_unit: item.price_per_unit,
      subtotal: (item.price_per_unit || 0) * (item.quantity || 0),
      product_name: item.ecommerce_products?.name || 'Unknown Product',
      product_slug: item.ecommerce_products?.slug || item.product_id,
      vendor_id: item.ecommerce_products?.vendor_id || null,
    }));

    const { error: orderItemsError } = await sb
      .from('ecommerce_order_items')
      .insert(orderItems);

    if (orderItemsError) {
      console.error('Order items error:', orderItemsError);
      await sb.from('ecommerce_orders').delete().eq('id', order.id);
      return new Response(
        JSON.stringify({
          error: 'Failed to create order items',
          details: orderItemsError.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Deduct wallet balance if used
    if (walletDeduction > 0) {
      const { data: wallet } = await sb
        .from('user_wallets')
        .select('id, balance')
        .eq('user_id', userId)
        .single();

      if (wallet) {
        await sb
          .from('user_wallets')
          .update({ balance: wallet.balance - walletDeduction })
          .eq('id', wallet.id);
        await sb.from('wallet_transactions').insert({
          wallet_id: wallet.id,
          transaction_type: 'debit',
          amount: walletDeduction,
          description: `Payment for order ${orderNumber}`,
          reference_id: order.id,
          reference_type: 'ecommerce_order',
          balance_before: wallet.balance,
          balance_after: wallet.balance - walletDeduction,
        });
      }
    }

    // Create payment record (skip for cash on delivery)
    let paymentRecord = null;
    if (amountToPay > 0 && !isCashOnDelivery) {
      const { data: payment, error: paymentError } = await sb
        .from('payments')
        .insert({
          payment_type: 'ecommerce',
          reference_id: order.id,
          user_id: userId,
          amount: amountToPay,
          currency: 'NGN',
          payment_method,
          payment_status: 'pending',
          metadata: {
            order_number: orderNumber,
            customer_email: userEmail,
            wallet_deduction: walletDeduction,
            original_total: totalAfterDiscount,
          },
        })
        .select()
        .single();

      if (!paymentError && payment) {
        paymentRecord = payment;
        await sb
          .from('ecommerce_orders')
          .update({ payment_id: payment.id })
          .eq('id', order.id);
      }
    }

    // Update promo code usage
    if (appliedPromoId && discount > 0) {
      const { data: promoData } = await sb
        .from('marketplace_promo_codes')
        .select('usage_count')
        .eq('id', appliedPromoId)
        .single();

      if (promoData) {
        await sb
          .from('marketplace_promo_codes')
          .update({ usage_count: (promoData.usage_count || 0) + 1 })
          .eq('id', appliedPromoId);
      }

      await sb
        .from('marketplace_promo_code_usage')
        .insert({
          promo_code_id: appliedPromoId,
          user_id: userId,
          order_id: order.id,
          discount_amount: discount,
        })
        .catch(() => {});
    }

    // Clear cart
    await sb.from('ecommerce_cart_items').delete().eq('cart_id', cart.id);
    await sb
      .from('ecommerce_carts')
      .update({ promo_code_id: null, subtotal: 0, total_amount: 0 })
      .eq('id', cart.id);

    // Build response
    const response: any = {
      success: true,
      order: {
        id: order.id,
        order_number: orderNumber,
        status: orderStatus,
        subtotal,
        discount,
        wallet_deduction: walletDeduction,
        total_amount: totalAfterDiscount,
        amount_to_pay: amountToPay,
        shipping_address_id: resolvedAddressId,
        address_auto_selected: !requestedAddressId && resolvedAddressId !== null,
        item_count: cartItems.length,
        created_at: order.created_at,
      },
    };

    if (isCashOnDelivery) {
      response.payment = {
        required: false,
        payment_method: 'cash',
        message: 'Cash on delivery — payment will be collected upon receipt',
        amount_due: amountToPay,
        currency: 'NGN',
      };
    } else if (amountToPay > 0) {
      response.payment = {
        required: true,
        payment_id: paymentRecord?.id || null,
        amount: amountToPay,
        currency: 'NGN',
        payment_method,
        payment_service: {
          endpoint: '/api/payments',
          payload: {
            module: 'ecommerce',
            amount: amountToPay,
            currency: 'NGN',
            userId,
            branchId: 'ecommerce',
            stateId: 'checkout',
            metadata: {
              moduleTransactionId: order.id,
              customerEmail: userEmail,
              orderNumber,
              paymentId: paymentRecord?.id || null,
            },
          },
        },
      };
    } else {
      response.payment = {
        required: false,
        message:
          walletDeduction > 0
            ? 'Order fully paid with wallet balance'
            : 'Order total is zero (fully discounted)',
      };
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Checkout error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
