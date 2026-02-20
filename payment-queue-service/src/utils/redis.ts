import IORedis, { RedisOptions } from 'ioredis';

import { config } from '../config';

import logger from './logger';

/**
 * Check if Redis is enabled
 * Disable Redis for free tiers to avoid eviction policy issues
 */
export const isRedisEnabled = (): boolean => {
  const redisUrl = config.redisUrl;
  const forceDisable = process.env.DISABLE_REDIS === 'true';
  const forceEnable = process.env.FORCE_REDIS === 'true';

  // Force enable overrides everything
  if (forceEnable && redisUrl) {
    logger.info('Redis force-enabled via FORCE_REDIS=true');
    return true;
  }

  // Disable if explicitly disabled or no URL provided
  if (forceDisable || !redisUrl || redisUrl === 'redis://localhost:6379') {
    logger.info('Redis disabled - using in-memory fallback');
    return false;
  }

  // Auto-disable for known free tier Redis providers
  // Free tiers use volatile-lru eviction which breaks BullMQ (requires noeviction)
  const freeRedisPatterns = ['redis-cloud.com', 'redis.cloud', 'upstash.io', 'redislabs.com'];

  const isFreeTier = freeRedisPatterns.some(pattern => redisUrl.includes(pattern));

  if (isFreeTier && !forceEnable) {
    logger.warn('Free Redis tier detected - disabling Redis');
    logger.warn('Free tiers use volatile-lru eviction which breaks BullMQ');
    logger.warn('Set FORCE_REDIS=true to override, or use Railway Redis add-on');
    return false;
  }

  return true;
};

/**
 * Get Redis connection options with proper TLS configuration for Upstash
 * Optimized to minimize command usage
 */
