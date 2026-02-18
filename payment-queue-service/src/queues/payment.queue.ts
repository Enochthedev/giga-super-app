import { config } from '../config';
import logger from '../utils/logger';
import {
  QueueLike,
  closeQueue,
  createQueue,
  getQueueMetrics,
  isRedisEnabled,
} from './queue-factory';

// Create payment queue with Redis or in-memory fallback
export const paymentQueue: QueueLike = createQueue('payment-queue', {
  attempts: config.queue.maxRetries,
  backoff: {
    type: 'exponential',
    delay: config.queue.backoffDelay,
  },
  removeOnComplete: {
    count: 100,
    age: 24 * 3600, // 24 hours
  },
  removeOnFail: {
    count: 1000,
    age: 7 * 24 * 3600, // 7 days
  },
});

/**
 * Add payment job to queue
 */
export async function addPaymentJob(
  jobData: {
    paymentId: string;
    module: string;
    amount: number;
    currency: string;
    userId: string;
    branchId: string;
    stateId: string;
    metadata: any;
    paymentMethod?: string;
  },
  options?: {
    priority?: number;
    delay?: number;
  }
) {
  try {
    const job = await paymentQueue.add('process-payment', jobData, {
      jobId: jobData.paymentId,
      priority: options?.priority || 0,
      delay: options?.delay || 0,
    });

    logger.info('Payment job added to queue', {
      jobId: job.id,
      paymentId: jobData.paymentId,
      module: jobData.module,
      amount: jobData.amount,
      redisEnabled: isRedisEnabled(),
    });

    return job;
  } catch (error: any) {
    logger.error('Failed to add payment job to queue', {
      error: error.message,
      paymentId: jobData.paymentId,
    });
    throw error;
  }
}

/**
 * Get payment job status
 */
export async function getPaymentJobStatus(jobId: string) {
  try {
    const job = await paymentQueue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const { progress } = job;
    const returnValue = job.returnvalue;
    const { failedReason } = job;

    return {
      id: job.id,
      state,
      progress,
      data: job.data,
      returnValue,
      failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  } catch (error: any) {
    logger.error('Failed to get payment job status', {
      error: error.message,
      jobId,
    });
    return null;
  }
}

/**
 * Remove payment job from queue
 */
export async function removePaymentJob(jobId: string) {
  try {
    const job = await paymentQueue.getJob(jobId);

    if (job) {
      await job.remove();
      logger.info('Payment job removed from queue', { jobId });
      return true;
    }

    return false;
  } catch (error: any) {
    logger.error('Failed to remove payment job', {
      error: error.message,
      jobId,
    });
    return false;
  }
}

/**
 * Get queue metrics
 */
export async function getPaymentQueueMetrics() {
  return getQueueMetrics(paymentQueue);
}

// Graceful shutdown
export async function closePaymentQueue() {
  return closeQueue(paymentQueue, 'payment');
}
