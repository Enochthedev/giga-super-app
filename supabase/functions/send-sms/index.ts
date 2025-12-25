// supabase/functions/send-sms/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
serve(async req => {
  try {
    const { to, type, message } = await req.json();
    if (!to) {
      return new Response(
        JSON.stringify({
          error: 'Phone number required',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
    const templates = {
      order_confirmed: orderNumber =>
        `Your Giga order ${orderNumber} is confirmed! Track: https://giga.app/track/${orderNumber}`,
      order_shipped: (orderNumber, tracking) =>
        `Your order ${orderNumber} has shipped! Track: ${tracking}`,
      order_delivered: orderNumber =>
        `Your order ${orderNumber} has been delivered! Enjoy 🎉`,
      otp: code => `Your Giga verification code: ${code}. Valid for 10 minutes.`,
    };
    const smsBody = templates[type]?.(message) || message;
    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${Deno.env.get('TWILIO_ACCOUNT_SID')}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization:
            `Basic ${ 
            btoa(
              `${Deno.env.get('TWILIO_ACCOUNT_SID')}:${Deno.env.get('TWILIO_AUTH_TOKEN')}`
            )}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: Deno.env.get('TWILIO_PHONE_NUMBER'),
          Body: smsBody,
        }),
      }
    );
    const result = await twilioResponse.json();
    return new Response(
      JSON.stringify({
        success: true,
        message_sid: result.sid,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('SMS error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
