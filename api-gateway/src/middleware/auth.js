import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

import { logger } from '../utils/logger.js';

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Token validation cache (5 minute TTL)
const tokenCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Rate limiting for auth attempts per IP
const authAttempts = new NodeCache({ stdTTL: 900 }); // 15 minutes

export const authMiddleware = async (req, res, next) => {
  try {
    // Skip auth for health checks and public endpoints
    if (req.path.startsWith('/health') || req.path.startsWith('/public')) {
      return next();
    }

    // Rate limiting check
    const clientIP = req.ip;
    const attempts = authAttempts.get(clientIP) || 0;
    if (attempts >= 10) {
      // Max 10 auth attempts per 15 minutes
      logger.warn('Authentication rate limit exceeded', {
        requestId: req.id,
        ip: clientIP,
        attempts,
      });

      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many authentication attempts. Please try again later.',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.id,
          version: '1.0.0',
        },
      });
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Increment failed attempts
      authAttempts.set(clientIP, attempts + 1);

      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authorization header with Bearer token is required',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.id,
          version: '1.0.0',
        },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Check token cache first
    const cacheKey = `token_${token.substring(0, 20)}`; // Use first 20 chars as cache key
    const cachedUser = tokenCache.get(cacheKey);

    let user;

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
      } = await supabase.auth.getUser(token);

      if (error || !supabaseUser) {
        // Increment failed attempts
        authAttempts.set(clientIP, attempts + 1);

        logger.warn('Authentication failed', {
          requestId: req.id,
          error: error?.message,
          ip: clientIP,
          attempts: attempts + 1,
        });

        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired authentication token',
          },
          metadata: {
            timestamp: new Date().toISOString(),
            request_id: req.id,
            version: '1.0.0',
          },
        });
      }

      user = supabaseUser;

      // Cache valid user data
      tokenCache.set(cacheKey, user);
    }

    // Decode JWT to get additional claims (without verification since Supabase already verified)
    let tokenClaims = {};
    try {
      tokenClaims = jwt.decode(token);

      // Check token expiration
      if (tokenClaims.exp && tokenClaims.exp < Date.now() / 1000) {
        logger.warn('Token expired', {
          requestId: req.id,
          userId: user.id,
          exp: tokenClaims.exp,
        });

        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Authentication token has expired',
          },
          metadata: {
            timestamp: new Date().toISOString(),
            request_id: req.id,
            version: '1.0.0',
          },
        });
      }
    } catch (jwtError) {
      logger.warn('JWT decode failed', {
        requestId: req.id,
        error: jwtError.message,
      });
    }

    // Get user roles from database for enhanced authorization
    let userRoles = [];
    try {
      const { data: roles } = await supabase
        .from('user_active_roles')
        .select('role_name')
        .eq('user_id', user.id);

      userRoles = roles ? roles.map(r => r.role_name) : [];
    } catch (roleError) {
      logger.warn('Failed to fetch user roles', {
        requestId: req.id,
        userId: user.id,
        error: roleError.message,
      });
    }

    // Add comprehensive user context to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.app_metadata?.role || 'user',
      roles: userRoles,
      claims: tokenClaims,
      raw: user,
      authenticatedAt: new Date().toISOString(),
    };

    // Add original token for forwarding to downstream services
    req.authToken = token;

    // Reset failed attempts on successful auth
    authAttempts.del(clientIP);

    // Log successful authentication
    logger.debug('User authenticated', {
      requestId: req.id,
      userId: user.id,
      email: user.email,
      role: req.user.role,
      roles: userRoles,
    });

    next();
  } catch (error) {
    logger.error('Authentication middleware error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication service unavailable',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.id,
        version: '1.0.0',
      },
    });
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = requiredRoles => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
        },
      });
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

      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Access denied. Required roles: ${requiredRoles.join(', ')}`,
        },
      });
    }

    next();
  };
};

/**
 * Permission-based authorization middleware
 */
export const requirePermission = permission => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
        },
      });
    }

    try {
      // Check if user has the required permission
      const { data: permissions } = await supabase
        .from('user_permissions')
        .select('permission_name')
        .eq('user_id', req.user.id)
        .eq('permission_name', permission)
        .eq('is_active', true);

      if (!permissions || permissions.length === 0) {
        logger.warn('Permission denied', {
          requestId: req.id,
          userId: req.user.id,
          permission,
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: `Access denied. Required permission: ${permission}`,
          },
        });
      }

      next();
    } catch (error) {
      logger.error('Permission check failed', {
        requestId: req.id,
        userId: req.user.id,
        permission,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'PERMISSION_CHECK_ERROR',
          message: 'Unable to verify permissions',
        },
      });
    }
  };
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue without user context
    return next();
  }

  try {
    // Use the main auth middleware logic but don't fail on errors
    await authMiddleware(req, res, error => {
      if (error) {
        // Log the error but continue without user context
        logger.debug('Optional auth failed', {
          requestId: req.id,
          error: error.message,
        });
      }
      next();
    });
  } catch (error) {
    // Continue without user context on any error
    logger.debug('Optional auth error', {
      requestId: req.id,
      error: error.message,
    });
    next();
  }
};

/**
 * Get authentication statistics
 */
export const getAuthStats = () => {
  return {
    tokenCacheSize: tokenCache.keys().length,
    authAttemptsTracked: authAttempts.keys().length,
    cacheHitRate: tokenCache.getStats(),
  };
};
