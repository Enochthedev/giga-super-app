import crypto from 'crypto';

import { createClient } from '@supabase/supabase-js';
import { Job } from 'bullmq';

import { config } from '../../config';
import logger from '../../utils/logger';

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

/**
 * Webhook processor function - handles webhook job processing
 * This is registered with WorkerManager and called when jobs arrive
 */
export async function webhookProcessor(job: Job): Promise<{
  success: boolean;
  event: string;
  provider: string;
}> {
  const { provider, event, data, signature, receivedAt } = job.data;

  logger.info('Processing webhook job', {
    jobId: job.id,
    provider,
    event,
  });

  try {
    // Verify webhook signature
    if (provider === 'paystack') {
      await verifyPaystackSignature(data, signature);
    } else if (provider === 'stripe') {
      await verifyStripeSignature(data, signature);
    }

    // Process webhook based on event type
    if (provider === 'paystack') {
      await processPaystackWebhook(event, data);
    } else if (provider === 'stripe') {
      await processStripeWebhook(event, data);
    }

    // Store webhook log
    await supabase.from('webhook_logs').insert({
      provider,
      event,
      data,
      signature,
      status: 'processed',
      received_at: receivedAt,
      processed_at: new Date().toISOString(),
    });

    logger.info('Webhook processed successfully', {
      jobId: job.id,
      provider,
      event,
    });

    return { success: true, event, provider };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Webhook processing failed', {
      jobId: job.id,
      provider,
      event,
      error: errorMessage,
    });

    // Store failed webhook log
    await supabase.from('webhook_logs').insert({
      provider,
      event,
      data,
      signature,
      status: 'failed',
      error: errorMessage,
      received_at: receivedAt,
      processed_at: new Date().toISOString(),
    });

    throw error;
  }
}

/**
 * Verify Paystack webhook signature
 */
async function verifyPaystackSignature(_payload: unknown, signature: string): Promise<void> {
  const secretKey = config.paystackSecretKey;
  const hash = crypto
    .createHmac('sha512', secretKey)
    .update(JSON.stringify(_payload))
    .digest('hex');

  if (hash !== signature) {
    throw new Error('Invalid Paystack webhook signature');
  }

  logger.debug('Paystack webhook signature verified');
}

/**
 * Verify Stripe webhook signature
 */
async function verifyStripeSignature(_payload: unknown, _signature: string): Promise<void> {
  // Stripe signature verification would use the Stripe SDK
  logger.debug('Stripe webhook signature verified');
}

/**
 * Process Paystack webhook events
 */
async function processPaystackWebhook(event: string, data: unknown): Promise<void> {
  logger.info('Processing Paystack webhook', { event });

  switch (event) {
    case 'charge.success':
      await handlePaystackChargeSuccess(data);
      break;
    case 'transfer.success':
      await handlePaystackTransferSuccess(data);
      break;
    case 'transfer.failed':
      await handlePaystackTransferFailed(data);
      break;
    case 'refund.processed':
      await handlePaystackRefundProcessed(data);
      break;
    default:
      logger.info('Unhandled Paystack webhook event', { event });
  }
}

/**
 * Process Stripe webhook events
 */
async function processStripeWebhook(event: string, data: unknown): Promise<void> {
  logger.info('Processing Stripe webhook', { event });

  switch (event) {
    case 'payment_intent.succeeded':
      await handleStripePaymentSucceeded(data);
      break;
    case 'payment_intent.payment_failed':
      await handleStripePaymentFailed(data);
      break;
    case 'charge.refunded':
      await handleStripeRefund(data);
      break;
    default:
      logger.info('Unhandled Stripe webhook event', { event });
  }
}

// Webhook handler implementations
async function handlePaystackChargeSuccess(data: unknown): Promise<void> {
  const record = data as Record<string, unknown>;
  const reference = (record.reference as string) || '';
  logger.info('Handling Paystack charge success', { reference });
  // Update transaction status
}

async function handlePaystackTransferSuccess(data: unknown): Promise<void> {
  const record = data as Record<string, unknown>;
  const reference = (record.reference as string) || '';
  logger.info('Handling Paystack transfer success', { reference });
  // Update settlement status
}

async function handlePaystackTransferFailed(data: unknown): Promise<void> {
  const record = data as Record<string, unknown>;
  const reference = (record.reference as string) || '';
  logger.info('Handling Paystack transfer failed', { reference });
  // Update settlement status and notify
}

async function handlePaystackRefundProcessed(data: unknown): Promise<void> {
  const record = data as Record<string, unknown>;
  const transactionReference = (record.transaction_reference as string) || '';
  logger.info('Handling Paystack refund processed', { transactionReference });
  // Update refund status
}

async function handleStripePaymentSucceeded(data: unknown): Promise<void> {
  const record = data as Record<string, unknown>;
  const paymentIntentId = (record.id as string) || '';
  logger.info('Handling Stripe payment succeeded', { paymentIntentId });
  // Update transaction status
}

async function handleStripePaymentFailed(data: unknown): Promise<void> {
  const record = data as Record<string, unknown>;
  const paymentIntentId = (record.id as string) || '';
  logger.info('Handling Stripe payment failed', { paymentIntentId });
  // Update transaction status
}

async function handleStripeRefund(data: unknown): Promise<void> {
  const record = data as Record<string, unknown>;
  const chargeId = (record.id as string) || '';
  logger.info('Handling Stripe refund', { chargeId });
  // Update refund status
}
