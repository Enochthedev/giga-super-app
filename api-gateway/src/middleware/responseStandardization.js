/**
 * Response Standardization Middleware
 *
 * Ensures consistent response formats across all services and implements
 * response caching mechanisms for improved performance.
 */

import NodeCache from 'node-cache';
import { logger } from '../utils/logger.js';

// Response cache with 5-minute default TTL
const responseCache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL_SECONDS) || 300,
  maxKeys: parseInt(process.env.CACHE_MAX_KEYS) || 1000,
  checkperiod: 60,
});

/**
 * Standard API response format
 */
const createStandardResponse = (success, data = null, error = null, metadata = {}) => {
  const response = {
    success,
    ...(data !== null && { data }),
    ...(error !== null && { error }),
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      ...metadata,
    },
  };

  return response;
};

/**
 * Normalize error responses to standard format
 */
const normalizeError = (error, requestId) => {
  // Handle different error formats from various services
  if (typeof error === 'string') {
    return {
      code: 'GENERIC_ERROR',
      message: error,
    };
  }

  if (error && typeof error === 'object') {
    return {
      code: error.code || error.error_code || 'UNKNOWN_ERROR',
      message: error.message || error.error_message || 'An error occurred',
      ...(error.details && { details: error.details }),
    };
  }

  return {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  };
};

/**
 * Generate cache key for request
 */
const generateCacheKey = req => {
  const { method, path, query, user } = req;
  const userId = user?.id || 'anonymous';
  const queryString = new URLSearchParams(query || {}).toString();

  return `${method}:${path}:${queryString}:${userId}`;
};

/**
 * Check if response should be cached
 */
const shouldCacheResponse = (req, res, responseBody) => {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return false;
  }

  // Don't cache error responses
  if (!responseBody.success) {
    return false;
  }

  // Don't cache admin or sensitive endpoints
  if (req.path.startsWith('/admin') || req.path.includes('/private')) {
    return false;
  }

  // Don't cache responses with user-specific data (unless explicitly marked as cacheable)
  if (req.user && !req.cacheable) {
    return false;
  }

  // Don't cache large responses (> 1MB)
  const responseSize = JSON.stringify(responseBody).length;
  if (responseSize > 1024 * 1024) {
    return false;
  }

  return true;
};

/**
 * Response standardization middleware
 */
export const responseStandardization = (req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  const originalSend = res.send;

  // Override res.json to standardize responses
  res.json = function (body) {
    let standardizedBody;

    try {
      // Check if response is already in standard format
      if (body && typeof body === 'object' && body.hasOwnProperty('success')) {
        // Already standardized, just ensure metadata is complete
        standardizedBody = {
          ...body,
          metadata: {
            timestamp: new Date().toISOString(),
            request_id: req.id,
            version: '1.0.0',
            ...body.metadata,
          },
        };
      } else {
        // Standardize the response
        const isError = res.statusCode >= 400;

        if (isError) {
          standardizedBody = createStandardResponse(false, null, normalizeError(body, req.id), {
            request_id: req.id,
          });
        } else {
          standardizedBody = createStandardResponse(true, body, null, { request_id: req.id });
        }
      }

      // Add response headers
      res.set('X-Request-ID', req.id);
      res.set('X-Response-Time', `${Date.now() - req.startTime}ms`);

      // Cache successful responses if appropriate
      if (shouldCacheResponse(req, res, standardizedBody)) {
        const cacheKey = generateCacheKey(req);
        const cacheTTL = req.cacheTTL || undefined; // Use default TTL if not specified

        responseCache.set(
          cacheKey,
          {
            body: standardizedBody,
            headers: {
              'Content-Type': 'application/json',
              'X-Cache': 'MISS',
            },
            statusCode: res.statusCode,
            cachedAt: new Date().toISOString(),
          },
          cacheTTL
        );

        logger.debug('Response cached', {
          requestId: req.id,
          cacheKey,
          ttl: cacheTTL,
        });
      }

      // Log response
      logger.info('Response sent', {
        requestId: req.id,
        statusCode: res.statusCode,
        success: standardizedBody.success,
        responseTime: Date.now() - req.startTime,
        cached: false,
      });

      return originalJson.call(this, standardizedBody);
    } catch (error) {
      logger.error('Response standardization error', {
        requestId: req.id,
        error: error.message,
        originalBody: body,
      });

      // Fallback to original response on error
      return originalJson.call(this, body);
    }
  };

  // Override res.send for non-JSON responses
  res.send = function (body) {
    // Add standard headers
    res.set('X-Request-ID', req.id);
    res.set('X-Response-Time', `${Date.now() - req.startTime}ms`);

    return originalSend.call(this, body);
  };

  next();
};

