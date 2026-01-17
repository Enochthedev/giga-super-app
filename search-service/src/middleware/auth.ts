/**
 * Authentication middleware for Search Service
 */

import { createClient } from '@supabase/supabase-js';
import { NextFunction, Request, Response } from 'express';
import { SearchLogger } from '../utils/logger.js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role?: string;
        roles?: string[];
        app_metadata?: any;
        user_metadata?: any;
      };
      logger?: SearchLogger;
    }
  }
}

/**
 * Authentication middleware - validates JWT tokens
 */
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authorization header with Bearer token is required',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: (req.headers['x-request-id'] as string) || 'unknown',
          version: '1.0.0',
        },
      });
      return;
    }

    const token = authHeader.substring(7);

    // Create Supabase client with the user's token
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Verify the token and get user
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      req.logger?.logSecurityEvent('Invalid token attempt', 'medium', {
        token: token.substring(0, 10) + '...',
        error: error?.message,
      });

      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired authentication token',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: (req.headers['x-request-id'] as string) || 'unknown',
          version: '1.0.0',
        },
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email || '',
      role: user.app_metadata?.role,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
    };

    req.logger?.info('User authenticated successfully', {
      userId: user.id,
      email: user.email,
      role: user.app_metadata?.role,
    });

    next();
  } catch (error) {
    req.logger?.error('Authentication error', error as Error);

    res.status(500).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication service error',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: (req.headers['x-request-id'] as string) || 'unknown',
        version: '1.0.0',
      },
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No authentication provided, continue without user context
      next();
      return;
    }

    const token = authHeader.substring(7);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (!error && user) {
      req.user = {
        id: user.id,
        email: user.email || '',
        role: user.app_metadata?.role,
        app_metadata: user.app_metadata,
        user_metadata: user.user_metadata,
      };

      req.logger?.info('Optional authentication successful', {
        userId: user.id,
        email: user.email,
      });
    }

    next();
  } catch (error) {
    // Log error but don't fail the request
    req.logger?.warn('Optional authentication failed', { error: (error as Error).message });
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required for this endpoint',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: (req.headers['x-request-id'] as string) || 'unknown',
          version: '1.0.0',
        },
      });
      return;
    }

    const userRole = req.user.role || 'user';

    if (!allowedRoles.includes(userRole)) {
      req.logger?.logSecurityEvent('Unauthorized role access attempt', 'high', {
        userId: req.user.id,
        userRole,
        requiredRoles: allowedRoles,
        endpoint: req.path,
      });

      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: (req.headers['x-request-id'] as string) || 'unknown',
          version: '1.0.0',
        },
      });
      return;
    }

    req.logger?.info('Role authorization successful', {
      userId: req.user.id,
      userRole,
      endpoint: req.path,
    });

    next();
  };
};

/**
 * Admin-only middleware
 */
export const requireAdmin = requireRole(['admin', 'super_admin']);

/**
 * Moderator or admin middleware
 */
export const requireModerator = requireRole(['moderator', 'admin', 'super_admin']);

/**
 * API key authentication for service-to-service communication
 */
export const authenticateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;
  const validApiKey = process.env.SEARCH_SERVICE_API_KEY;

  if (!apiKey || !validApiKey || apiKey !== validApiKey) {
    req.logger?.logSecurityEvent('Invalid API key attempt', 'high', {
      providedKey: apiKey ? apiKey.substring(0, 8) + '...' : 'none',
      endpoint: req.path,
      ip: req.ip,
    });

    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_API_KEY',
        message: 'Valid API key required for service access',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: (req.headers['x-request-id'] as string) || 'unknown',
        version: '1.0.0',
      },
    });
    return;
  }

  req.logger?.info('API key authentication successful');
  next();
};

/**
 * Rate limiting by user ID
 */
export const rateLimitByUser = (maxRequests: number, windowMs: number) => {
  const userRequests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();

    const userLimit = userRequests.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Reset or initialize user limit
      userRequests.set(userId, {
        count: 1,
        resetTime: now + windowMs,
      });
      next();
      return;
    }

    if (userLimit.count >= maxRequests) {
      req.logger?.logSecurityEvent('Rate limit exceeded', 'medium', {
        userId,
        count: userLimit.count,
        maxRequests,
        windowMs,
      });

      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Limit: ${maxRequests} per ${windowMs / 1000} seconds`,
          details: {
            limit: maxRequests,
            window: windowMs / 1000,
            reset_at: new Date(userLimit.resetTime).toISOString(),
          },
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: (req.headers['x-request-id'] as string) || 'unknown',
          version: '1.0.0',
        },
      });
      return;
    }

    // Increment request count
    userLimit.count++;
    next();
  };
};
