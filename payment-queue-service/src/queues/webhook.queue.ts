import logger from '../utils/logger';
import {
  QueueLike,
  closeQueue,
  createQueue,
  getQueueMetrics,
  isRedisEnabled,
} from './queue-factory';

// Create webhook queue with Redis or in-memory fallback
export const webhookQueue: QueueLike = createQueue('webhook-queue', {
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
});

/**
 * Add webhook processing job
 */
export async function addWebhookJob(jobData: {
  provider: 'paystack' | 'stripe';
  event: string;
  data: any;
  signature: string;
  receivedAt: string;
}) {
  try {
    const job = await webhookQueue.add('process-webhook', jobData, {
      jobId: `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      priority: 1, // High priority for webhooks
    });

    logger.info('Webhook job added to queue', {
      jobId: job.id,
      provider: jobData.provider,
      event: jobData.event,
      redisEnabled: isRedisEnabled(),
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
  return getQueueMetrics(webhookQueue);
}

export async function closeWebhookQueue() {
  return closeQueue(webhookQueue, 'webhook');
}
