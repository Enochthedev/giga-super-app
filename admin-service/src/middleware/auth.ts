import { createClient } from '@supabase/supabase-js';
import { NextFunction, Request, Response } from 'express';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export interface AuthUser {
  id: string;
  email: string;
  accessLevel: 'national' | 'state' | 'branch';
  branchId?: string;
  stateId?: string;
  role: string;
  permissions: string[]; // Array of permission strings
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

/**
 * Main authentication middleware
 * Validates JWT token and loads user permissions
 */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        code: 'AUTHENTICATION_REQUIRED',
      });
    }

    // Use Supabase's built-in auth verification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      logger.error('Auth failed', { error: authError?.message });
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
    }

    const userId = user.id;

    // Get user permissions from nipost_user_permissions table
    const { data: permissions, error } = await supabase
      .from('nipost_user_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !permissions) {
      logger.error('No permissions found', { userId, error: error?.message });
      return res.status(403).json({
        success: false,
        error: 'No permissions found for this user',
        code: 'NO_PERMISSIONS',
      });
    }

    // Extract permissions array from the permissions object
    const userPermissions = permissions.permissions || [];

    req.user = {
      id: userId,
      email: user.email || '',
      accessLevel: permissions.access_level,
      branchId: permissions.branch_id,
      stateId: permissions.state_id,
      role: permissions.role,
      permissions: userPermissions,
    };

    next();
  } catch (error: any) {
    logger.error('Authentication failed', { error: error.message });
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTHENTICATION_ERROR',
    });
  }
};

/**
 * Require specific access level (national, state, or branch)
 */
export const requireAccessLevel = (levels: Array<'national' | 'state' | 'branch'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
      });
    }

    if (!levels.includes(req.user.accessLevel)) {
      logger.warn('Access denied', {
        userId: req.user.id,
        required: levels,
        current: req.user.accessLevel,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        details: {
          required: levels,
          current: req.user.accessLevel,
        },
      });
    }

    next();
  };
};

/**
 * Require specific role (e.g., 'admin', 'manager', 'staff')
 */
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Role access denied', {
        userId: req.user.id,
        required: roles,
        current: req.user.role,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: 'Insufficient role permissions',
        code: 'INSUFFICIENT_ROLE',
        details: {
          required: roles,
          current: req.user.role,
        },
      });
    }

    next();
  };
};

/**
 * Require specific permission (e.g., 'users:write', 'ads:approve')
 */
export const requirePermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
      });
    }

    if (!req.user.permissions.includes(permission)) {
      logger.warn('Permission denied', {
        userId: req.user.id,
        required: permission,
        userPermissions: req.user.permissions,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: 'Missing required permission',
        code: 'MISSING_PERMISSION',
        details: {
          required: permission,
        },
      });
    }

    next();
  };
};

/**
 * Require any of the specified permissions
 */
export const requireAnyPermission = (permissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
      });
    }

    const hasPermission = permissions.some(p => req.user!.permissions.includes(p));

    if (!hasPermission) {
      logger.warn('Permissions denied', {
        userId: req.user.id,
        required: permissions,
        userPermissions: req.user.permissions,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: 'Missing required permissions',
        code: 'MISSING_PERMISSIONS',
        details: {
          required: permissions,
        },
      });
    }

    next();
  };
};

// Convenience middleware for common access levels
export const requireNationalAccess = requireAccessLevel(['national']);
export const requireStateOrHigher = requireAccessLevel(['national', 'state']);
export const requireAnyAccess = requireAccessLevel(['national', 'state', 'branch']);

// Convenience middleware for common roles
export const requireAdmin = requireRole(['admin', 'super_admin']);
export const requireManager = requireRole(['admin', 'super_admin', 'manager']);
export const requireStaff = requireRole(['admin', 'super_admin', 'manager', 'staff']);
