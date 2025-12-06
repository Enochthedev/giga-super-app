// supabase/functions/create-payment-intent/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.0.0';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16'
});
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');
    const { cart_id } = await req.json();
    // Get cart with items
    const { data: cart, error: cartError } = await supabaseClient.from('ecommerce_carts').select(`
        *,
        items:ecommerce_cart_items(
          *,
          product:ecommerce_products(name, images)
        )
      `).eq('id', cart_id).eq('user_id', user.id).single();
    if (cartError || !cart) {
      throw new Error('Cart not found');
    }
    // Calculate amount (convert to cents for Stripe)
    const amount = Math.round(cart.total_amount * 100);
    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'ngn',
      customer: user.email,
      metadata: {
        user_id: user.id,
        cart_id: cart.id
      },
      automatic_payment_methods: {
        enabled: true
      }
    });
    return new Response(JSON.stringify({
      success: true,
      data: {
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        payment_intent_id: paymentIntent.id
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
