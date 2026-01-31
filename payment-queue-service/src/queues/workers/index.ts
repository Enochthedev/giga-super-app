import logger from '../../utils/logger';
import {
  closeWorkerManager,
  getWorkerStatus,
  initializeWorkerManager,
  processExistingJobs,
  registerProcessor,
} from './workerManager';

// Import processor functions from each worker
import { notificationProcessor } from './notification.worker';
import { paymentProcessor } from './payment.worker';
import { refundProcessor } from './refund.worker';
import { settlementProcessor } from './settlement.worker';
import { webhookProcessor } from './webhook.worker';

/**
 * Initialize all workers via WorkerManager (on-demand activation)
 */
export function initializeWorkers() {
  // Register all processors
  registerProcessor('payment-queue', paymentProcessor);
  registerProcessor('webhook-queue', webhookProcessor);
  registerProcessor('refund-queue', refundProcessor);
  registerProcessor('settlement-queue', settlementProcessor);
  registerProcessor('notification-queue', notificationProcessor);

  // Initialize the worker manager (sets up Pub/Sub listeners)
  initializeWorkerManager();

  // Process any existing jobs that may be waiting
  processExistingJobs().catch(error => {
    logger.warn('Could not check for existing jobs', { error: error.message });
  });

  logger.info('On-demand worker system initialized', {
    queues: [
      'payment-queue',
      'webhook-queue',
      'refund-queue',
      'settlement-queue',
      'notification-queue',
    ],
  });
}

/**
 * Close all workers gracefully
 */
export async function closeAllWorkers() {
  await closeWorkerManager();
}

/**
 * Get status of all workers
 */
export { getWorkerStatus };

// Initialize workers on module load
initializeWorkers();
