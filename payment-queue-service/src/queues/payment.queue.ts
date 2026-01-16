import { Queue, QueueOptions } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';
import logger from '../utils/logger';

// Redis connection
const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

connection.on('connect', () => {
  logger.info('Redis connected for payment queue');
});

connection.on('error', error => {
  logger.error('Redis connection error', { error: error.message });
});

// Queue options
const queueOptions: QueueOptions = {
  connection: connection as any,
  defaultJobOptions: {
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
  },
};

// Create payment queue
export const paymentQueue = new Queue('payment-queue', queueOptions);

paymentQueue.on('error', error => {
  logger.error('Payment queue error', { error: error.message });
});

logger.info('Payment queue initialized');

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
    const progress = job.progress;
    const returnValue = job.returnvalue;
    const failedReason = job.failedReason;

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
export async function getQueueMetrics() {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      paymentQueue.getWaitingCount(),
      paymentQueue.getActiveCount(),
      paymentQueue.getCompletedCount(),
      paymentQueue.getFailedCount(),
      paymentQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  } catch (error: any) {
    logger.error('Failed to get queue metrics', { error: error.message });
    return null;
  }
}

// Graceful shutdown
export async function closePaymentQueue() {
  try {
    await paymentQueue.close();
    await connection.quit();
    logger.info('Payment queue closed');
  } catch (error: any) {
    logger.error('Error closing payment queue', { error: error.message });
  }
}
