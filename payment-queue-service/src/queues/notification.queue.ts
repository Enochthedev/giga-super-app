import logger from '../utils/logger';
import {
  QueueLike,
  closeQueue,
  createQueue,
  getQueueMetrics,
  isBullMQQueue,
  isRedisEnabled,
} from './queue-factory';

// Create notification queue with Redis or in-memory fallback
export const notificationQueue: QueueLike = createQueue('notification-queue', {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
  removeOnComplete: {
    count: 1000,
    age: 7 * 24 * 3600, // 7 days
  },
  removeOnFail: {
    count: 500,
    age: 30 * 24 * 3600, // 30 days
  },
});

/**
 * Add notification job
 */
export async function addNotificationJob(
  jobData: {
    userId: string;
    type: 'payment_success' | 'payment_failed' | 'refund_processed' | 'settlement_completed';
    title: string;
    message: string;
    data?: any;
    channels?: Array<'email' | 'sms' | 'push' | 'in_app'>;
  },
  options?: {
    delay?: number;
  }
) {
  try {
    const job = await notificationQueue.add('send-notification', jobData, {
      jobId: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      priority: 3,
      delay: options?.delay || 0,
    });

    logger.info('Notification job added to queue', {
      jobId: job.id,
      userId: jobData.userId,
      type: jobData.type,
      channels: jobData.channels,
      redisEnabled: isRedisEnabled(),
    });

    return job;
  } catch (error: any) {
    logger.error('Failed to add notification job to queue', {
      error: error.message,
      userId: jobData.userId,
      type: jobData.type,
    });
    throw error;
  }
}

/**
 * Add bulk notification jobs
 */
export async function addBulkNotificationJobs(
  notifications: Array<{
    userId: string;
    type: 'payment_success' | 'payment_failed' | 'refund_processed' | 'settlement_completed';
    title: string;
    message: string;
    data?: any;
    channels?: Array<'email' | 'sms' | 'push' | 'in_app'>;
  }>
) {
  try {
    // For BullMQ, use addBulk; for in-memory, add one by one
    if (isBullMQQueue(notificationQueue)) {
      const jobs = notifications.map(notification => ({
        name: 'send-notification',
        data: notification,
        opts: {
          jobId: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          priority: 3,
        },
      }));

      const addedJobs = await notificationQueue.addBulk(jobs);

      logger.info('Bulk notification jobs added to queue', {
        count: addedJobs.length,
        redisEnabled: true,
      });

      return addedJobs;
    } else {
      // In-memory fallback: add one by one
      const addedJobs = [];
      for (const notification of notifications) {
        const job = await addNotificationJob(notification);
        addedJobs.push(job);
      }

      logger.info('Bulk notification jobs added to in-memory queue', {
        count: addedJobs.length,
        redisEnabled: false,
      });

      return addedJobs;
    }
  } catch (error: any) {
    logger.error('Failed to add bulk notification jobs', {
      error: error.message,
      count: notifications.length,
    });
    throw error;
  }
}

/**
 * Get notification queue metrics
 */
export async function getNotificationQueueMetrics() {
  return getQueueMetrics(notificationQueue);
}

export async function closeNotificationQueue() {
  return closeQueue(notificationQueue, 'notification');
}
