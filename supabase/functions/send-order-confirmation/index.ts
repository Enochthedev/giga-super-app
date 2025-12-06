// supabase/functions/send-order-confirmation/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';
const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
serve(async (req)=>{
  try {
    const { order_id } = await req.json();
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Get order details
    const { data: order } = await supabaseAdmin.from('ecommerce_orders').select(`
        *,
        user:user_profiles(email, first_name, last_name),
        items:ecommerce_order_items(
          *,
          product:ecommerce_products(name, thumbnail)
        )
      `).eq('id', order_id).single();
    if (!order) throw new Error('Order not found');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
          .order-details { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .item { display: flex; padding: 10px 0; border-bottom: 1px solid #eee; }
          .item img { width: 60px; height: 60px; object-fit: cover; margin-right: 15px; }
          .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 20px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed! 🎉</h1>
          </div>
          
          <p>Hi ${order.user.first_name},</p>
          <p>Thank you for your order! Your order <strong>#${order.order_number}</strong> has been confirmed.</p>
          
          <div class="order-details">
            <h2>Order Details</h2>
            ${order.items.map((item)=>`
              <div class="item">
                <img src="${item.product.thumbnail}" alt="${item.product.name}">
                <div>
                  <strong>${item.product.name}</strong><br>
                  Quantity: ${item.quantity} × ₦${item.price_per_unit.toLocaleString()}<br>
                  <strong>₦${item.subtotal.toLocaleString()}</strong>
                </div>
              </div>
            `).join('')}
            
            <div class="total">
              Total: ₦${order.total_amount.toLocaleString()}
            </div>
          </div>
          
          <center>
            <a href="https://giga.app/orders/${order.id}" class="button">
              Track Your Order
            </a>
          </center>
          
          <p>We'll send you another email when your order ships.</p>
          <p>Thanks for shopping with Giga!</p>
        </div>
      </body>
      </html>
    `;
    await resend.emails.send({
      from: 'Giga <orders@giga.app>',
      to: order.user.email,
      subject: `Order Confirmed - ${order.order_number}`,
      html
    });
    // Also send SMS
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: order.user.phone,
        type: 'order_confirmed',
        message: order.order_number
      })
    });
    return new Response(JSON.stringify({
      success: true
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Email error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
