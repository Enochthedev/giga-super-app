import { Queue, QueueOptions } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';
import logger from '../utils/logger';

// Redis connection
const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Queue options
const queueOptions: QueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: {
      count: 200,
      age: 24 * 3600,
    },
    removeOnFail: {
      count: 500,
      age: 30 * 24 * 3600, // 30 days
    },
  },
};

// Create refund queue
export const refundQueue = new Queue('refund-queue', queueOptions);

refundQueue.on('error', (error) => {
  logger.error('Refund queue error', { error: error.message });
});

logger.info('Refund queue initialized');

/**
 * Add refund processing job
 */
export async function addRefundJob(
  jobData: {
    refundId: string;
    transactionId: string;
    amount: number;
    reason: string;
    userId: string;
    requestedBy: string;
  }
) {
  try {
    const job = await refundQueue.add(
      'process-refund',
      jobData,
      {
        jobId: jobData.refundId,
        priority: 2, // Medium-high priority
      }
    );

    logger.info('Refund job added to queue', {
      jobId: job.id,
      refundId: jobData.refundId,
      transactionId: jobData.transactionId,
      amount: jobData.amount,
    });

    return job;
  } catch (error: any) {
    logger.error('Failed to add refund job to queue', {
      error: error.message,
      refundId: jobData.refundId,
    });
    throw error;
  }
}

/**
 * Get refund job status
 */
export async function getRefundJobStatus(jobId: string) {
  try {
    const job = await refundQueue.getJob(jobId);
    
    if (!job) {
      return null;
    }

    const state = await job.getState();

    return {
      id: job.id,
      state,
      data: job.data,
      returnValue: job.returnvalue,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
    };
  } catch (error: any) {
    logger.error('Failed to get refund job status', {
      error: error.message,
      jobId,
    });
    return null;
  }
}

/**
 * Get refund queue metrics
 */
export async function getRefundQueueMetrics() {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      refundQueue.getWaitingCount(),
      refundQueue.getActiveCount(),
      refundQueue.getCompletedCount(),
      refundQueue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  } catch (error: any) {
    logger.error('Failed to get refund queue metrics', { error: error.message });
    return null;
  }
}

export async function closeRefundQueue() {
  try {
    await refundQueue.close();
    logger.info('Refund queue closed');
  } catch (error: any) {
    logger.error('Error closing refund queue', { error: error.message });
  }
}