/**
 * Cache middleware - check for cached responses before processing
 */
export const cacheMiddleware = (req, res, next) => {
  // Only check cache for GET requests
  if (req.method !== 'GET') {
    return next();
  }

  // Skip cache for admin endpoints
  if (req.path.startsWith('/admin')) {
    return next();
  }

  const cacheKey = generateCacheKey(req);
  const cached = responseCache.get(cacheKey);

  if (cached) {
    // Serve from cache
    res.set(cached.headers);
    res.set('X-Cache', 'HIT');
    res.set('X-Cache-Date', cached.cachedAt);
    res.status(cached.statusCode);

    logger.info('Cache hit', {
      requestId: req.id,
      cacheKey,
      cachedAt: cached.cachedAt,
    });

    return res.json(cached.body);
  }

  // Cache miss, continue to next middleware
  res.set('X-Cache', 'MISS');
  next();
};

/**
 * Error response standardization
 */
export const errorResponseStandardization = (err, req, res, next) => {
  // This middleware handles errors that weren't caught by other middleware
  const standardizedError = createStandardResponse(false, null, normalizeError(err, req.id), {
    request_id: req.id,
  });

  // Determine appropriate status code
  let statusCode = 500;
  if (err.statusCode) {
    statusCode = err.statusCode;
  } else if (err.status) {
    statusCode = err.status;
  } else if (err.code) {
    // Map common error codes to HTTP status codes
    const errorCodeMap = {
      VALIDATION_ERROR: 400,
      AUTHENTICATION_REQUIRED: 401,
      INVALID_TOKEN: 401,
      INSUFFICIENT_PERMISSIONS: 403,
      RESOURCE_NOT_FOUND: 404,
      CONFLICT: 409,
      RATE_LIMIT_EXCEEDED: 429,
    };
    statusCode = errorCodeMap[err.code] || 500;
  }

  res.status(statusCode).json(standardizedError);
};

/**
 * Cache management utilities
 */
export const cacheUtils = {
  /**
   * Clear cache for specific pattern
   */
  clearPattern: pattern => {
    const keys = responseCache.keys();
    const matchingKeys = keys.filter(key => key.includes(pattern));

    matchingKeys.forEach(key => responseCache.del(key));

    logger.info('Cache cleared', {
      pattern,
      keysCleared: matchingKeys.length,
    });

    return matchingKeys.length;
  },

  /**
   * Clear all cache
   */
  clearAll: () => {
    const keyCount = responseCache.keys().length;
    responseCache.flushAll();

    logger.info('All cache cleared', { keysCleared: keyCount });

    return keyCount;
  },

  /**
   * Get cache statistics
   */
  getStats: () => {
    const stats = responseCache.getStats();
    return {
      ...stats,
      keyCount: responseCache.keys().length,
      memoryUsage: process.memoryUsage(),
    };
  },

  /**
   * Set cache TTL for specific request
   */
  setCacheTTL: (req, ttl) => {
    req.cacheTTL = ttl;
  },

  /**
   * Mark request as cacheable (for user-specific data)
   */
  markCacheable: req => {
    req.cacheable = true;
  },

  /**
   * Warm cache with specific data
   */
  warmCache: (key, data, ttl) => {
    responseCache.set(key, data, ttl);
  },
};

/**
 * Response compression middleware
 */
export const responseCompression = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (body) {
    // Add compression headers for large responses
    const bodyString = JSON.stringify(body);
    const bodySize = Buffer.byteLength(bodyString, 'utf8');

    if (bodySize > 1024) {
      // > 1KB
      res.set('Content-Length', bodySize.toString());

      if (bodySize > 10240) {
        // > 10KB
        res.set('X-Large-Response', 'true');
        logger.warn('Large response detected', {
          requestId: req.id,
          size: bodySize,
          path: req.path,
        });
      }
    }

    return originalJson.call(this, body);
  };

  next();
};
