import { Router } from 'express';
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
 *               - currency
 *               - userId
 *             properties:
 *               module:
 *                 type: string
 *                 enum: [hotel, taxi, ecommerce]
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
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
