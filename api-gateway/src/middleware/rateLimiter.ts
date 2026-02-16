import type { NextFunction, Response } from 'express';
import rateLimit from 'express-rate-limit';

import type { AuthenticatedRequest } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Tiered Rate Limiting Configuration
 *
 * Different limits based on authentication status and user role:
 * - Anonymous: 500 requests per minute (generous for public endpoints)
 * - Authenticated: 1000 requests per minute
 * - Premium/Admin: 2000 requests per minute
 */

const RATE_LIMIT_TIERS = {
  anonymous: {
    windowMs: 60 * 1000, // 1 minute
    max: 500,
  },
  authenticated: {
    windowMs: 60 * 1000, // 1 minute
    max: 1000,
  },
  premium: {
    windowMs: 60 * 1000, // 1 minute
    max: 2000,
  },
  admin: {
    windowMs: 60 * 1000, // 1 minute
    max: 5000,
  },
} as const;

// Override from environment if set
const getEnvOverrides = () => ({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),
  anonymousMax: parseInt(process.env.RATE_LIMIT_ANONYMOUS_MAX ?? '500', 10),
  authenticatedMax: parseInt(process.env.RATE_LIMIT_AUTHENTICATED_MAX ?? '1000', 10),
  premiumMax: parseInt(process.env.RATE_LIMIT_PREMIUM_MAX ?? '2000', 10),
  adminMax: parseInt(process.env.RATE_LIMIT_ADMIN_MAX ?? '5000', 10),
});

/**
 * Determine rate limit tier based on user context
 */
const getRateLimitTier = (req: AuthenticatedRequest): keyof typeof RATE_LIMIT_TIERS => {
  if (!req.user) {
    return 'anonymous';
  }

  const userRoles = [req.user.role, ...(req.user.roles || [])];

  // Admin tier
  if (userRoles.includes('admin') || userRoles.includes('super_admin')) {
    return 'admin';
  }

  // Premium tier (add your premium role names here)
  if (
    userRoles.includes('premium') ||
    userRoles.includes('business') ||
    userRoles.includes('hotel_manager') ||
    userRoles.includes('vendor')
  ) {
    return 'premium';
  }

  return 'authenticated';
};

/**
 * Get rate limit for a specific tier
 */
const getTierLimit = (tier: keyof typeof RATE_LIMIT_TIERS): number => {
  const envOverrides = getEnvOverrides();

  switch (tier) {
    case 'admin':
      return envOverrides.adminMax;
    case 'premium':
      return envOverrides.premiumMax;
    case 'authenticated':
      return envOverrides.authenticatedMax;
    default:
      return envOverrides.anonymousMax;
  }
};

/**
 * Create rate limit error response
 */
const createRateLimitResponse = (requestId: string | undefined, tier: string, limit: number) => ({
  success: false,
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please try again later.',
    details: {
      tier,
      limit,
      windowMs: getEnvOverrides().windowMs,
      retryAfter: Math.ceil(getEnvOverrides().windowMs / 1000),
    },
  },
  metadata: {
    timestamp: new Date().toISOString(),
    request_id: requestId,
    version: '1.0.0',
  },
});

/**
 * Base rate limiter for anonymous requests (applied globally first)
 */
export const baseRateLimiter = rateLimit({
  windowMs: getEnvOverrides().windowMs,
  max: getEnvOverrides().anonymousMax,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => req.ip ?? 'unknown',
  skip: req => {
    // Skip base limiter for health checks
    return req.path.startsWith('/health') || req.path.endsWith('/health');
  },
});

/**
 * Tiered rate limiter middleware - applies after authentication
 * This adjusts the rate limit based on user's authentication status and role
 */
export const tieredRateLimiter = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  // Skip for health checks
  if (req.path.startsWith('/health') || req.path.endsWith('/health')) {
    next();
    return;
  }

  const tier = getRateLimitTier(req);
  const limit = getTierLimit(tier);
  const envOverrides = getEnvOverrides();

  // Create a dynamic rate limiter for this tier
  const tierLimiter = rateLimit({
    windowMs: envOverrides.windowMs,
    max: limit,
    message: createRateLimitResponse(req.id, tier, limit),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: request => {
      // Use user ID for authenticated users, IP for anonymous
      const authReq = request as AuthenticatedRequest;
      if (authReq.user?.id) {
        return `user_${authReq.user.id}`;
      }
      return request.ip ?? 'unknown';
    },
    handler: (request, response) => {
      const authReq = request as AuthenticatedRequest;
      logger.warn('Rate limit exceeded', {
        requestId: authReq.id,
        userId: authReq.user?.id,
        tier,
        limit,
        ip: request.ip,
        path: request.path,
      });

      response.status(429).json(createRateLimitResponse(authReq.id, tier, limit));
    },
  });

  // Apply the tier-specific limiter
  tierLimiter(req, res, next);
};

/**
 * Strict rate limiter for sensitive endpoints (auth, payments, etc.)
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute for sensitive endpoints
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests to sensitive endpoint. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => req.ip ?? 'unknown',
});

/**
 * Get current rate limit stats
 */
export const getRateLimitInfo = (req: AuthenticatedRequest) => {
  const tier = getRateLimitTier(req);
  const limit = getTierLimit(tier);
  const envOverrides = getEnvOverrides();

  return {
    tier,
    limit,
    windowMs: envOverrides.windowMs,
    windowSeconds: Math.ceil(envOverrides.windowMs / 1000),
  };
};
