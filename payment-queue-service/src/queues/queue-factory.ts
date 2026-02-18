/**
 * Queue Factory - Creates BullMQ queues or in-memory fallbacks based on Redis availability
 */
import { Queue, QueueOptions } from 'bullmq';

import logger from '../utils/logger';
import {
  InMemoryQueue,
  REDIS_CONNECTIONS,
  getInMemoryQueue,
  getRedisConnection,
  isRedisEnabled,
} from '../utils/redis';

// Type for queue that works with both BullMQ and in-memory
export type QueueLike = Queue | InMemoryQueue;

// Get shared Redis connection (may be null if disabled)
const connection = getRedisConnection(REDIS_CONNECTIONS.QUEUES);

/**
 * Create a queue with Redis or in-memory fallback
 */
export function createQueue(
  name: string,
  options: Partial<QueueOptions['defaultJobOptions']> = {}
): QueueLike {
  if (isRedisEnabled() && connection) {
    const queueOptions: QueueOptions = {
      connection: connection as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          count: 100,
          age: 24 * 3600,
        },
        removeOnFail: {
          count: 500,
          age: 7 * 24 * 3600,
        },
        ...options,
      },
    };

    const queue = new Queue(name, queueOptions);
    queue.on('error', error => {
      logger.error(`${name} queue error`, { error: error.message });
    });
    logger.info(`${name} queue initialized with Redis/BullMQ`);
    return queue;
  } else {
    logger.info(`${name} queue initialized with in-memory fallback (Redis disabled)`);
    return getInMemoryQueue(name);
  }
}

/**
 * Check if a queue is a BullMQ queue (vs in-memory)
 */
export function isBullMQQueue(queue: QueueLike): queue is Queue {
  return isRedisEnabled() && 'opts' in queue;
}

/**
 * Get queue metrics (works for both BullMQ and in-memory)
 */
export async function getQueueMetrics(queue: QueueLike) {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
      redisEnabled: isRedisEnabled(),
    };
  } catch (error: any) {
    logger.error('Failed to get queue metrics', { error: error.message });
    return null;
  }
}

/**
 * Close a queue
 */
export async function closeQueue(queue: QueueLike, name: string) {
  try {
    await queue.close();
    logger.info(`${name} queue closed`);
  } catch (error: any) {
    logger.error(`Error closing ${name} queue`, { error: error.message });
  }
}

// Export Redis status for use in routes
export { isRedisEnabled };
