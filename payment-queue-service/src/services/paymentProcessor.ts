import axios from 'axios';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';

import { config } from '../config';
import { PaymentRequest, PaymentResponse, CircuitBreakerState } from '../types';
import supabase from '../utils/database';
import { PaymentProcessingError, ServiceUnavailableError } from '../utils/errors';
import logger from '../utils/logger';

// Initialize Stripe
const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: '2023-10-16',
});

// Circuit Breaker state for each payment provider
const circuitBreakers: Record<string, CircuitBreakerState> = {
  paystack: { failures: 0, state: 'CLOSED' },
  stripe: { failures: 0, state: 'CLOSED' },
};

// Check circuit breaker state
const checkCircuitBreaker = (provider: string): void => {
  const breaker = circuitBreakers[provider];
  
  if (breaker.state === 'OPEN') {
    const now = new Date();
    const timeSinceLastFailure = breaker.lastFailureTime
      ? now.getTime() - breaker.lastFailureTime.getTime()
      : 0;

    if (timeSinceLastFailure > config.circuitBreaker.resetTimeout) {
      breaker.state = 'HALF_OPEN';
      breaker.failures = 0;
      logger.info(`Circuit breaker for ${provider} is now HALF_OPEN`);
    } else {
      throw new ServiceUnavailableError(`${provider} payment service is temporarily unavailable`);
    }
  }
};

// Record circuit breaker failure
const recordFailure = (provider: string): void => {
  const breaker = circuitBreakers[provider];
  breaker.failures += 1;
  breaker.lastFailureTime = new Date();

  const errorThreshold = config.circuitBreaker.errorThreshold / 100;
  if (breaker.failures >= 5 && breaker.failures / (breaker.failures + 1) >= errorThreshold) {
    breaker.state = 'OPEN';
    logger.warn(`Circuit breaker for ${provider} is now OPEN`, {
      failures: breaker.failures,
    });
  }
};

// Record circuit breaker success
const recordSuccess = (provider: string): void => {
  const breaker = circuitBreakers[provider];
  if (breaker.state === 'HALF_OPEN') {
    breaker.state = 'CLOSED';
    breaker.failures = 0;
    logger.info(`Circuit breaker for ${provider} is now CLOSED`);
  }
};

// Calculate commission
const calculateCommission = (amount: number, rate: number): number => {
  return Math.round((amount * rate) / 100);
};

// Process Paystack payment
const processPaystackPayment = async (request: PaymentRequest): Promise<PaymentResponse> => {
  checkCircuitBreaker('paystack');

  try {
    const transactionId = `TXN-${Date.now()}-${uuidv4().substring(0, 8)}`;
    const commissionAmount = calculateCommission(request.amount, request.commissionRate);
    const netAmount = request.amount - commissionAmount;

    // Initialize Paystack transaction
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: request.metadata.customerEmail,
        amount: request.amount * 100, // Convert to kobo
        currency: request.currency,
        reference: transactionId,
        callback_url: `${process.env.PAYMENT_CALLBACK_URL}/paystack/callback`,
        metadata: {
          ...request.metadata,
          module: request.module,
          userId: request.userId,
          branchId: request.branchId,
          stateId: request.stateId,
          commissionRate: request.commissionRate,
        },
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
      throw new PaymentProcessingError(response.data.message || 'Paystack initialization failed');
    }

    // Save to financial ledger
    await saveToLedger({
      transactionId,
      request,
      commissionAmount,
      netAmount,
      paymentReference: response.data.data.reference,
      status: 'pending',
    });

    recordSuccess('paystack');

    return {
      success: true,
      transactionId,
      paymentReference: response.data.data.reference,
      status: 'pending',
      amount: request.amount,
      commissionAmount,
      netAmount,
      message: 'Payment initialized successfully',
    };
  } catch (error: any) {
    recordFailure('paystack');
    logger.error('Paystack payment processing failed', {
      error: error.message,
      paymentId: request.id,
    });

    if (error instanceof PaymentProcessingError) {
      throw error;
    }

    throw new PaymentProcessingError(`Paystack payment failed: ${error.message}`);
  }
};

