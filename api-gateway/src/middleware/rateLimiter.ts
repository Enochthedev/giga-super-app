import type { NextFunction, Request, Response } from 'express';
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';

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

type RateLimitTier = 'anonymous' | 'authenticated' | 'premium' | 'admin';

// Get environment overrides (evaluated once at module load)
const ENV_OVERRIDES = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),
  anonymousMax: parseInt(process.env.RATE_LIMIT_ANONYMOUS_MAX ?? '500', 10),
  authenticatedMax: parseInt(process.env.RATE_LIMIT_AUTHENTICATED_MAX ?? '1000', 10),
  premiumMax: parseInt(process.env.RATE_LIMIT_PREMIUM_MAX ?? '2000', 10),
  adminMax: parseInt(process.env.RATE_LIMIT_ADMIN_MAX ?? '5000', 10),
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
      windowMs: ENV_OVERRIDES.windowMs,
      retryAfter: Math.ceil(ENV_OVERRIDES.windowMs / 1000),
    },
  },
  metadata: {
    timestamp: new Date().toISOString(),
    request_id: requestId,
    version: '1.0.0',
  },
});

/**
 * Create a rate limiter for a specific tier
 * These are created at module initialization time, not during request handling
 */
const createTierLimiter = (tier: RateLimitTier, max: number): RateLimitRequestHandler => {
  return rateLimit({
    windowMs: ENV_OVERRIDES.windowMs,
    max,
    message: createRateLimitResponse(undefined, tier, max),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (request: Request) => {
      // Use user ID for authenticated users, IP for anonymous
      const authReq = request as AuthenticatedRequest;
      if (authReq.user?.id) {
        return `user_${authReq.user.id}`;
      }
      return request.ip ?? 'unknown';
    },
    handler: (request: Request, response: Response) => {
      const authReq = request as AuthenticatedRequest;
      logger.warn('Rate limit exceeded', {
        requestId: authReq.id,
        userId: authReq.user?.id,
        tier,
        limit: max,
        ip: request.ip,
        path: request.path,
      });

      response.status(429).json(createRateLimitResponse(authReq.id, tier, max));
    },
    skip: (req: Request) => {
      // Skip for health checks
      return req.path.startsWith('/health') || req.path.endsWith('/health');
    },
  });
};

// Pre-create all tier limiters at initialization time
const tierLimiters: Record<RateLimitTier, RateLimitRequestHandler> = {
  anonymous: createTierLimiter('anonymous', ENV_OVERRIDES.anonymousMax),
  authenticated: createTierLimiter('authenticated', ENV_OVERRIDES.authenticatedMax),
  premium: createTierLimiter('premium', ENV_OVERRIDES.premiumMax),
  admin: createTierLimiter('admin', ENV_OVERRIDES.adminMax),
};

/**
 * Determine rate limit tier based on user context
 */
const getRateLimitTier = (req: AuthenticatedRequest): RateLimitTier => {
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
const getTierLimit = (tier: RateLimitTier): number => {
  switch (tier) {
    case 'admin':
      return ENV_OVERRIDES.adminMax;
    case 'premium':
      return ENV_OVERRIDES.premiumMax;
    case 'authenticated':
      return ENV_OVERRIDES.authenticatedMax;
    default:
      return ENV_OVERRIDES.anonymousMax;
  }
};

/**
 * Base rate limiter for anonymous requests (applied globally first)
 */
export const baseRateLimiter = rateLimit({
  windowMs: ENV_OVERRIDES.windowMs,
  max: ENV_OVERRIDES.anonymousMax,
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
 * This selects the appropriate pre-created rate limiter based on user's tier
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

  // Use the pre-created limiter for this tier
  const limiter = tierLimiters[tier];
  limiter(req, res, next);
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

  return {
    tier,
    limit,
    windowMs: ENV_OVERRIDES.windowMs,
    windowSeconds: Math.ceil(ENV_OVERRIDES.windowMs / 1000),
  };
};
