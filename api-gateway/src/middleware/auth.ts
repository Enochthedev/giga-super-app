import { createHash } from 'crypto';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import NodeCache from 'node-cache';

import { config } from '../config/index.js';
import type { ApiResponse, AuthenticatedRequest, UserContext } from '../types/index.js';
import { isAccountDeactivated } from '../utils/accountStatus.js';
import { logger } from '../utils/logger.js';

// Token validation cache (5 minute TTL)
const tokenCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Lazy initialization of Supabase client
let supabase: SupabaseClient | null = null;

const getSupabaseClient = (): SupabaseClient => {
  if (!supabase) {
    supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
  }
  return supabase;
};

const createErrorResponse = (code: string, message: string, requestId?: string): ApiResponse => ({
  success: false,
  error: { code, message },
  metadata: {
    timestamp: new Date().toISOString(),
    request_id: requestId,
    version: '1.0.0',
  },
});

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Skip auth for health checks, public endpoints, and API documentation
    const publicPaths = [
      // Health and docs
      '/health',
      '/api-docs',
      '/swagger',
      '/docs',
      '/public',

      // Ads (public for display)
      '/api/ads/fetch',
      '/api/v1/ads/fetch',

      // Hotels - browsing (public for anonymous users)
      '/api/v1/hotels/search',
      '/api/v1/hotels/recommended',
      '/api/v1/hotels/details',
      '/api/v1/hotels/reviews',
      '/api/v1/hotels/amenities',
      '/api/v1/hotels/locations',
      '/api/v1/rooms/availability',
      '/api/v1/rooms/types',

      // Products - browsing (public for anonymous users)
      '/api/v1/products/search',
      '/api/v1/products/categories',
      '/api/v1/products/trending',
      '/api/v1/products/brands',
      '/api/v1/products/details',

      // Search service (public for browsing)
      '/api/v1/search/hotels',
      '/api/v1/search/products',
      '/api/v1/search/hotels/popular',
      '/api/v1/search/hotels/nearby',
      '/api/v1/search/products/trending',
      '/api/v1/search/products/categories',
      '/api/v1/search/products/brands',
      '/api/v1/search/drivers',

      // Ride estimates (public for price checking)
      '/api/v1/rides/estimate',
      '/api/v1/drivers/nearby',

      // Delivery tracking (public for recipients with tracking number)
      '/api/v1/tracking/public',

      // Social - public feed for discovery
      '/api/v1/social/feed/public',
      '/api/v1/social/posts/public',
    ];

    // Check for UUID-based hotel paths (public for browsing)
    const hotelUuidPattern = /^\/api\/v1\/hotels\/[a-f0-9-]{36}(\/reviews|\/availability)?$/i;
    const isHotelPublicPath = hotelUuidPattern.test(req.path);

    const isPublicPath =
      isHotelPublicPath ||
      publicPaths.some(
        publicPath =>
          req.path === publicPath ||
          req.path.startsWith(`${publicPath}/`) ||
          req.path.startsWith('/health') ||
          req.path.endsWith('/health') ||
          req.path.includes('/api-docs') ||
          req.path.includes('/swagger')
      );

    if (isPublicPath) {
      next();
      return;
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res
        .status(401)
        .json(
          createErrorResponse(
            'AUTHENTICATION_REQUIRED',
            'Authorization header with Bearer token is required',
            req.id
          )
        );
      return;
    }

    const token = authHeader.substring(7);

    // Check token cache first.
    // Key on a hash of the WHOLE token: the first chars of a JWT are the base64
    // header, identical for every user, so a prefix key shared one cache slot
    // across all users and could authenticate a request as someone else.
    const cacheKey = `token_${createHash('sha256').update(token).digest('hex')}`;
    const cachedUser = tokenCache.get<UserContext>(cacheKey);

    let user: UserContext;

    if (cachedUser) {
      user = cachedUser;
      logger.debug('Using cached user data', {
        requestId: req.id,
        userId: user.id,
      });
    } else {
      // Verify token with Supabase
      const {
        data: { user: supabaseUser },
        error,
      } = await getSupabaseClient().auth.getUser(token);

      if (error || !supabaseUser) {
        logger.warn('Authentication failed', {
          requestId: req.id,
          error: error?.message,
          ip: req.ip,
        });

        res
          .status(401)
          .json(
            createErrorResponse('INVALID_TOKEN', 'Invalid or expired authentication token', req.id)
          );
        return;
      }

      // Decode JWT to get additional claims
      let tokenClaims: Record<string, unknown> = {};
      try {
        const decoded = jwt.decode(token);
        if (decoded && typeof decoded === 'object') {
          tokenClaims = decoded as Record<string, unknown>;
        }

        // Check token expiration
        const exp = tokenClaims.exp as number | undefined;
        if (exp && exp < Date.now() / 1000) {
          logger.warn('Token expired', {
            requestId: req.id,
            userId: supabaseUser.id,
            exp,
          });

          res
            .status(401)
            .json(createErrorResponse('TOKEN_EXPIRED', 'Authentication token has expired', req.id));
          return;
        }
      } catch (jwtError) {
        logger.warn('JWT decode failed', {
          requestId: req.id,
          error: jwtError instanceof Error ? jwtError.message : 'Unknown error',
        });
      }

      // Get roles from JWT claims.
      // V7: prefer app_metadata from the *token claims*. The user object returned by
      // auth.getUser() came back without app_metadata.role for admin accounts, so the
      // role silently degraded to 'user' and every downstream service that trusts the
      // forwarded X-User-Role header saw a non-admin (notifications-service returned
      // 403 "Admin privileges required" for real DOP admins). The signed token does
      // carry it — qa.admin's claims contain app_metadata.role = "ADMIN".
      // Never read roles from user_metadata: any user can rewrite it themselves
      // (PUT /auth/v1/user { data: { role: 'ADMIN' } }), which made self-promotion
      // to admin possible. app_metadata is only writable with the service role.
      const claimsAppMetadata = tokenClaims.app_metadata as Record<string, unknown> | undefined;
      const appMetadata = (supabaseUser.app_metadata ?? {}) as Record<string, unknown>;
      const userRoles = (claimsAppMetadata?.roles ?? appMetadata?.roles ?? []) as string[];

      // A banned user can't log in or refresh, but tokens issued before the ban
      // still verify until they expire — reject deactivated profiles here too.
      if (await isAccountDeactivated(supabaseUser.id)) {
        res
          .status(403)
          .json(
            createErrorResponse('ACCOUNT_DEACTIVATED', 'This account has been deleted', req.id)
          );
        return;
      }

      user = {
        id: supabaseUser.id,
        email: supabaseUser.email ?? '',
        role: (claimsAppMetadata?.role ?? appMetadata?.role ?? 'user') as string,
        roles: Array.isArray(userRoles) ? userRoles : [],
        claims: tokenClaims,
        raw: supabaseUser,
        authenticatedAt: new Date().toISOString(),
      };

      // Cache valid user data
      tokenCache.set(cacheKey, user);
    }

    // Add user context to request
    req.user = user;
    req.authToken = token;

    logger.debug('User authenticated', {
      requestId: req.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    next();
  } catch (error) {
    logger.error('Authentication middleware error', {
      requestId: req.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    res
      .status(500)
      .json(
        createErrorResponse('AUTHENTICATION_ERROR', 'Authentication service unavailable', req.id)
      );
  }
};

/**
 * Role-based authorization middleware
 * Performs case-insensitive role comparison
 * TODO: Standardize role names across the system (currently mixed: SUPER_ADMIN vs super_admin)
 */
export const requireRole = (requiredRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res
        .status(401)
        .json(createErrorResponse('AUTHENTICATION_REQUIRED', 'Authentication required', req.id));
      return;
    }

    const userRoles = [req.user.role, ...req.user.roles].map(r => r.toLowerCase());
    const normalizedRequiredRoles = requiredRoles.map(r => r.toLowerCase());
    const hasRequiredRole = normalizedRequiredRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      logger.warn('Authorization failed', {
        requestId: req.id,
        userId: req.user.id,
        userRoles: [req.user.role, ...req.user.roles],
        requiredRoles,
      });

      res
        .status(403)
        .json(
          createErrorResponse(
            'INSUFFICIENT_PERMISSIONS',
            `Access denied. Required roles: ${requiredRoles.join(', ')}`,
            req.id
          )
        );
      return;
    }

    next();
  };
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    await authMiddleware(req, res, (error?: unknown) => {
      if (error) {
        logger.debug('Optional auth failed', {
          requestId: req.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      next();
    });
  } catch (error) {
    logger.debug('Optional auth error', {
      requestId: req.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next();
  }
};

/**
 * Drop every cached token belonging to a user (e.g. right after they delete
 * their account) so the deactivation check runs on their next request.
 */
export const invalidateUserTokens = (userId: string): void => {
  for (const key of tokenCache.keys()) {
    if (tokenCache.get<UserContext>(key)?.id === userId) tokenCache.del(key);
  }
};

/**
 * Get authentication statistics
 */
export const getAuthStats = () => ({
  tokenCacheSize: tokenCache.keys().length,
  cacheHitRate: tokenCache.getStats(),
});
