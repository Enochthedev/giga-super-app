import { Router, Request, Response } from 'express';
import logger from '../utils/logger';
import {
  getQueueMetrics as getPaymentQueueMetrics,
} from '../queues/payment.queue';
import { getWebhookQueueMetrics } from '../queues/webhook.queue';
import { getRefundQueueMetrics } from '../queues/refund.queue';
import { getSettlementQueueMetrics } from '../queues/settlement.queue';
import { getNotificationQueueMetrics } from '../queues/notification.queue';

const router = Router();

/**
 * GET /metrics
 * Prometheus-compatible metrics endpoint
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Get queue metrics
    const paymentQueue = await getPaymentQueueMetrics();
    const webhookQueue = await getWebhookQueueMetrics();
    const refundQueue = await getRefundQueueMetrics();
    const settlementQueue = await getSettlementQueueMetrics();
    const notificationQueue = await getNotificationQueueMetrics();

    // Get process metrics
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Build Prometheus-format metrics
    const metrics: string[] = [];

    // Help and type declarations
    metrics.push('# HELP payment_queue_jobs_waiting Number of jobs waiting in payment queue');
    metrics.push('# TYPE payment_queue_jobs_waiting gauge');
    metrics.push(`payment_queue_jobs_waiting ${paymentQueue?.waiting || 0}`);

    metrics.push('# HELP payment_queue_jobs_active Number of active jobs in payment queue');
    metrics.push('# TYPE payment_queue_jobs_active gauge');
    metrics.push(`payment_queue_jobs_active ${paymentQueue?.active || 0}`);

    metrics.push('# HELP payment_queue_jobs_completed Number of completed jobs in payment queue');
    metrics.push('# TYPE payment_queue_jobs_completed counter');
    metrics.push(`payment_queue_jobs_completed ${paymentQueue?.completed || 0}`);

    metrics.push('# HELP payment_queue_jobs_failed Number of failed jobs in payment queue');
    metrics.push('# TYPE payment_queue_jobs_failed counter');
    metrics.push(`payment_queue_jobs_failed ${paymentQueue?.failed || 0}`);

    // Webhook queue metrics
    metrics.push('# HELP webhook_queue_jobs_waiting Number of jobs waiting in webhook queue');
    metrics.push('# TYPE webhook_queue_jobs_waiting gauge');
    metrics.push(`webhook_queue_jobs_waiting ${webhookQueue?.waiting || 0}`);

    metrics.push('# HELP webhook_queue_jobs_active Number of active jobs in webhook queue');
    metrics.push('# TYPE webhook_queue_jobs_active gauge');
    metrics.push(`webhook_queue_jobs_active ${webhookQueue?.active || 0}`);

    metrics.push('# HELP webhook_queue_jobs_completed Number of completed jobs in webhook queue');
    metrics.push('# TYPE webhook_queue_jobs_completed counter');
    metrics.push(`webhook_queue_jobs_completed ${webhookQueue?.completed || 0}`);

    metrics.push('# HELP webhook_queue_jobs_failed Number of failed jobs in webhook queue');
    metrics.push('# TYPE webhook_queue_jobs_failed counter');
    metrics.push(`webhook_queue_jobs_failed ${webhookQueue?.failed || 0}`);

    // Refund queue metrics
    metrics.push('# HELP refund_queue_jobs_waiting Number of jobs waiting in refund queue');
    metrics.push('# TYPE refund_queue_jobs_waiting gauge');
    metrics.push(`refund_queue_jobs_waiting ${refundQueue?.waiting || 0}`);

    metrics.push('# HELP refund_queue_jobs_active Number of active jobs in refund queue');
    metrics.push('# TYPE refund_queue_jobs_active gauge');
    metrics.push(`refund_queue_jobs_active ${refundQueue?.active || 0}`);

    // Settlement queue metrics
    metrics.push('# HELP settlement_queue_jobs_waiting Number of jobs waiting in settlement queue');
    metrics.push('# TYPE settlement_queue_jobs_waiting gauge');
    metrics.push(`settlement_queue_jobs_waiting ${settlementQueue?.waiting || 0}`);

    metrics.push('# HELP settlement_queue_jobs_active Number of active jobs in settlement queue');
    metrics.push('# TYPE settlement_queue_jobs_active gauge');
    metrics.push(`settlement_queue_jobs_active ${settlementQueue?.active || 0}`);

    // Notification queue metrics
    metrics.push('# HELP notification_queue_jobs_waiting Number of jobs waiting in notification queue');
    metrics.push('# TYPE notification_queue_jobs_waiting gauge');
    metrics.push(`notification_queue_jobs_waiting ${notificationQueue?.waiting || 0}`);

    metrics.push('# HELP notification_queue_jobs_active Number of active jobs in notification queue');
    metrics.push('# TYPE notification_queue_jobs_active gauge');
    metrics.push(`notification_queue_jobs_active ${notificationQueue?.active || 0}`);

    // Process metrics
    metrics.push('# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds');
    metrics.push('# TYPE process_cpu_user_seconds_total counter');
    metrics.push(`process_cpu_user_seconds_total ${cpuUsage.user / 1000000}`);

    metrics.push('# HELP process_cpu_system_seconds_total Total system CPU time spent in seconds');
    metrics.push('# TYPE process_cpu_system_seconds_total counter');
    metrics.push(`process_cpu_system_seconds_total ${cpuUsage.system / 1000000}`);

    metrics.push('# HELP process_resident_memory_bytes Resident memory size in bytes');
    metrics.push('# TYPE process_resident_memory_bytes gauge');
    metrics.push(`process_resident_memory_bytes ${memUsage.rss}`);

    metrics.push('# HELP process_heap_bytes Heap memory size in bytes');
    metrics.push('# TYPE process_heap_bytes gauge');
    metrics.push(`process_heap_bytes ${memUsage.heapUsed}`);

    metrics.push('# HELP process_heap_total_bytes Total heap memory size in bytes');
    metrics.push('# TYPE process_heap_total_bytes gauge');
    metrics.push(`process_heap_total_bytes ${memUsage.heapTotal}`);

    metrics.push('# HELP nodejs_version_info Node.js version info');
    metrics.push('# TYPE nodejs_version_info gauge');
    metrics.push(`nodejs_version_info{version="${process.version}"} 1`);

    // Join all metrics with newlines
    const output = metrics.join('\n') + '\n';

    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(output);
  } catch (error: any) {
    logger.error('Failed to generate metrics', { error: error.message });
    res.status(500).send('# Error generating metrics\n');
  }
});

export default router;
