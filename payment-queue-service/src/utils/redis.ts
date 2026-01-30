import IORedis, { RedisOptions } from 'ioredis';

import { config } from '../config';

import logger from './logger';

/**
 * Get Redis connection options with proper TLS configuration for Upstash
 */
export const getRedisOptions = (): RedisOptions => {
  const { redisUrl } = config;
  const isTLS = redisUrl.startsWith('rediss://');

  const options: RedisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    connectTimeout: 10000,
    // Use IPv4 to avoid issues with some cloud providers
    family: 4,
    retryStrategy: (times: number) => {
      if (times > 10) {
        logger.error('Redis connection failed after 10 retries');
        return null;
      }
      const delay = Math.min(times * 200, 2000);
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
 * Get or create a named Redis connection (reuses existing connections)
 * This dramatically reduces memory by pooling connections
 */
export const getRedisConnection = (name: string = 'default'): IORedis => {
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
export const createRedisConnection = (name: string = 'default'): IORedis => {
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
  logger.info('All Redis connections closed');
};

// Legacy exports for backward compatibility
export const getSharedRedisConnection = (): IORedis => getRedisConnection('shared');
export const closeSharedConnection = closeAllConnections;
