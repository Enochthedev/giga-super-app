import { Router } from 'express';
import { handlePaystackWebhook, handleStripeWebhook } from '../../controllers/webhook.controller';
import { validateWebhook } from '../../middleware/validation.middleware';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

/**
 * @swagger
 * /api/v1/webhooks/paystack:
 *   post:
 *     summary: Paystack webhook
 *     description: Handle Paystack webhook events with signature verification
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 *       400:
 *         description: Invalid webhook signature
 */
router.post('/paystack', validateWebhook, asyncHandler(handlePaystackWebhook));

/**
 * @swagger
 * /api/v1/webhooks/stripe:
 *   post:
 *     summary: Stripe webhook
 *     description: Handle Stripe webhook events
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 *       400:
 *         description: Invalid webhook
 */
router.post('/stripe', validateWebhook, asyncHandler(handleStripeWebhook));

export default router;