export const getRedisOptions = (): RedisOptions => {
  const { redisUrl } = config;
  const isTLS = redisUrl.startsWith('rediss://');

  const options: RedisOptions = {
    maxRetriesPerRequest: null,
    // CRITICAL: Disable ready check to save commands
    enableReadyCheck: false,
    // Disable offline queue to prevent command buildup
    enableOfflineQueue: false,
    connectTimeout: 10000,
    // Use IPv4 to avoid issues with some cloud providers
    family: 4,
    // Lazy connect - don't connect until first command
    lazyConnect: true,
    retryStrategy: (times: number) => {
      // Reduce retries to save commands
      if (times > 5) {
        logger.error('Redis connection failed after 5 retries');
        return null;
      }
      const delay = Math.min(times * 500, 3000);
      logger.info(`Redis retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
  };

  // Enable TLS for rediss:// URLs (required for Upstash)
  if (isTLS) {
    options.tls = {
      rejectUnauthorized: false, // Upstash uses self-signed certs in some cases
    };
  }

  return options;
};

/**
 * Connection pool for named connections
 * BullMQ requires separate connections for Queue and Worker,
 * but we reuse within the same type to minimize total connections
 */
const connectionPool: Map<string, IORedis> = new Map();

/**
 * In-memory job storage for when Redis is disabled
 */
interface InMemoryJob {
  id: string;
  name: string;
  data: any;
  opts: any;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  returnvalue?: any;
  failedReason?: string;
  attemptsMade: number;
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
}

class InMemoryQueue {
  private jobs: Map<string, InMemoryJob> = new Map();
  private jobCounter = 0;
  private handlers: Map<string, (job: any) => Promise<any>> = new Map();
  public name: string;

  constructor(name: string) {
    this.name = name;
    logger.info(`In-memory queue created: ${name}`);
  }

  async add(name: string, data: any, opts?: any): Promise<{ id: string; data: any }> {
    const id = opts?.jobId || `${this.name}-${++this.jobCounter}`;
    const job: InMemoryJob = {
      id,
      name,
      data,
      opts: opts || {},
      timestamp: Date.now(),
      attemptsMade: 0,
      state: opts?.delay ? 'delayed' : 'waiting',
    };
    this.jobs.set(id, job);

    // Process immediately if no delay
    if (!opts?.delay) {
      this.processJob(id);
    } else {
      setTimeout(() => this.processJob(id), opts.delay);
    }

    logger.debug(`Job added to in-memory queue`, { queue: this.name, jobId: id, jobName: name });
    return { id, data };
  }

  private async processJob(id: string) {
    const job = this.jobs.get(id);
    if (!job) return;

    const handler = this.handlers.get(job.name) || this.handlers.get('*');
    if (!handler) {
      logger.warn(`No handler for job type: ${job.name}`);
      return;
    }

    job.state = 'active';
    job.processedOn = Date.now();
    job.attemptsMade++;

    try {
      job.returnvalue = await handler({
        id: job.id,
        name: job.name,
        data: job.data,
        opts: job.opts,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        getState: async () => job.state,
        progress: 0,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
      });
      job.state = 'completed';
      job.finishedOn = Date.now();
      logger.debug(`Job completed`, { queue: this.name, jobId: id });
    } catch (error: any) {
      job.failedReason = error.message;
      if (job.attemptsMade < (job.opts.attempts || 3)) {
        job.state = 'waiting';
        setTimeout(() => this.processJob(id), 1000 * job.attemptsMade);
      } else {
        job.state = 'failed';
        job.finishedOn = Date.now();
        logger.error(`Job failed`, { queue: this.name, jobId: id, error: error.message });
      }
    }
  }

  process(name: string, handler: (job: any) => Promise<any>) {
    this.handlers.set(name, handler);
  }

  async getJob(id: string) {
    const job = this.jobs.get(id);
    if (!job) return null;
    return {
      id: job.id,
      data: job.data,
      getState: async () => job.state,
      progress: 0,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      remove: async () => this.jobs.delete(id),
    };
  }

  async getWaitingCount() {
    return Array.from(this.jobs.values()).filter(j => j.state === 'waiting').length;
  }

  async getActiveCount() {
    return Array.from(this.jobs.values()).filter(j => j.state === 'active').length;
  }

  async getCompletedCount() {
    return Array.from(this.jobs.values()).filter(j => j.state === 'completed').length;
  }

  async getFailedCount() {
    return Array.from(this.jobs.values()).filter(j => j.state === 'failed').length;
  }

  async getDelayedCount() {
    return Array.from(this.jobs.values()).filter(j => j.state === 'delayed').length;
  }

  async close() {
    this.jobs.clear();
    this.handlers.clear();
  }

  on(event: string, handler: (...args: any[]) => void) {
    // No-op for in-memory queue
  }
}

// Store in-memory queues
const inMemoryQueues: Map<string, InMemoryQueue> = new Map();

/**
 * Get or create an in-memory queue (for when Redis is disabled)
 */
export const getInMemoryQueue = (name: string): InMemoryQueue => {
  let queue = inMemoryQueues.get(name);
  if (!queue) {
    queue = new InMemoryQueue(name);
    inMemoryQueues.set(name, queue);
  }
  return queue;
};

/**
 * Get or create a named Redis connection (reuses existing connections)
 * This dramatically reduces memory by pooling connections
 */
export const getRedisConnection = (name: string = 'default'): IORedis | null => {
  if (!isRedisEnabled()) {
    logger.debug(`Redis disabled, returning null for connection: ${name}`);
    return null;
  }

  // Check if we already have this connection
  const existing = connectionPool.get(name);
  if (existing && existing.status !== 'end') {
    return existing;
  }

  // Create new connection
  const connection = new IORedis(config.redisUrl, getRedisOptions());

  connection.on('error', err => {
    logger.error(`Redis [${name}] connection error`, { error: err.message });
  });

  connection.on('connect', () => {
    logger.info(`Redis [${name}] connected`);
  });

  connection.on('ready', () => {
    logger.info(`Redis [${name}] ready`);
  });

  connection.on('close', () => {
    logger.warn(`Redis [${name}] connection closed`);
    connectionPool.delete(name);
  });

  connection.on('reconnecting', () => {
    logger.info(`Redis [${name}] reconnecting...`);
  });

  connectionPool.set(name, connection);
  return connection;
};

/**
 * @deprecated Use getRedisConnection() instead for pooled connections
 * Creates a new connection every time - use only when absolutely needed
 */
export const createRedisConnection = (name: string = 'default'): IORedis | null => {
  // Now routes to pooled connection to save memory
  return getRedisConnection(name);
};

// Shared connection names for consistent pooling
export const REDIS_CONNECTIONS = {
  QUEUES: 'queues', // Shared by all Queue instances
  WORKERS: 'workers', // Shared by all Worker instances
} as const;

/**
 * Close all pooled connections
 */
export const closeAllConnections = async (): Promise<void> => {
  // Close Redis connections
  const closePromises = Array.from(connectionPool.entries()).map(async ([name, conn]) => {
    try {
      await conn.quit();
      logger.info(`Redis [${name}] connection closed`);
    } catch (error: any) {
      logger.warn(`Error closing Redis [${name}]`, { error: error.message });
    }
  });
  await Promise.all(closePromises);
  connectionPool.clear();

  // Close in-memory queues
  for (const [name, queue] of inMemoryQueues) {
    await queue.close();
    logger.info(`In-memory queue [${name}] closed`);
  }
  inMemoryQueues.clear();

  logger.info('All connections closed');
};

// Legacy exports for backward compatibility
export const getSharedRedisConnection = (): IORedis | null => getRedisConnection('shared');
export const closeSharedConnection = closeAllConnections;

// Export InMemoryQueue type for use in other files
export { InMemoryQueue };
