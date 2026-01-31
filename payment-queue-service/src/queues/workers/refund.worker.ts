import { createClient } from '@supabase/supabase-js';
import { Job } from 'bullmq';

import { config } from '../../config';
import logger from '../../utils/logger';
import { addNotificationJob } from '../notification.queue';

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

/**
 * Refund processor function - handles refund job processing
 * This is registered with WorkerManager and called when jobs arrive
 */
export async function refundProcessor(job: Job): Promise<{
  success: boolean;
  refundId: string;
  refundReference: string;
}> {
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
    const { error: refundError } = await supabase
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Refund processing failed', {
      jobId: job.id,
      refundId,
      error: errorMessage,
    });
    throw error;
  }
}

/**
 * Process refund with payment provider
 */
async function processRefundWithProvider(
  provider: string,
  paymentReference: string,
  amount: number,
  _reason: string
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
