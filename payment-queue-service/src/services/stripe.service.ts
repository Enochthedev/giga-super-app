import Stripe from 'stripe';

import { config } from '../config';
import logger from '../utils/logger';

const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: '2023-10-16',
});

export interface StripeCheckoutParams {
  email: string;
  amount: number; // Major currency units (e.g. 1500.00).
  currency: string; // EUR / GBP.
  reference: string;
  callbackUrl: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface StripeCheckoutResult {
  authorizationUrl: string;
  reference: string; // Checkout Session id.
  paymentIntentId: string | null;
}

export const stripeService = {
  /**
   * Create a hosted Stripe Checkout Session and return its URL. Used for the
   * EUR/GBP slice of the routing matrix (Stripe settles those; Paystack cannot).
   */
  async createCheckoutSession(params: StripeCheckoutParams): Promise<StripeCheckoutResult> {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${params.callbackUrl}?reference=${encodeURIComponent(params.reference)}&status=success`,
      cancel_url: `${params.callbackUrl}?reference=${encodeURIComponent(params.reference)}&status=cancelled`,
      client_reference_id: params.reference,
      customer_email: params.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: params.currency.toLowerCase(),
            unit_amount: Math.round(params.amount * 100),
            product_data: { name: params.description || `Payment ${params.reference}` },
          },
        },
      ],
      payment_intent_data: {
        metadata: { reference: params.reference, ...(params.metadata ?? {}) },
      },
      metadata: { reference: params.reference, ...(params.metadata ?? {}) },
    });

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }

    logger.info('Stripe checkout session created', { reference: params.reference, sessionId: session.id });

    return {
      authorizationUrl: session.url,
      reference: session.id,
      paymentIntentId:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent?.id ?? null),
    };
  },
};
