import { Router, Request, Response } from 'express';

import { testConnection } from '../utils/database';
import logger from '../utils/logger';
import {
  getQueueMetrics as getPaymentQueueMetrics,
} from '../queues/payment.queue';
import { getWebhookQueueMetrics } from '../queues/webhook.queue';
import { getRefundQueueMetrics } from '../queues/refund.queue';
import { getSettlementQueueMetrics } from '../queues/settlement.queue';
import { getNotificationQueueMetrics } from '../queues/notification.queue';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const dbHealthy = await testConnection();

    // Get queue health
    const paymentQueueMetrics = await getPaymentQueueMetrics();
    const webhookQueueMetrics = await getWebhookQueueMetrics();
    const refundQueueMetrics = await getRefundQueueMetrics();
    const settlementQueueMetrics = await getSettlementQueueMetrics();
    const notificationQueueMetrics = await getNotificationQueueMetrics();

    const queuesHealthy = !!(
      paymentQueueMetrics &&
      webhookQueueMetrics &&
      refundQueueMetrics &&
      settlementQueueMetrics &&
      notificationQueueMetrics
    );

    const health = {
      status: dbHealthy && queuesHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'payment-queue-service',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      checks: {
        database: dbHealthy ? 'up' : 'down',
        queues: queuesHealthy ? 'operational' : 'degraded',
        memory: {
          used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
          total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
          unit: 'MB',
        },
      },
      queues: {
        payment: paymentQueueMetrics,
        webhook: webhookQueueMetrics,
        refund: refundQueueMetrics,
        settlement: settlementQueueMetrics,
        notification: notificationQueueMetrics,
      },
    };

    const statusCode = dbHealthy && queuesHealthy ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error: any) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

router.get('/ready', async (req: Request, res: Response) => {
  try {
    const dbHealthy = await testConnection();

    if (dbHealthy) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready' });
    }
  } catch (error: any) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

export default router;
