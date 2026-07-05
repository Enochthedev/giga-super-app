import { Router } from 'express';
import { initializeCheckout } from '../../controllers/checkout.controller';
import {
  createPaymentRequest,
  getPaymentStatus,
  requestRefund,
} from '../../controllers/payment.controller';
import { authenticate as auth } from '../../middleware/auth';
import { encryptSensitiveFields } from '../../middleware/encryption.middleware';
import {
  validatePaymentRequest,
  validatePaymentStatus,
  validateRefundRequest,
} from '../../middleware/validation.middleware';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

/**
 * @swagger
 * /api/v1/payments/request:
 *   post:
 *     summary: Create payment request
 *     description: Create a new payment request and queue it for processing
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - module
 *               - amount
 *               - userId
 *             properties:
 *               module:
 *                 type: string
 *                 enum: [hotel, taxi, ecommerce]
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 enum: [NGN, GHS, KES, ZAR, USD, EUR, GBP]
 *                 description: >-
 *                   Optional/advisory. The server resolves the authoritative currency
 *                   from the transaction region and selects the processor (Paystack for
 *                   NGN/GHS/KES/ZAR/USD, Stripe for EUR/GBP). If supplied it must match
 *                   the resolved currency or the request is rejected.
 *               userId:
 *                 type: string
 *                 format: uuid
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *     responses:
 *       202:
 *         description: Payment request created
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/request',
  auth,
  validatePaymentRequest,
  encryptSensitiveFields(['email', 'phone']),
  asyncHandler(createPaymentRequest)
);

/**
 * @swagger
 * /api/v1/payments/initialize:
 *   post:
 *     summary: Initialize a payment (edge-compatible)
 *     description: >-
 *       Drop-in replacement for the Supabase Initialize-payment edge function.
 *       Currency is resolved server-side from the paid entity's region and the
 *       processor is chosen by currency (Paystack: NGN/GHS/KES/ZAR/USD, Stripe:
 *       EUR/GBP). Returns a hosted checkout URL.
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [moduleType, referenceId, amount]
 *             properties:
 *               moduleType:
 *                 type: string
 *                 enum: [hotel_booking, ecommerce_order, taxi_ride, ad_campaign]
 *               referenceId: { type: string, format: uuid }
 *               amount: { type: number }
 *               paymentMethod: { type: string }
 *               paymentProvider:
 *                 type: string
 *                 description: Ignored except 'mock'; the real processor is chosen by currency.
 *               depositOnly: { type: boolean }
 *     responses:
 *       200: { description: Payment initialized (returns payment_url) }
 *       400: { description: Invalid request }
 *       401: { description: Unauthorized }
 */
router.post('/initialize', auth, asyncHandler(initializeCheckout));

/**
 * @swagger
 * /api/v1/payments/{paymentId}/status:
 *   get:
 *     summary: Get payment status
 *     description: Get the current status of a payment request
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment status
 *       404:
 *         description: Payment not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:paymentId/status', auth, validatePaymentStatus, asyncHandler(getPaymentStatus));

/**
 * @swagger
 * /api/v1/payments/{paymentId}/refund:
 *   post:
 *     summary: Request refund
 *     description: Request a refund for a completed payment
 *     tags: [Refunds]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       202:
 *         description: Refund request created
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/:paymentId/refund', auth, validateRefundRequest, asyncHandler(requestRefund));

export default router;
