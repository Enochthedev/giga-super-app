import Stripe from 'stripe';
import axios from 'axios';
import { config } from '@/config';
import logger from '@/utils/logger';
import supabase from '@/utils/database';
import { RefundRequest } from '@/types';
import { PaymentProcessingError, NotFoundError } from '@/utils/errors';

// Initialize Stripe
const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: '2023-10-16',
});

export const processRefund = async (refundRequest: RefundRequest): Promise<any> => {
  logger.info('Processing refund', {
    transactionId: refundRequest.transactionId,
    amount: refundRequest.amount,
  });

  try {
    // Get transaction from ledger
    const { data: transaction, error: fetchError } = await supabase
      .from('nipost_financial_ledger')
      .select('*')
      .eq('transaction_id', refundRequest.transactionId)
      .single();

    if (fetchError || !transaction) {
      throw new NotFoundError('Transaction not found');
    }

    // Check if transaction can be refunded
    if (transaction.payment_status !== 'completed') {
      throw new PaymentProcessingError('Only completed transactions can be refunded');
    }

    if (transaction.payment_status === 'refunded') {
      throw new PaymentProcessingError('Transaction already refunded');
    }

    const refundAmount = refundRequest.amount || transaction.gross_amount;

    // Process refund based on payment method
    let refundReference: string;

    if (transaction.payment_method === 'stripe') {
      refundReference = await processStripeRefund(
        transaction.payment_reference,
        refundAmount
      );
    } else {
      refundReference = await processPaystackRefund(
        transaction.payment_reference,
        refundAmount
      );
    }

    // Update transaction status
    const { error: updateError } = await supabase
      .from('nipost_financial_ledger')
      .update({
        payment_status: 'refunded',
        metadata: {
          ...transaction.metadata,
          refund: {
            amount: refundAmount,
            reason: refundRequest.reason,
            reference: refundReference,
            processedAt: new Date().toISOString(),
            processedBy: refundRequest.userId,
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq('transaction_id', refundRequest.transactionId);

    if (updateError) {
      logger.error('Failed to update transaction status', {
        error: updateError.message,
        transactionId: refundRequest.transactionId,
      });
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    // Create audit trail
    await createRefundAudit({
      transactionId: refundRequest.transactionId,
      ledgerId: transaction.id,
      amount: refundAmount,
      reason: refundRequest.reason,
      refundReference,
      performedBy: refundRequest.userId,
    });

    logger.info('Refund processed successfully', {
      transactionId: refundRequest.transactionId,
      refundReference,
    });

    return {
      success: true,
      transactionId: refundRequest.transactionId,
      refundReference,
      amount: refundAmount,
      message: 'Refund processed successfully',
    };
  } catch (error: any) {
    logger.error('Refund processing failed', {
      error: error.message,
      transactionId: refundRequest.transactionId,
    });

    throw error;
  }
};

// Process Paystack refund
const processPaystackRefund = async (
  paymentReference: string,
  amount: number
): Promise<string> => {
  try {
    const response = await axios.post(
      'https://api.paystack.co/refund',
      {
        transaction: paymentReference,
        amount: amount * 100, // Convert to kobo
      },
      {
        headers: {
          Authorization: `Bearer ${config.paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        timeout: config.circuitBreaker.timeout,
      }
    );

    if (!response.data.status) {
      throw new PaymentProcessingError(
        response.data.message || 'Paystack refund failed'
      );
    }

    return response.data.data.id.toString();
  } catch (error: any) {
    logger.error('Paystack refund failed', {
      error: error.message,
      paymentReference,
    });

    throw new PaymentProcessingError(`Paystack refund failed: ${error.message}`);
  }
};

// Process Stripe refund
const processStripeRefund = async (
  paymentReference: string,
  amount: number
): Promise<string> => {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentReference,
      amount: amount * 100, // Convert to cents
    });

    return refund.id;
  } catch (error: any) {
    logger.error('Stripe refund failed', {
      error: error.message,
      paymentReference,
    });

    throw new PaymentProcessingError(`Stripe refund failed: ${error.message}`);
  }
};

// Create refund audit trail
const createRefundAudit = async (data: {
  transactionId: string;
  ledgerId: string;
  amount: number;
  reason: string;
  refundReference: string;
  performedBy: string;
}): Promise<void> => {
  try {
    await supabase.from('nipost_financial_audit').insert({
      ledger_id: data.ledgerId,
      action: 'refund',
      old_status: 'completed',
      new_status: 'refunded',
      changes: {
        amount: data.amount,
        reason: data.reason,
        refundReference: data.refundReference,
      },
      reason: data.reason,
      performed_by: data.performedBy,
    });
  } catch (error: any) {
    logger.error('Failed to create refund audit', {
      error: error.message,
      transactionId: data.transactionId,
    });
  }
};