// Process Stripe payment
const processStripePayment = async (request: PaymentRequest): Promise<PaymentResponse> => {
  checkCircuitBreaker('stripe');

  try {
    const transactionId = `TXN-${Date.now()}-${uuidv4().substring(0, 8)}`;
    const commissionAmount = calculateCommission(request.amount, request.commissionRate);
    const netAmount = request.amount - commissionAmount;

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: request.amount * 100, // Convert to cents
      currency: request.currency.toLowerCase(),
      payment_method_types: ['card'],
      metadata: {
        ...request.metadata,
        module: request.module,
        userId: request.userId,
        branchId: request.branchId,
        stateId: request.stateId,
        transactionId,
      },
      description: request.metadata.description || `${request.module} payment`,
    });

    // Save to financial ledger
    await saveToLedger({
      transactionId,
      request,
      commissionAmount,
      netAmount,
      paymentReference: paymentIntent.id,
      status: 'pending',
    });

    recordSuccess('stripe');

    return {
      success: true,
      transactionId,
      paymentReference: paymentIntent.id,
      status: 'pending',
      amount: request.amount,
      commissionAmount,
      netAmount,
      message: 'Payment initialized successfully',
    };
  } catch (error: any) {
    recordFailure('stripe');
    logger.error('Stripe payment processing failed', {
      error: error.message,
      paymentId: request.id,
    });

    throw new PaymentProcessingError(`Stripe payment failed: ${error.message}`);
  }
};

// Save payment to financial ledger
const saveToLedger = async (data: {
  transactionId: string;
  request: PaymentRequest;
  commissionAmount: number;
  netAmount: number;
  paymentReference: string;
  status: string;
}): Promise<void> => {
  const { transactionId, request, commissionAmount, netAmount, paymentReference, status } = data;

  try {
    const { error } = await supabase.from('nipost_financial_ledger').insert({
      transaction_id: transactionId,
      transaction_type: `${request.module}_${request.module === 'hotel' ? 'booking' : request.module === 'taxi' ? 'trip' : 'order'}`,
      module: request.module,
      module_transaction_id: request.metadata.moduleTransactionId,
      branch_id: request.branchId,
      branch_name: '', // Will be updated by trigger or application
      state_id: request.stateId,
      state_name: '', // Will be updated by trigger or application
      gross_amount: request.amount,
      commission_rate: request.commissionRate,
      commission_amount: commissionAmount,
      net_amount: netAmount,
      payment_status: status,
      payment_method: request.paymentMethod || 'paystack',
      payment_reference: paymentReference,
      user_id: request.userId,
      metadata: request.metadata,
    });

    if (error) {
      logger.error('Failed to save to financial ledger', {
        error: error.message,
        transactionId,
      });
      throw new Error(`Database error: ${error.message}`);
    }

    logger.info('Payment saved to financial ledger', { transactionId });
  } catch (error: any) {
    logger.error('Error saving to ledger', {
      error: error.message,
      transactionId,
    });
    throw error;
  }
};

// Main payment processor
export const processPayment = async (request: PaymentRequest): Promise<PaymentResponse> => {
  logger.info('Processing payment request', {
    paymentId: request.id,
    module: request.module,
    amount: request.amount,
    paymentMethod: request.paymentMethod,
  });

  // Determine payment method
  const paymentMethod = request.paymentMethod || 'paystack';

  try {
    let result: PaymentResponse;

    if (paymentMethod === 'stripe') {
      result = await processStripePayment(request);
    } else {
      result = await processPaystackPayment(request);
    }

    // Create audit trail
    await createPaymentAudit({
      transactionId: result.transactionId,
      action: 'create',
      oldStatus: null,
      newStatus: result.status,
      performedBy: request.userId,
      changes: { request, result },
    });

    return result;
  } catch (error: any) {
    logger.error('Payment processing failed', {
      paymentId: request.id,
      error: error.message,
    });

    throw error;
  }
};

// Create payment audit trail
const createPaymentAudit = async (data: {
  transactionId: string;
  action: string;
  oldStatus: string | null;
  newStatus: string;
  performedBy: string;
  changes: any;
}): Promise<void> => {
  try {
    // Get ledger ID
    const { data: ledger, error: ledgerError } = await supabase
      .from('nipost_financial_ledger')
      .select('id')
      .eq('transaction_id', data.transactionId)
      .single();

    if (ledgerError || !ledger) {
      logger.error('Failed to find ledger for audit', { transactionId: data.transactionId });
      return;
    }

    await supabase.from('nipost_financial_audit').insert({
      ledger_id: ledger.id,
      action: data.action,
      old_status: data.oldStatus,
      new_status: data.newStatus,
      changes: data.changes,
      performed_by: data.performedBy,
    });
  } catch (error: any) {
    logger.error('Failed to create payment audit', {
      error: error.message,
      transactionId: data.transactionId,
    });
  }
};

// Update payment status
export const updatePaymentStatus = async (
  transactionId: string,
  status: string,
  paymentReference?: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('nipost_financial_ledger')
      .update({
        payment_status: status,
        ...(paymentReference && { payment_reference: paymentReference }),
        updated_at: new Date().toISOString(),
      })
      .eq('transaction_id', transactionId);

    if (error) {
      throw new Error(`Failed to update payment status: ${error.message}`);
    }

    logger.info('Payment status updated', { transactionId, status });
  } catch (error: any) {
    logger.error('Error updating payment status', {
      error: error.message,
      transactionId,
    });
    throw error;
  }
};
