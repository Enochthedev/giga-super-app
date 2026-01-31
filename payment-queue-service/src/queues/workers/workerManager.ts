import { ConnectionOptions, Job, QueueEvents, Worker } from 'bullmq';

import logger from '../../utils/logger';
import { getRedisConnection, REDIS_CONNECTIONS } from '../../utils/redis';

// Queue configurations (mutable for processor registration)
const queueProcessors: Record<string, ((job: Job) => Promise<unknown>) | null> = {
  'payment-queue': null,
  'webhook-queue': null,
  'refund-queue': null,
  'settlement-queue': null,
  'notification-queue': null,
};

type QueueName = keyof typeof queueProcessors;

// Active workers and events
const activeWorkers: Map<string, Worker> = new Map();
const queueEventsMap: Map<string, QueueEvents> = new Map();
let isInitialized = false;

/**
 * Register a processor function for a queue
 */
export function registerProcessor(
  queueName: QueueName,
  processor: (job: Job) => Promise<unknown>
): void {
  queueProcessors[queueName] = processor;
  logger.debug(`Registered processor for ${queueName}`);
}

/**
 * Create and start a worker for a specific queue
 */
function activateWorker(queueName: string): Worker | null {
  if (activeWorkers.has(queueName)) {
    return activeWorkers.get(queueName)!;
  }

  const processor = queueProcessors[queueName];
  if (!processor) {
    logger.warn(`No processor registered for ${queueName}`);
    return null;
  }

  const connection = getRedisConnection(REDIS_CONNECTIONS.WORKERS);

  const worker = new Worker(queueName, processor, {
    connection: connection as ConnectionOptions,
    concurrency: 5,
    // Use longer lock duration to prevent job stealing
    lockDuration: 30000,
  });

  worker.on('completed', job => {
    logger.info(`Job ${job.id} completed on ${queueName}`);
    // Check if there are more jobs, if not, schedule deactivation
    scheduleDeactivation(queueName);
  });

  worker.on('failed', (job, error) => {
    logger.error(`Job ${job?.id} failed on ${queueName}`, { error: error.message });
    scheduleDeactivation(queueName);
  });

  worker.on('error', error => {
    logger.error(`Worker error on ${queueName}`, { error: error.message });
  });

  activeWorkers.set(queueName, worker);
  logger.info(`Worker activated for ${queueName}`);

  return worker;
}

/**
 * Deactivation timers - deactivate worker after idle period
 */
const deactivationTimers: Map<string, NodeJS.Timeout> = new Map();
const DEACTIVATION_DELAY = 60000; // 1 minute of idle before deactivating

function scheduleDeactivation(queueName: string): void {
  // Clear existing timer
  const existingTimer = deactivationTimers.get(queueName);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Schedule new deactivation
  const timer = setTimeout(async () => {
    await deactivateWorkerIfIdle(queueName);
  }, DEACTIVATION_DELAY);

  deactivationTimers.set(queueName, timer);
}

/**
 * Deactivate a worker if idle
 */
async function deactivateWorkerIfIdle(queueName: string): Promise<void> {
  const connection = getRedisConnection(REDIS_CONNECTIONS.QUEUES);

  try {
    // Check if there are any waiting jobs
    const waitingCount = await connection.llen(`bull:${queueName}:wait`);
    const activeCount = await connection.llen(`bull:${queueName}:active`);

    if (waitingCount === 0 && activeCount === 0) {
      await deactivateWorker(queueName);
    }
  } catch (error) {
    // If we can't check, don't deactivate
    logger.debug(`Could not check job counts for ${queueName}`);
  }
}

/**
 * Deactivate a worker to stop polling
 */
async function deactivateWorker(queueName: string): Promise<void> {
  const worker = activeWorkers.get(queueName);
  if (worker) {
    await worker.close();
    activeWorkers.delete(queueName);
    logger.info(`Worker deactivated for ${queueName}`);
  }
}

/**
 * Initialize queue event listeners (Pub/Sub - low cost)
 */
export function initializeWorkerManager(): void {
  if (isInitialized) return;

  const connection = getRedisConnection(REDIS_CONNECTIONS.QUEUES);

  for (const queueName of Object.keys(queueProcessors)) {
    const events = new QueueEvents(queueName, {
      connection: connection as ConnectionOptions,
    });

    // Listen for new jobs - this uses Pub/Sub, not polling!
    events.on('waiting', ({ jobId }) => {
      logger.debug(`Job ${jobId} waiting in ${queueName}`);
      // Activate worker when job arrives
      activateWorker(queueName);
    });

    events.on('error', error => {
      logger.error(`QueueEvents error for ${queueName}`, { error: error.message });
    });

    queueEventsMap.set(queueName, events);
    logger.info(`QueueEvents listener initialized for ${queueName}`);
  }

  isInitialized = true;
  logger.info('WorkerManager initialized - workers will activate on job arrival');
}

/**
 * Check if there are any pending jobs and activate workers if needed
 */
export async function processExistingJobs(): Promise<void> {
  const connection = getRedisConnection(REDIS_CONNECTIONS.QUEUES);

  for (const queueName of Object.keys(queueProcessors)) {
    try {
      // Check if there are waiting jobs
      const waitingCount = await connection.llen(`bull:${queueName}:wait`);
      if (waitingCount > 0) {
        logger.info(`Found ${waitingCount} waiting jobs in ${queueName}, activating worker`);
        activateWorker(queueName);
      }
    } catch (error) {
      logger.debug(`Could not check waiting jobs for ${queueName}`);
    }
  }
}

/**
 * Close all workers and event listeners gracefully
 */
export async function closeWorkerManager(): Promise<void> {
  logger.info('Closing WorkerManager...');

  // Clear all deactivation timers
  for (const timer of deactivationTimers.values()) {
    clearTimeout(timer);
  }
  deactivationTimers.clear();

  // Close all active workers
  const workerClosePromises = Array.from(activeWorkers.entries()).map(async ([name, worker]) => {
    try {
      await worker.close();
      logger.info(`Worker closed: ${name}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(`Error closing worker ${name}`, { error: message });
    }
  });

  // Close all queue events
  const eventsClosePromises = Array.from(queueEventsMap.entries()).map(async ([name, events]) => {
    try {
      await events.close();
      logger.info(`QueueEvents closed: ${name}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(`Error closing QueueEvents ${name}`, { error: message });
    }
  });

  await Promise.all([...workerClosePromises, ...eventsClosePromises]);

  activeWorkers.clear();
  queueEventsMap.clear();
  isInitialized = false;

  logger.info('WorkerManager closed');
}

/**
 * Get status of all workers
 */
export function getWorkerStatus(): Record<string, boolean> {
  const status: Record<string, boolean> = {};
  for (const queueName of Object.keys(queueProcessors)) {
    status[queueName] = activeWorkers.has(queueName);
  }
  return status;
}
