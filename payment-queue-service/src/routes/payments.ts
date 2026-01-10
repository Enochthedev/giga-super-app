import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';

import { config } from '@/config';
import { authenticate, AuthRequest } from '@/middleware/auth';
import { paymentQueue, refundQueue } from '@/queues/paymentQueue';
import { PaymentRequest, RefundRequest } from '@/types';
import { BadRequestError } from '@/utils/errors';
import logger from '@/utils/logger';

const router = Router();

// Validation middleware
const validatePaymentRequest = [
  body('module').isIn(['hotel', 'taxi', 'ecommerce']).withMessage('Invalid module'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('currency').isString().isLength({ min: 3, max: 3 }).withMessage('Invalid currency code'),
  body('userId').isUUID().withMessage('Invalid user ID'),
  body('branchId').isString().notEmpty().withMessage('Branch ID is required'),
  body('stateId').isString().notEmpty().withMessage('State ID is required'),
  body('metadata.moduleTransactionId').isUUID().withMessage('Invalid module transaction ID'),
  body('metadata.customerEmail').optional().isEmail().withMessage('Invalid email'),
  body('paymentMethod').optional().isIn(['paystack', 'stripe']).withMessage('Invalid payment method'),
];

const validateRefundRequest = [
  body('transactionId').isString().notEmpty().withMessage('Transaction ID is required'),
  body('reason').isString().notEmpty().withMessage('Reason is required'),
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
];

// POST /payments - Create payment request
router.post(
  '/',
  authenticate,
  validatePaymentRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const { module, amount, currency, userId, branchId, stateId, metadata, paymentMethod } =
        req.body;

      // Determine commission rate based on module
      const commissionRate = config.commissionRates[module as keyof typeof config.commissionRates];

      const paymentRequest: PaymentRequest = {
        id: uuidv4(),
        module,
        amount,
        currency: currency.toUpperCase(),
        userId,
        branchId,
        stateId,
        metadata,
        commissionRate,
        paymentMethod: paymentMethod || 'paystack',
        createdAt: new Date(),
      };

      // Add to queue
      const job = await paymentQueue.add('process-payment', paymentRequest, {
        priority: module === 'taxi' ? 1 : 2, // Prioritize taxi payments
        jobId: paymentRequest.id,
      });

      logger.info('Payment request queued', {
        jobId: job.id,
        paymentId: paymentRequest.id,
        module,
        amount,
      });

      res.status(202).json({
        success: true,
        message: 'Payment request queued for processing',
        data: {
          paymentId: paymentRequest.id,
          jobId: job.id,
          status: 'queued',
        },
      });
    } catch (error: any) {
      logger.error('Failed to queue payment', { error: error.message });
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// GET /payments/:paymentId/status - Get payment status
router.get('/:paymentId/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId } = req.params;

    // Get job from queue
    const job = await paymentQueue.getJob(paymentId);

    if (!job) {
      throw new BadRequestError('Payment not found in queue');
    }

    const state = await job.getState();
    const {progress} = job;
    const result = job.returnvalue;

    res.json({
      success: true,
      data: {
        paymentId,
        jobId: job.id,
        state,
        progress,
        result: result || null,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get payment status', { error: error.message });
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /payments/refund - Request refund
router.post(
  '/refund',
  authenticate,
  validateRefundRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const { transactionId, reason, amount } = req.body;

      const refundRequest: RefundRequest = {
        transactionId,
        reason,
        amount,
        userId: req.user!.id,
      };

      // Add to refund queue
      const job = await refundQueue.add('process-refund', refundRequest, {
        priority: 1,
      });

      logger.info('Refund request queued', {
        jobId: job.id,
        transactionId,
      });

      res.status(202).json({
        success: true,
        message: 'Refund request queued for processing',
        data: {
          transactionId,
          jobId: job.id,
          status: 'queued',
        },
      });
    } catch (error: any) {
      logger.error('Failed to queue refund', { error: error.message });
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// GET /payments/queue/stats - Get queue statistics
router.get('/queue/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      paymentQueue.getWaitingCount(),
      paymentQueue.getActiveCount(),
      paymentQueue.getCompletedCount(),
      paymentQueue.getFailedCount(),
      paymentQueue.getDelayedCount(),
    ]);

    res.json({
      success: true,
      data: {
        queue: 'payment-processing',
        stats: {
          waiting,
          active,
          completed,
          failed,
          delayed,
          total: waiting + active + completed + failed + delayed,
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to get queue stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
