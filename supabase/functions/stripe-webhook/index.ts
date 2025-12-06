// supabase/functions/stripe-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.0.0';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16'
});
serve(async (req)=>{
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET'));
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(JSON.stringify({
      error: 'Invalid signature'
    }), {
      status: 400
    });
  }
  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  try {
    switch(event.type){
      case 'payment_intent.succeeded':
        {
          const paymentIntent = event.data.object;
          const { user_id, cart_id } = paymentIntent.metadata;
          // Get cart items
          const { data: cartItems } = await supabaseAdmin.from('ecommerce_cart_items').select(`
            *,
            product:ecommerce_products(*)
          `).eq('cart_id', cart_id);
          // Get cart
          const { data: cart } = await supabaseAdmin.from('ecommerce_carts').select('*').eq('id', cart_id).single();
          // Create order
          const { data: order, error: orderError } = await supabaseAdmin.from('ecommerce_orders').insert({
            user_id,
            subtotal: cart.subtotal,
            discount_amount: cart.discount_amount,
            tax_amount: cart.tax_amount,
            total_amount: paymentIntent.amount / 100,
            payment_method: 'card',
            payment_status: 'paid',
            payment_provider: 'stripe',
            payment_id: paymentIntent.id,
            paid_at: new Date().toISOString(),
            status: 'confirmed',
            promo_code_id: cart.promo_code_id
          }).select().single();
          if (orderError) throw orderError;
          // Create order items
          const orderItems = cartItems.map((item)=>({
              order_id: order.id,
              product_id: item.product_id,
              variant_id: item.variant_id,
              vendor_id: item.product.vendor_id,
              product_name: item.product.name,
              product_slug: item.product.slug,
              sku: item.product.sku,
              quantity: item.quantity,
              price_per_unit: item.price_per_unit,
              subtotal: item.subtotal,
              product_snapshot: item.product
            }));
          await supabaseAdmin.from('ecommerce_order_items').insert(orderItems);
          // Clear cart
          await supabaseAdmin.from('ecommerce_cart_items').delete().eq('cart_id', cart_id);
          // Send confirmation email
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-order-confirmation`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              order_id: order.id
            })
          });
          console.log('Order created:', order.order_number);
          break;
        }
      case 'payment_intent.payment_failed':
        {
          const paymentIntent = event.data.object;
          console.log('Payment failed:', paymentIntent.id);
          break;
        }
      case 'charge.refunded':
        {
          const charge = event.data.object;
          await supabaseAdmin.from('ecommerce_orders').update({
            payment_status: 'refunded',
            status: 'refunded'
          }).eq('payment_id', charge.payment_intent);
          break;
        }
    }
    return new Response(JSON.stringify({
      received: true
    }), {
      status: 200
    });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500
    });
  }
});
