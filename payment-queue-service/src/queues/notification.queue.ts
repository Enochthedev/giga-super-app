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
  connection: connection as any,
  defaultJobOptions: {
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
  },
};

// Create notification queue
export const notificationQueue = new Queue('notification-queue', queueOptions);

notificationQueue.on('error', (error) => {
  logger.error('Notification queue error', { error: error.message });
});

logger.info('Notification queue initialized');

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
    const job = await notificationQueue.add(
      'send-notification',
      jobData,
      {
        jobId: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        priority: 3,
        delay: options?.delay || 0,
      }
    );

    logger.info('Notification job added to queue', {
      jobId: job.id,
      userId: jobData.userId,
      type: jobData.type,
      channels: jobData.channels,
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
    const jobs = notifications.map((notification) => ({
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
    });

    return addedJobs;
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
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      notificationQueue.getWaitingCount(),
      notificationQueue.getActiveCount(),
      notificationQueue.getCompletedCount(),
      notificationQueue.getFailedCount(),
      notificationQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  } catch (error: any) {
    logger.error('Failed to get notification queue metrics', { error: error.message });
    return null;
  }
}

export async function closeNotificationQueue() {
  try {
    await notificationQueue.close();
    logger.info('Notification queue closed');
  } catch (error: any) {
    logger.error('Error closing notification queue', { error: error.message });
  }
}
