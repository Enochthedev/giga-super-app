import { createClient } from '@supabase/supabase-js';
import { Job } from 'bullmq';
import Stripe from 'stripe';

import { config } from '../../config';
import { commissionService } from '../../services/commission.service';
import logger from '../../utils/logger';
import { addNotificationJob } from '../notification.queue';

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

// Initialize payment providers (lazy initialization to avoid startup errors)
let stripe: Stripe | null = null;
const getStripe = () => {
  if (!stripe) {
    if (!config.stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is required for payment processing');
    }
    stripe = new Stripe(config.stripeSecretKey, {
      apiVersion: '2025-12-15.clover' as Stripe.LatestApiVersion,
    });
  }
  return stripe;
};

/**
 * Payment processor function - handles payment job processing
 * This is registered with WorkerManager and called when jobs arrive
 */
export async function paymentProcessor(job: Job): Promise<{
  success: boolean;
  transactionId: string;
  paymentReference: string;
  commission: unknown;
}> {
  const {
    paymentId,
    module,
    amount,
    currency,
    userId,
    branchId,
    stateId,
    metadata,
    paymentMethod,
  } = job.data;

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
    const { error: txError } = await supabase
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Payment processing failed', {
      jobId: job.id,
      paymentId,
      error: errorMessage,
    });

    await updatePaymentStatus(paymentId, 'failed', errorMessage);

    // Queue failure notification
    await addNotificationJob({
      userId,
      type: 'payment_failed',
      title: 'Payment Failed',
      message: errorMessage || 'Payment processing failed',
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
}

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
    const paymentIntent = await getStripe().paymentIntents.create({
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
