import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

import config from '@/config';
import { AuthenticatedRequest } from '@/types';
import { ERROR_CODES } from '@/utils/errors';
import logger from '@/utils/logger';

// Key generator function for rate limiting
const keyGenerator = (req: Request): string => {
  const authReq = req as AuthenticatedRequest;

  // Use user ID if authenticated, otherwise use IP
  if (authReq.user?.id) {
    return `user:${authReq.user.id}`;
  }

  return `ip:${req.ip}`;
};

// Custom rate limit handler
const rateLimitHandler = (req: Request, res: Response): void => {
  const authReq = req as AuthenticatedRequest;

  logger.warn('Rate limit exceeded', {
    key: keyGenerator(req),
    ip: req.ip,
    path: req.path,
    method: req.method,
    userId: authReq.user?.id,
  });

  res.status(429).json({
    success: false,
    error: {
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: 'Too many requests. Please try again later.',
      details: {
        limit: config.rateLimit.maxRequests,
        window: config.rateLimit.windowMs,
        reset_at: new Date(Date.now() + config.rateLimit.windowMs).toISOString(),
      },
    },
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: authReq.requestId || 'unknown',
      version: '1.0.0',
    },
  });
};

// Skip rate limiting for certain conditions
const skipRateLimit = (req: Request): boolean => {
  const authReq = req as AuthenticatedRequest;

  // Skip rate limiting for admin users
  if (authReq.user?.role === 'ADMIN') {
    return true;
  }

  // Skip for health check endpoints
  if (req.path === '/health' || req.path === '/ready' || req.path === '/live') {
    return true;
  }

  return false;
};

// General rate limiter
export const generalRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  keyGenerator,
  handler: rateLimitHandler,
  skip: skipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: 'Too many requests from this client',
    },
  },
});

// Strict rate limiter for sensitive operations
export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each user to 10 requests per windowMs
  keyGenerator,
  handler: rateLimitHandler,
  skip: skipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
});

// Location update rate limiter (more permissive for real-time tracking)
export const locationUpdateRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Allow 60 location updates per minute (1 per second)
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return `location:${authReq.user?.id || req.ip}`;
  },
  handler: rateLimitHandler,
  skip: skipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication rate limiter
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  keyGenerator: (req: Request) => `auth:${req.ip}`,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Route optimization rate limiter
export const routeOptimizationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Limit route optimization requests
  keyGenerator,
  handler: rateLimitHandler,
  skip: skipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload rate limiter
export const fileUploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit file uploads
  keyGenerator,
  handler: rateLimitHandler,
  skip: skipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
});

// Create custom rate limiter with specific options
export const createCustomRateLimit = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs || config.rateLimit.windowMs,
    max: options.max || config.rateLimit.maxRequests,
    keyGenerator,
    handler: rateLimitHandler,
    skip: skipRateLimit,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    message: {
      success: false,
      error: {
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        message: options.message || 'Too many requests',
      },
    },
  });
};
