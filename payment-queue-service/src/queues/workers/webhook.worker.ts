import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import crypto from 'crypto';
import { config } from '../../config';
import logger from '../../utils/logger';
import { createClient } from '@supabase/supabase-js';

const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

/**
 * Webhook worker to process incoming webhooks
 */
export const webhookWorker = new Worker(
  'webhook-queue',
  async (job: Job) => {
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
    } catch (error: any) {
      logger.error('Webhook processing failed', {
        jobId: job.id,
        provider,
        event,
        error: error.message,
      });

      // Store failed webhook log
      await supabase.from('webhook_logs').insert({
        provider,
        event,
        data,
        signature,
        status: 'failed',
        error: error.message,
        received_at: receivedAt,
        processed_at: new Date().toISOString(),
      });

      throw error;
    }
  },
  {
    connection,
    concurrency: 3,
  }
);

/**
 * Verify Paystack webhook signature
 */
async function verifyPaystackSignature(payload: any, signature: string): Promise<void> {
  const secretKey = config.paystackSecretKey;
  const hash = crypto.createHmac('sha512', secretKey).update(JSON.stringify(payload)).digest('hex');

  if (hash !== signature) {
    throw new Error('Invalid Paystack webhook signature');
  }

  logger.debug('Paystack signature verified');
}

/**
 * Verify Stripe webhook signature
 */
async function verifyStripeSignature(payload: any, signature: string): Promise<void> {
  // Stripe signature verification would be more complex
  // This is a placeholder implementation
  logger.debug('Stripe signature verification (placeholder)');
}

/**
 * Process Paystack webhook events
 */
async function processPaystackWebhook(event: string, data: any): Promise<void> {
  logger.info('Processing Paystack webhook event', { event });

  switch (event) {
    case 'charge.success':
      await handlePaystackChargeSuccess(data);
      break;
    case 'charge.failed':
      await handlePaystackChargeFailed(data);
      break;
    case 'transfer.success':
      await handlePaystackTransferSuccess(data);
      break;
    case 'transfer.failed':
      await handlePaystackTransferFailed(data);
      break;
    default:
      logger.warn('Unhandled Paystack webhook event', { event });
  }
}

/**
 * Process Stripe webhook events
 */
async function processStripeWebhook(event: string, data: any): Promise<void> {
  logger.info('Processing Stripe webhook event', { event });

  switch (event) {
    case 'payment_intent.succeeded':
      await handleStripePaymentSuccess(data);
      break;
    case 'payment_intent.payment_failed':
      await handleStripePaymentFailed(data);
      break;
    case 'charge.refunded':
      await handleStripeRefund(data);
      break;
    default:
      logger.warn('Unhandled Stripe webhook event', { event });
  }
}

/**
 * Handle successful Paystack charge
 */
async function handlePaystackChargeSuccess(data: any): Promise<void> {
  const { reference, amount, metadata } = data;

  logger.info('Handling Paystack charge success', { reference, amount });

  // Update transaction status
  await supabase
    .from('transactions')
    .update({
      status: 'completed',
      payment_reference: reference,
      webhook_data: data,
      updated_at: new Date().toISOString(),
    })
    .eq('payment_reference', reference);
}

/**
 * Handle failed Paystack charge
 */
async function handlePaystackChargeFailed(data: any): Promise<void> {
  const { reference, message } = data;

  logger.info('Handling Paystack charge failure', { reference, message });

  await supabase
    .from('transactions')
    .update({
      status: 'failed',
      error_message: message,
      webhook_data: data,
      updated_at: new Date().toISOString(),
    })
    .eq('payment_reference', reference);
}

/**
 * Handle successful Paystack transfer
 */
async function handlePaystackTransferSuccess(data: any): Promise<void> {
  const { reference, amount } = data;

  logger.info('Handling Paystack transfer success', { reference, amount });

  await supabase
    .from('settlements')
    .update({
      status: 'completed',
      transfer_reference: reference,
      webhook_data: data,
      updated_at: new Date().toISOString(),
    })
    .eq('transfer_reference', reference);
}

/**
 * Handle failed Paystack transfer
 */
async function handlePaystackTransferFailed(data: any): Promise<void> {
  const { reference, message } = data;

  logger.info('Handling Paystack transfer failure', { reference, message });

  await supabase
    .from('settlements')
    .update({
      status: 'failed',
      error_message: message,
      webhook_data: data,
      updated_at: new Date().toISOString(),
    })
    .eq('transfer_reference', reference);
}

/**
 * Handle successful Stripe payment
 */
async function handleStripePaymentSuccess(data: any): Promise<void> {
  const { id, amount, metadata } = data;

  logger.info('Handling Stripe payment success', { id, amount });

  await supabase
    .from('transactions')
    .update({
      status: 'completed',
      payment_reference: id,
      webhook_data: data,
      updated_at: new Date().toISOString(),
    })
    .eq('payment_reference', id);
}

/**
 * Handle failed Stripe payment
 */
async function handleStripePaymentFailed(data: any): Promise<void> {
  const { id, last_payment_error } = data;

  logger.info('Handling Stripe payment failure', { id });

  await supabase
    .from('transactions')
    .update({
      status: 'failed',
      error_message: last_payment_error?.message || 'Payment failed',
      webhook_data: data,
      updated_at: new Date().toISOString(),
    })
    .eq('payment_reference', id);
}

/**
 * Handle Stripe refund
 */
async function handleStripeRefund(data: any): Promise<void> {
  const { id, amount, refunds } = data;

  logger.info('Handling Stripe refund', { id, amount });

  // Process refund logic
  if (refunds && refunds.data && refunds.data.length > 0) {
    const refund = refunds.data[0];
    await supabase
      .from('refunds')
      .update({
        status: 'completed',
        refund_reference: refund.id,
        webhook_data: data,
        updated_at: new Date().toISOString(),
      })
      .eq('payment_reference', id);
  }
}

// Worker event handlers
webhookWorker.on('completed', (job) => {
  logger.info('Webhook job completed', {
    jobId: job.id,
    provider: job.data.provider,
    event: job.data.event,
  });
});

webhookWorker.on('failed', (job, err) => {
  logger.error('Webhook job failed', {
    jobId: job?.id,
    provider: job?.data?.provider,
    event: job?.data?.event,
    error: err.message,
  });
});

webhookWorker.on('error', (err) => {
  logger.error('Webhook worker error', { error: err.message });
});

logger.info('Webhook worker started');

export async function closeWebhookWorker() {
  await webhookWorker.close();
  logger.info('Webhook worker closed');
}
