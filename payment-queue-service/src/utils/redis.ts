import IORedis, { RedisOptions } from 'ioredis';
import { config } from '../config';
import logger from './logger';

/**
 * Get Redis connection options with proper TLS configuration for Upstash
 */
export const getRedisOptions = (): RedisOptions => {
  const redisUrl = config.redisUrl;
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
 * Create a new Redis connection with proper error handling and TLS
 */
export const createRedisConnection = (name: string = 'default'): IORedis => {
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
  });

  connection.on('reconnecting', () => {
    logger.info(`Redis [${name}] reconnecting...`);
  });

  return connection;
};

// Singleton connection for shared use
let sharedConnection: IORedis | null = null;

export const getSharedRedisConnection = (): IORedis => {
  if (!sharedConnection) {
    sharedConnection = createRedisConnection('shared');
  }
  return sharedConnection;
};

export const closeSharedConnection = async (): Promise<void> => {
  if (sharedConnection) {
    await sharedConnection.quit();
    sharedConnection = null;
    logger.info('Shared Redis connection closed');
  }
};
