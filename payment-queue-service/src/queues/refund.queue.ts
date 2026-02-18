import logger from '../utils/logger';
import {
  QueueLike,
  closeQueue,
  createQueue,
  getQueueMetrics,
  isRedisEnabled,
} from './queue-factory';

// Create refund queue with Redis or in-memory fallback
export const refundQueue: QueueLike = createQueue('refund-queue', {
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
});

/**
 * Add refund processing job
 */
export async function addRefundJob(jobData: {
  refundId: string;
  transactionId: string;
  amount: number;
  reason: string;
  userId: string;
  requestedBy: string;
}) {
  try {
    const job = await refundQueue.add('process-refund', jobData, {
      jobId: jobData.refundId,
      priority: 2, // Medium-high priority
    });

    logger.info('Refund job added to queue', {
      jobId: job.id,
      refundId: jobData.refundId,
      transactionId: jobData.transactionId,
      amount: jobData.amount,
      redisEnabled: isRedisEnabled(),
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
  return getQueueMetrics(refundQueue);
}

export async function closeRefundQueue() {
  return closeQueue(refundQueue, 'refund');
}
