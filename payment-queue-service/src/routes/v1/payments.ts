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
 * POST /api/v1/payments/request
 * Create new payment request
 */
router.post(
  '/request',
  auth,
  validatePaymentRequest,
  encryptSensitiveFields(['email', 'phone']),
  asyncHandler(createPaymentRequest)
);

/**
 * GET /api/v1/payments/:paymentId/status
 * Get payment status
 */
router.get('/:paymentId/status', auth, validatePaymentStatus, asyncHandler(getPaymentStatus));

/**
 * POST /api/v1/payments/:paymentId/refund
 * Request payment refund
 */
router.post('/:paymentId/refund', auth, validateRefundRequest, asyncHandler(requestRefund));

export default router;
