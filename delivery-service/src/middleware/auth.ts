import { createClient } from '@supabase/supabase-js';
import { NextFunction, Response } from 'express';

import config from '@/config';
import { AuthenticatedRequest } from '@/types';
import logger from '@/utils/logger';

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

/**
 * Authentication middleware
 */
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication token is required',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'unknown',
          version: '1.0.0',
        },
      });
      return;
    }

    // Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn('Invalid authentication token', {
        error: error?.message,
        request_id: req.requestId,
      });

      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired authentication token',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'unknown',
          version: '1.0.0',
        },
      });
      return;
    }

    // Extract user information
    req.user = {
      id: user.id,
      email: user.email || '',
      role: user.app_metadata?.role || 'user',
      roles: user.app_metadata?.roles || [user.app_metadata?.role || 'user'],
    };

    logger.debug('User authenticated successfully', {
      user_id: user.id,
      email: user.email,
      role: req.user.role,
      request_id: req.requestId,
    });

    next();
  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error instanceof Error ? error.message : error,
      request_id: req.requestId,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Authentication service error',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId || 'unknown',
        version: '1.0.0',
      },
    });
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'unknown',
          version: '1.0.0',
        },
      });
      return;
    }

    const userRoles = req.user.roles || [req.user.role];
    const hasRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      logger.warn('Insufficient permissions', {
        user_id: req.user.id,
        user_roles: userRoles,
        required_roles: allowedRoles,
        request_id: req.requestId,
      });

      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to access this resource',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'unknown',
          version: '1.0.0',
        },
      });
      return;
    }

    next();
  };
};
