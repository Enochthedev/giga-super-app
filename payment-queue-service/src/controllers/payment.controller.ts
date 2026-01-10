import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import logger from '../utils/logger';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { Validator } from '../utils/validator';
import { commissionService } from '../services/commission.service';
import { addPaymentJob, getPaymentJobStatus } from '../queues/payment.queue';
import { AuthenticatedRequest } from '../middleware/rbac.middleware';

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

/**
 * POST /api/v1/payments/request
 * Create new payment request and return checkout URL
 */
export async function createPaymentRequest(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      module,
      amount,
      currency,
      userId,
      branchId,
      stateId,
      metadata,
      paymentMethod = 'paystack',
    } = req.body;

    // Validate request
    Validator.validatePaymentRequest(req.body);

    // Generate payment ID
    const paymentId = uuidv4();

    // Calculate commission
    const commission = await commissionService.calculateCommission(
      module,
      amount,
      metadata.transactionType || 'standard'
    );

    // Create payment request record
    const { data: paymentRequest, error: prError } = await supabase
      .from('payment_requests')
      .insert({
        id: paymentId,
        user_id: userId,
        branch_id: branchId,
        state_id: stateId,
        module,
        amount,
        currency,
        commission_rate: commission.commissionRate,
        commission_amount: commission.commissionAmount,
        net_amount: commission.netAmount,
        payment_method: paymentMethod,
        metadata,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (prError) {
      throw new Error(`Failed to create payment request: ${prError.message}`);
    }

    // Add payment job to queue
    await addPaymentJob({
      paymentId,
      module,
      amount,
      currency,
      userId,
      branchId,
      stateId,
      metadata,
      paymentMethod,
    });

    // Generate checkout URL
    const checkoutUrl = generateCheckoutURL(paymentId, paymentMethod, amount, currency, metadata);

    logger.info('Payment request created', {
      paymentId,
      userId,
      module,
      amount,
    });

    res.status(201).json({
      success: true,
      data: {
        paymentId,
        checkoutUrl,
        amount,
        currency,
        commissionAmount: commission.commissionAmount,
        netAmount: commission.netAmount,
        status: 'pending',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      },
    });
  } catch (error: any) {
    logger.error('Failed to create payment request', {
      error: error.message,
      body: req.body,
    });
    throw error;
  }
}

/**
 * GET /api/v1/payments/:paymentId/status
 * Get payment status
 */
export async function getPaymentStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { paymentId } = req.params;

    // Get payment request from database
    const { data: paymentRequest, error: prError } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (prError || !paymentRequest) {
      throw new NotFoundError('Payment request not found');
    }

    // Get job status from queue
    const jobStatus = await getPaymentJobStatus(paymentId);

    // Get transaction if exists
    const { data: transaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', paymentId)
      .single();

    res.json({
      success: true,
      data: {
        paymentId,
        status: paymentRequest.status,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        module: paymentRequest.module,
        commissionAmount: paymentRequest.commission_amount,
        netAmount: paymentRequest.net_amount,
        paymentMethod: paymentRequest.payment_method,
        createdAt: paymentRequest.created_at,
        updatedAt: paymentRequest.updated_at,
        jobStatus: jobStatus ? {
          state: jobStatus.state,
          progress: jobStatus.progress,
          attemptsMade: jobStatus.attemptsMade,
        } : null,
        transaction: transaction ? {
          id: transaction.id,
          paymentReference: transaction.payment_reference,
          status: transaction.status,
        } : null,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get payment status', {
      error: error.message,
      paymentId: req.params.paymentId,
    });
    throw error;
  }
}

/**
 * POST /api/v1/payments/:paymentId/refund
 * Request refund for a payment
 */
export async function requestRefund(req: AuthenticatedRequest, res: Response) {
  try {
    const { paymentId } = req.params;
    const { reason, amount } = req.body;

    // Validate refund request
    Validator.validateRefundRequest({
      transactionId: paymentId,
      reason,
      amount,
    });

    // Get transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (txError || !transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (transaction.status !== 'completed') {
      throw new BadRequestError('Can only refund completed transactions');
    }

    // Check if already refunded
    if (transaction.status === 'refunded') {
      throw new BadRequestError('Transaction already refunded');
    }

    // Validate refund amount
    const refundAmount = amount || transaction.amount;
    if (refundAmount > transaction.amount) {
      throw new BadRequestError('Refund amount exceeds transaction amount');
    }

    const refundId = uuidv4();
    const userId = req.user?.id || transaction.user_id;

    // Add refund job to queue
    const { addRefundJob } = await import('../queues/refund.queue');
    await addRefundJob({
      refundId,
      transactionId: paymentId,
      amount: refundAmount,
      reason,
      userId: transaction.user_id,
      requestedBy: userId,
    });

    logger.info('Refund requested', {
      refundId,
      paymentId,
      amount: refundAmount,
      userId,
    });

    res.status(202).json({
      success: true,
      data: {
        refundId,
        transactionId: paymentId,
        amount: refundAmount,
        reason,
        status: 'processing',
        message: 'Refund request is being processed',
      },
    });
  } catch (error: any) {
    logger.error('Failed to request refund', {
      error: error.message,
      paymentId: req.params.paymentId,
    });
    throw error;
  }
}

/**
 * Helper function to generate checkout URL
 */
function generateCheckoutURL(
  paymentId: string,
  paymentMethod: string,
  amount: number,
  currency: string,
  metadata: any
): string {
  const baseUrl = process.env.FRONTEND_URL || 'https://app.giga.ng';
  
  // In a real implementation, this would generate provider-specific checkout URLs
  // For Paystack: use Paystack's transaction initialize endpoint
  // For Stripe: use Stripe Checkout Session
  
  const params = new URLSearchParams({
    payment_id: paymentId,
    method: paymentMethod,
    amount: amount.toString(),
    currency,
    callback_url: `${baseUrl}/payments/callback`,
  });

  return `${baseUrl}/checkout?${params.toString()}`;
}
