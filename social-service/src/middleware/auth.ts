/**
 * Authentication Middleware
 * Validates JWT tokens and extracts user context
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Authentication middleware
 * Validates JWT tokens from Supabase and extracts user context
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Skip auth for health checks and public endpoints
    if (req.path.startsWith('/health')) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError(
        'Authorization header with Bearer token is required'
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token using Supabase client
    const { supabase } = req.app.locals;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      logger.warn('Authentication failed', {
        requestId: req.requestId,
        error: authError?.message,
        ip: req.ip,
      });

      throw new AuthenticationError('Invalid or expired authentication token');
    }

    // Get user profile and roles from database
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(
        `
        id,
        email,
        first_name,
        last_name,
        avatar_url,
        is_active,
        user_roles (
          role_name,
          is_active
        )
      `
      )
      .eq('id', user.id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (profileError || !profile) {
      logger.warn('User profile not found or inactive', {
        requestId: req.requestId,
        userId: user.id,
        error: profileError?.message,
      });

      throw new AuthorizationError('User account is inactive or not found');
    }

    // Extract active roles
    const roles =
      profile.user_roles
        ?.filter((role: any) => role.is_active)
        ?.map((role: any) => role.role_name) || [];

    // Attach user context to request
    req.user = {
      id: user.id,
      email: profile.email,
      role: roles[0] || 'user', // Primary role
      roles,
    };

    logger.debug('User authenticated successfully', {
      requestId: req.requestId,
      userId: user.id,
      roles,
    });

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware
 * Attempts to authenticate but doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No authentication provided, continue without user context
      return next();
    }

    const token = authHeader.substring(7);

    const { supabase } = req.app.locals;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (!authError && user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, email, user_roles(role_name, is_active)')
        .eq('id', user.id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .single();

      if (profile) {
        const roles =
          profile.user_roles
            ?.filter((role: any) => role.is_active)
            ?.map((role: any) => role.role_name) || [];

        req.user = {
          id: user.id,
          email: profile.email,
          role: roles[0] || 'user',
          roles,
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication on error
    next();
  }
};

/**
 * Role-based authorization middleware
 * @param allowedRoles - Array of roles that can access the endpoint
 */
export const requireRoles = (allowedRoles: string[] = []) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    const userRoles = req.user.roles || [];
    const hasRequiredRole = allowedRoles.some((role) =>
      userRoles.includes(role)
    );

    if (allowedRoles.length > 0 && !hasRequiredRole) {
      logger.warn('Insufficient permissions', {
        requestId: req.requestId,
        userId: req.user.id,
        userRoles,
        requiredRoles: allowedRoles,
      });

      return next(
        new AuthorizationError(
          `Access denied. Required roles: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
};

/**
 * Admin-only middleware
 */
export const requireAdmin = requireRoles(['admin', 'super_admin']);

/**
 * Moderator or admin middleware
 */
export const requireModerator = requireRoles([
  'admin',
  'super_admin',
  'moderator',
]);
