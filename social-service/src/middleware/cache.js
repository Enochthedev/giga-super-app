import NodeCache from 'node-cache';

import logger from '../utils/logger.js';

// Initialize cache with TTL and max keys
const cache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL) || 300, // 5 minutes default
  checkperiod: 60, // Check for expired keys every 60 seconds
  maxKeys: parseInt(process.env.CACHE_MAX_KEYS) || 1000,
  useClones: false, // Don't clone objects for better performance
});

/**
 * Cache middleware for GET requests
 * @param {number} ttl - Time to live in seconds (optional, uses default if not provided)
 */
export const cacheMiddleware = (ttl = null) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key from URL and user ID
    const cacheKey = `${req.user?.id || 'anonymous'}:${req.originalUrl}`;

    try {
      // Check if cached response exists
      const cachedResponse = cache.get(cacheKey);

      if (cachedResponse) {
        logger.debug('Cache hit', {
          requestId: req.requestId,
          cacheKey,
          userId: req.user?.id,
        });

        // Add cache header
        res.set('X-Cache', 'HIT');
        return res.json(cachedResponse);
      }

      logger.debug('Cache miss', {
        requestId: req.requestId,
        cacheKey,
        userId: req.user?.id,
      });

      // Store original res.json function
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = body => {
        // Only cache successful responses
        if (body.success !== false && res.statusCode === 200) {
          const cacheTTL = ttl || parseInt(process.env.CACHE_TTL) || 300;
          cache.set(cacheKey, body, cacheTTL);

          logger.debug('Response cached', {
            requestId: req.requestId,
            cacheKey,
            ttl: cacheTTL,
          });
        }

        // Add cache header
        res.set('X-Cache', 'MISS');
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', {
        requestId: req.requestId,
        error: error.message,
      });

      // Continue without caching on error
      next();
    }
  };
};

/**
 * Clear cache for specific patterns
 * @param {string} pattern - Pattern to match cache keys (supports wildcards)
 */
export const clearCache = pattern => {
  try {
    const keys = cache.keys();
    const matchingKeys = keys.filter(key => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(key);
      }
      return key.includes(pattern);
    });

    matchingKeys.forEach(key => cache.del(key));

    logger.info('Cache cleared', {
      pattern,
      keysCleared: matchingKeys.length,
    });

    return matchingKeys.length;
  } catch (error) {
    logger.error('Error clearing cache', {
      pattern,
      error: error.message,
    });
    return 0;
  }
};

/**
 * Clear all cache
 */
export const clearAllCache = () => {
  try {
    cache.flushAll();
    logger.info('All cache cleared');
    return true;
  } catch (error) {
    logger.error('Error clearing all cache', {
      error: error.message,
    });
    return false;
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return cache.getStats();
};

export default cache;
