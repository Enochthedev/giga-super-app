import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { validateWebhook } from '../middleware/validation.middleware';
import {
  handlePaystackWebhook,
  handleStripeWebhook,
} from '../controllers/webhook.controller';

const router = Router();

/**
 * POST /api/v1/webhooks/paystack
 * Handle Paystack webhook events with signature verification
 */
router.post(
  '/paystack',
  validateWebhook,
  asyncHandler(handlePaystackWebhook)
);

/**
 * POST /api/v1/webhooks/stripe
 * Handle Stripe webhook events
 */
router.post(
  '/stripe',
  validateWebhook,
  asyncHandler(handleStripeWebhook)
);

export default router;
