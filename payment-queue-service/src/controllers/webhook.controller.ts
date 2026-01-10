import { Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import logger from '../utils/logger';
import { UnauthorizedError, BadRequestError } from '../utils/errors';
import { addWebhookJob } from '../queues/webhook.queue';

/**
 * POST /api/v1/webhooks/paystack
 * Handle Paystack webhook events
 */
export async function handlePaystackWebhook(req: Request, res: Response) {
  try {
    const signature = req.headers['x-paystack-signature'] as string;

    if (!signature) {
      throw new UnauthorizedError('Missing webhook signature');
    }

    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', config.paystackSecretKey)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== signature) {
      logger.warn('Invalid Paystack webhook signature', {
        expectedPrefix: hash.substring(0, 10),
        receivedPrefix: signature.substring(0, 10),
      });
      throw new UnauthorizedError('Invalid webhook signature');
    }

    const { event, data } = req.body;

    if (!event || !data) {
      throw new BadRequestError('Invalid webhook payload');
    }

    // Add webhook to processing queue
    await addWebhookJob({
      provider: 'paystack',
      event,
      data,
      signature,
      receivedAt: new Date().toISOString(),
    });

    logger.info('Paystack webhook received and queued', {
      event,
      reference: data.reference,
    });

    // Respond immediately to Paystack
    res.status(200).json({
      success: true,
      message: 'Webhook received',
    });
  } catch (error: any) {
    logger.error('Failed to process Paystack webhook', {
      error: error.message,
      headers: req.headers,
    });

    // Still return 200 to prevent retries for invalid webhooks
    if (error instanceof UnauthorizedError) {
      return res.status(200).json({
        success: false,
        message: 'Webhook signature invalid',
      });
    }

    throw error;
  }
}

/**
 * POST /api/v1/webhooks/stripe
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  try {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      throw new UnauthorizedError('Missing webhook signature');
    }

    // Note: In production, use Stripe SDK for proper webhook verification
    // stripe.webhooks.constructEvent(payload, signature, webhookSecret)

    const { type, data } = req.body;

    if (!type || !data) {
      throw new BadRequestError('Invalid webhook payload');
    }

    // Add webhook to processing queue
    await addWebhookJob({
      provider: 'stripe',
      event: type,
      data: data.object,
      signature,
      receivedAt: new Date().toISOString(),
    });

    logger.info('Stripe webhook received and queued', {
      event: type,
      id: data.object?.id,
    });

    // Respond immediately to Stripe
    res.status(200).json({
      success: true,
      message: 'Webhook received',
    });
  } catch (error: any) {
    logger.error('Failed to process Stripe webhook', {
      error: error.message,
      headers: req.headers,
    });

    // Still return 200 to prevent retries for invalid webhooks
    if (error instanceof UnauthorizedError) {
      return res.status(200).json({
        success: false,
        message: 'Webhook signature invalid',
      });
    }

    throw error;
  }
}
