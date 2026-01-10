import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../../config';
import logger from '../../utils/logger';
import { commissionService } from '../../services/commission.service';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { addNotificationJob } from '../notification.queue';

const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

// Initialize payment providers
const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: '2024-12-18.acacia',
});

/**
 * Payment worker to process payment jobs
 */
export const paymentWorker = new Worker(
  'payment-queue',
  async (job: Job) => {
    const { paymentId, module, amount, currency, userId, branchId, stateId, metadata, paymentMethod } = job.data;

    logger.info('Processing payment job', {
      jobId: job.id,
      paymentId,
      module,
      amount,
      paymentMethod,
    });

    try {
      // Update payment status to processing
      await updatePaymentStatus(paymentId, 'processing');

      // Calculate commission
      const commission = await commissionService.calculateCommission(
        module,
        amount,
        metadata.transactionType || 'standard'
      );

      // Process payment based on provider
      let paymentResult;
      if (paymentMethod === 'stripe') {
        paymentResult = await processStripePayment({
          amount,
          currency,
          userId,
          metadata: {
            ...metadata,
            paymentId,
            module,
          },
        });
      } else {
        // Default to Paystack
        paymentResult = await processPaystackPayment({
          amount,
          currency,
          userId,
          metadata: {
            ...metadata,
            paymentId,
            module,
          },
        });
      }

      // Store transaction record
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          id: paymentId,
          user_id: userId,
          branch_id: branchId,
          state_id: stateId,
          module,
          transaction_type: 'payment',
          amount: commission.grossAmount,
          commission_amount: commission.commissionAmount,
          net_amount: commission.netAmount,
          currency,
          status: paymentResult.success ? 'completed' : 'failed',
          payment_reference: paymentResult.reference,
          payment_method: paymentMethod || 'paystack',
          metadata: {
            ...metadata,
            commissionCalculation: commission,
            paymentResult,
          },
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (txError) {
        throw new Error(`Failed to store transaction: ${txError.message}`);
      }

      // Update payment status
      await updatePaymentStatus(
        paymentId,
        paymentResult.success ? 'completed' : 'failed',
        paymentResult.message
      );

      // Queue notification
      await addNotificationJob({
        userId,
        type: paymentResult.success ? 'payment_success' : 'payment_failed',
        title: paymentResult.success ? 'Payment Successful' : 'Payment Failed',
        message: paymentResult.message || '',
        data: {
          transactionId: paymentId,
          amount,
          currency,
          module,
          status: paymentResult.success ? 'completed' : 'failed',
          timestamp: new Date().toISOString(),
        },
        channels: ['email', 'push', 'in_app'],
      });

      logger.info('Payment processed successfully', {
        jobId: job.id,
        paymentId,
        success: paymentResult.success,
      });

      return {
        success: paymentResult.success,
        transactionId: paymentId,
        paymentReference: paymentResult.reference,
        commission,
      };
    } catch (error: any) {
      logger.error('Payment processing failed', {
        jobId: job.id,
        paymentId,
        error: error.message,
      });

      await updatePaymentStatus(paymentId, 'failed', error.message);

      // Queue failure notification
      await addNotificationJob({
        userId,
        type: 'payment_failed',
        title: 'Payment Failed',
        message: error.message || 'Payment processing failed',
        data: {
          transactionId: paymentId,
          amount,
          currency,
          module,
          status: 'failed',
          timestamp: new Date().toISOString(),
        },
        channels: ['email', 'push', 'in_app'],
      });

      throw error;
    }
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

/**
 * Process Paystack payment
 */
async function processPaystackPayment(data: {
  amount: number;
  currency: string;
  userId: string;
  metadata: any;
}): Promise<{ success: boolean; reference: string; message?: string }> {
  // Paystack implementation
  // This is a placeholder - implement actual Paystack API calls
  logger.info('Processing Paystack payment', { amount: data.amount, currency: data.currency });

  // Simulate payment processing
  const reference = `PAYSTACK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    success: true,
    reference,
    message: 'Payment processed successfully',
  };
}

/**
 * Process Stripe payment
 */
async function processStripePayment(data: {
  amount: number;
  currency: string;
  userId: string;
  metadata: any;
}): Promise<{ success: boolean; reference: string; message?: string }> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(data.amount * 100), // Convert to cents
      currency: data.currency.toLowerCase(),
      metadata: data.metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      success: true,
      reference: paymentIntent.id,
      message: 'Payment intent created successfully',
    };
  } catch (error: any) {
    logger.error('Stripe payment failed', { error: error.message });
    return {
      success: false,
      reference: '',
      message: error.message,
    };
  }
}

/**
 * Update payment status in database
 */
async function updatePaymentStatus(paymentId: string, status: string, message?: string) {
  try {
    await supabase
      .from('payment_requests')
      .update({
        status,
        message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId);
  } catch (error: any) {
    logger.error('Failed to update payment status', {
      paymentId,
      status,
      error: error.message,
    });
  }
}

// Worker event handlers
paymentWorker.on('completed', (job) => {
  logger.info('Payment job completed', {
    jobId: job.id,
    paymentId: job.data.paymentId,
  });
});

paymentWorker.on('failed', (job, err) => {
  logger.error('Payment job failed', {
    jobId: job?.id,
    paymentId: job?.data?.paymentId,
    error: err.message,
  });
});

paymentWorker.on('error', (err) => {
  logger.error('Payment worker error', { error: err.message });
});

logger.info('Payment worker started');

export async function closePaymentWorker() {
  await paymentWorker.close();
  logger.info('Payment worker closed');
}
