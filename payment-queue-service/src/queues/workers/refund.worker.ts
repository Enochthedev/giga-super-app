import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../../config';
import logger from '../../utils/logger';
import { createClient } from '@supabase/supabase-js';
import { addNotificationJob } from '../notification.queue';

const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

/**
 * Refund worker to process refund jobs
 */
export const refundWorker = new Worker(
  'refund-queue',
  async (job: Job) => {
    const { refundId, transactionId, amount, reason, userId, requestedBy } = job.data;

    logger.info('Processing refund job', {
      jobId: job.id,
      refundId,
      transactionId,
      amount,
    });

    try {
      // Get original transaction
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (txError || !transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== 'completed') {
        throw new Error('Can only refund completed transactions');
      }

      // Calculate refund amount (partial or full)
      const refundAmount = amount || transaction.amount;

      if (refundAmount > transaction.amount) {
        throw new Error('Refund amount exceeds transaction amount');
      }

      // Process refund with payment provider
      const refundResult = await processRefundWithProvider(
        transaction.payment_method,
        transaction.payment_reference,
        refundAmount,
        reason
      );

      // Create refund record
      const { data: refund, error: refundError } = await supabase
        .from('refunds')
        .insert({
          id: refundId,
          transaction_id: transactionId,
          user_id: userId,
          requested_by: requestedBy,
          amount: refundAmount,
          reason,
          status: refundResult.success ? 'completed' : 'failed',
          refund_reference: refundResult.reference,
          error_message: refundResult.message,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (refundError) {
        throw new Error(`Failed to create refund record: ${refundError.message}`);
      }

      // Update transaction status if full refund
      if (refundAmount === transaction.amount) {
        await supabase
          .from('transactions')
          .update({
            status: 'refunded',
            updated_at: new Date().toISOString(),
          })
          .eq('id', transactionId);
      }

      // Send notification
      await addNotificationJob({
        userId,
        type: 'refund_processed',
        title: 'Refund Processed',
        message: `Your refund of ${transaction.currency} ${refundAmount.toFixed(2)} has been processed.`,
        data: {
          refundId,
          transactionId,
          amount: refundAmount,
          currency: transaction.currency,
          reason,
        },
        channels: ['email', 'push', 'in_app'],
      });

      logger.info('Refund processed successfully', {
        jobId: job.id,
        refundId,
        transactionId,
      });

      return {
        success: refundResult.success,
        refundId,
        refundReference: refundResult.reference,
      };
    } catch (error: any) {
      logger.error('Refund processing failed', {
        jobId: job.id,
        refundId,
        error: error.message,
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
 * Process refund with payment provider
 */
async function processRefundWithProvider(
  provider: string,
  paymentReference: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; reference: string; message?: string }> {
  // Implementation depends on provider
  logger.info('Processing refund with provider', { provider, paymentReference, amount });

  // Placeholder implementation
  const reference = `REFUND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    success: true,
    reference,
    message: 'Refund processed successfully',
  };
}

refundWorker.on('completed', (job) => {
  logger.info('Refund job completed', {
    jobId: job.id,
    refundId: job.data.refundId,
  });
});

refundWorker.on('failed', (job, err) => {
  logger.error('Refund job failed', {
    jobId: job?.id,
    refundId: job?.data?.refundId,
    error: err.message,
  });
});

refundWorker.on('error', (err) => {
  logger.error('Refund worker error', { error: err.message });
});

logger.info('Refund worker started');

export async function closeRefundWorker() {
  await refundWorker.close();
  logger.info('Refund worker closed');
}
