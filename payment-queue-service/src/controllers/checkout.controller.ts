import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { AuthRequest } from '../middleware/auth';
import { resolveEntityCurrency, selectProcessor } from '../services/currency.service';
import { paystackService } from '../services/paystack.service';
import { stripeService } from '../services/stripe.service';
import supabase from '../utils/database';
import { BadRequestError } from '../utils/errors';
import logger from '../utils/logger';

// Edge-compatible module type -> internal module name (matches the retired
// Initialize-payment edge function so the frontend contract is unchanged).
const MODULE_NAME: Record<string, string> = {
  hotel_booking: 'hotels',
  ecommerce_order: 'ecommerce',
  taxi_ride: 'taxi',
  ad_campaign: 'ads',
};

/**
 * POST /api/v1/payments/initialize
 *
 * Drop-in replacement for the Supabase Initialize-payment edge function: same
 * request/response contract, but currency is resolved server-side from the
 * priced entity's region and the processor is chosen by currency
 * (Paystack: NGN/GHS/KES/ZAR/USD, Stripe: EUR/GBP). Writes to the shared
 * `payments` table so Verify-payment / webhooks continue to work.
 */
export async function initializeCheckout(req: AuthRequest, res: Response) {
  const { moduleType, referenceId, amount, paymentProvider, paymentMethod, metadata, depositOnly } =
    req.body;

  if (!moduleType || !referenceId || !amount) {
    throw new BadRequestError('Missing required fields: moduleType, referenceId, amount');
  }
  const moduleName = MODULE_NAME[moduleType];
  if (!moduleName) {
    throw new BadRequestError('Invalid module type');
  }

  const userId = req.user!.id;
  const userEmail = req.user!.email || req.body.userEmail;

  // Deposit calculation (optional), mirroring the edge function.
  let amountToPay = amount;
  if (depositOnly) {
    const { data: depositCalc, error: depositError } = await supabase.rpc('calculate_deposit', {
      p_module_name: moduleName,
      p_total_amount: amount,
    });
    amountToPay = depositError ? amount : depositCalc;
  }

  // Currency is authoritative on the server: resolved from the paid entity.
  const currency = await resolveEntityCurrency(moduleType, referenceId);

  const useMock = paymentProvider === 'mock' || process.env.USE_MOCK_PAYMENT === 'true';
  const effectiveProvider = useMock ? 'mock' : selectProcessor(currency);

  const transactionId = `${moduleType.toUpperCase()}_${Date.now()}_${uuidv4().substring(0, 8)}`;
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const forwarded = req.headers['x-forwarded-for'];
  const ipAddress = Array.isArray(forwarded)
    ? forwarded[0]
    : (forwarded?.split(',')[0].trim() ?? req.headers['x-real-ip'] ?? null);

  // Create the payment record.
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      payment_type: moduleType,
      reference_id: referenceId,
      user_id: userId,
      amount: amountToPay,
      currency,
      payment_provider: effectiveProvider,
      payment_method: paymentMethod,
      transaction_id: transactionId,
      payment_status: 'pending',
      is_escrowed: true,
      expires_at: expiresAt,
      metadata: { full_amount: amount, deposit_only: depositOnly, test_mode: useMock, ...metadata },
      ip_address: ipAddress,
      user_agent: req.headers['user-agent'],
    })
    .select()
    .single();

  if (paymentError) {
    logger.error('Failed to create payment record', { error: paymentError.message });
    throw new Error(`Failed to initialize payment: ${paymentError.message}`);
  }

  const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/callback`;
  const providerMetadata = {
    payment_id: payment.id,
    module_type: moduleType,
    reference_id: referenceId,
    user_id: userId,
  };

  let paymentUrl = '';
  let providerReference = '';
  let providerDetails: Record<string, unknown> = {};

  if (useMock) {
    paymentUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/mock-payment?transaction_id=${transactionId}&amount=${amountToPay}`;
    providerReference = transactionId;
    providerDetails = { mock_payment: true };
  } else if (effectiveProvider === 'stripe') {
    const result = await stripeService.createCheckoutSession({
      email: userEmail,
      amount: amountToPay,
      currency,
      reference: transactionId,
      callbackUrl,
      description: `${moduleName} payment`,
      metadata: Object.fromEntries(
        Object.entries(providerMetadata).map(([k, v]) => [k, String(v)])
      ),
    });
    paymentUrl = result.authorizationUrl;
    providerReference = result.reference;
    providerDetails = { payment_intent: result.paymentIntentId };
  } else {
    const result = await paystackService.initializeTransaction({
      email: userEmail,
      amount: amountToPay,
      currency,
      reference: transactionId,
      callback_url: callbackUrl,
      metadata: providerMetadata,
    });
    paymentUrl = result.authorization_url;
    providerReference = result.reference;
    providerDetails = { paystack_access_code: result.access_code };
  }

  await supabase
    .from('payments')
    .update({
      provider_reference: providerReference,
      metadata: { ...payment.metadata, provider_details: providerDetails },
    })
    .eq('id', payment.id);

  logger.info('Payment initialized', { paymentId: payment.id, currency, provider: effectiveProvider });

  res.status(200).json({
    success: true,
    message: 'Payment initialized successfully',
    test_mode: useMock,
    data: {
      payment_id: payment.id,
      transaction_id: transactionId,
      payment_url: paymentUrl,
      amount_to_pay: amountToPay,
      currency,
      payment_provider: effectiveProvider,
      payment_method: paymentMethod,
      expires_at: expiresAt,
      reference: providerReference,
      next_step: 'Redirect user to payment_url',
    },
  });
}
