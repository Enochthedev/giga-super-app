import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import NodeCache from 'node-cache';

import { config } from '../config/index.js';
import type { ApiResponse, AuthenticatedRequest, UserContext } from '../types/index.js';
import { logger } from '../utils/logger.js';

// Token validation cache (5 minute TTL)
const tokenCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Rate limiting for auth attempts per IP
const authAttempts = new NodeCache({ stdTTL: 900 }); // 15 minutes

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
    if (
      req.path.startsWith('/health') ||
      req.path.endsWith('/health') ||
      req.path.startsWith('/public') ||
      req.path.includes('/api-docs') ||
      req.path.includes('/swagger') ||
      req.path.endsWith('/docs')
    ) {
      next();
      return;
    }

    // Rate limiting check
    const clientIP = req.ip ?? 'unknown';
    const attempts = authAttempts.get<number>(clientIP) ?? 0;

    if (attempts >= 10) {
      logger.warn('Authentication rate limit exceeded', {
        requestId: req.id,
        ip: clientIP,
        attempts,
      });

      res
        .status(429)
        .json(
          createErrorResponse(
            'RATE_LIMIT_EXCEEDED',
            'Too many authentication attempts. Please try again later.',
            req.id
          )
        );
      return;
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      authAttempts.set(clientIP, attempts + 1);

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

    // Check token cache first
    const cacheKey = `token_${token.substring(0, 20)}`;
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
        authAttempts.set(clientIP, attempts + 1);

        logger.warn('Authentication failed', {
          requestId: req.id,
          error: error?.message,
          ip: clientIP,
          attempts: attempts + 1,
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

      // Get roles from JWT claims
      const userMetadata = tokenClaims.user_metadata as Record<string, unknown> | undefined;
      const appMetadata = supabaseUser.app_metadata as Record<string, unknown> | undefined;
      const userRoles = (userMetadata?.roles ?? appMetadata?.roles ?? []) as string[];

      user = {
        id: supabaseUser.id,
        email: supabaseUser.email ?? '',
        role: (appMetadata?.role ?? userMetadata?.role ?? 'user') as string,
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

    // Reset failed attempts on successful auth
    authAttempts.del(clientIP);

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
 */
export const requireRole = (requiredRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res
        .status(401)
        .json(createErrorResponse('AUTHENTICATION_REQUIRED', 'Authentication required', req.id));
      return;
    }

    const userRoles = [req.user.role, ...req.user.roles];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      logger.warn('Authorization failed', {
        requestId: req.id,
        userId: req.user.id,
        userRoles,
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
 * Get authentication statistics
 */
export const getAuthStats = () => ({
  tokenCacheSize: tokenCache.keys().length,
  authAttemptsTracked: authAttempts.keys().length,
  cacheHitRate: tokenCache.getStats(),
});
