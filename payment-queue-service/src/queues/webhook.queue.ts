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
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 500,
      age: 24 * 3600,
    },
    removeOnFail: {
      count: 1000,
      age: 7 * 24 * 3600,
    },
  },
};

// Create webhook queue
export const webhookQueue = new Queue('webhook-queue', queueOptions);

webhookQueue.on('error', (error) => {
  logger.error('Webhook queue error', { error: error.message });
});

logger.info('Webhook queue initialized');

/**
 * Add webhook processing job
 */
export async function addWebhookJob(
  jobData: {
    provider: 'paystack' | 'stripe';
    event: string;
    data: any;
    signature: string;
    receivedAt: string;
  }
) {
  try {
    const job = await webhookQueue.add(
      'process-webhook',
      jobData,
      {
        jobId: `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        priority: 1, // High priority for webhooks
      }
    );

    logger.info('Webhook job added to queue', {
      jobId: job.id,
      provider: jobData.provider,
      event: jobData.event,
    });

    return job;
  } catch (error: any) {
    logger.error('Failed to add webhook job to queue', {
      error: error.message,
      provider: jobData.provider,
    });
    throw error;
  }
}

/**
 * Get webhook queue metrics
 */
export async function getWebhookQueueMetrics() {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      webhookQueue.getWaitingCount(),
      webhookQueue.getActiveCount(),
      webhookQueue.getCompletedCount(),
      webhookQueue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  } catch (error: any) {
    logger.error('Failed to get webhook queue metrics', { error: error.message });
    return null;
  }
}

export async function closeWebhookQueue() {
  try {
    await webhookQueue.close();
    logger.info('Webhook queue closed');
  } catch (error: any) {
    logger.error('Error closing webhook queue', { error: error.message });
  }
}
