import logger from '../../utils/logger';
import {
  paymentWorker,
  closePaymentWorker,
} from './payment.worker';
import {
  webhookWorker,
  closeWebhookWorker,
} from './webhook.worker';
import {
  refundWorker,
  closeRefundWorker,
} from './refund.worker';
import {
  settlementWorker,
  closeSettlementWorker,
} from './settlement.worker';
import {
  notificationWorker,
  closeNotificationWorker,
} from './notification.worker';

// Export all workers
export {
  paymentWorker,
  webhookWorker,
  refundWorker,
  settlementWorker,
  notificationWorker,
};

/**
 * Initialize all workers
 */
export function initializeWorkers() {
  logger.info('All queue workers initialized', {
    workers: [
      'payment-worker',
      'webhook-worker',
      'refund-worker',
      'settlement-worker',
      'notification-worker',
    ],
  });
}

/**
 * Close all workers gracefully
 */
export async function closeAllWorkers() {
  logger.info('Closing all workers...');
  
  await Promise.all([
    closePaymentWorker(),
    closeWebhookWorker(),
    closeRefundWorker(),
    closeSettlementWorker(),
    closeNotificationWorker(),
  ]);
  
  logger.info('All workers closed');
}

// Initialize workers on module load
initializeWorkers();
