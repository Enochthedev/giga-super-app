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
  stateName?: string;
  role: string;
  permissions: string[]; // Array of permission strings
  isNipostAdmin: boolean; // Flag to identify NIPOST admin users
  modulePermissions?: Record<string, any>; // Module-specific permissions for MODULE_ADMIN
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

    // Check if user has NIPOST admin permissions
    const { data: nipostPermissions, error: nipostError } = await supabase
      .from('nipost_user_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    // If user has NIPOST admin permissions, use those
    if (nipostPermissions && !nipostError) {
      const userPermissions = nipostPermissions.permissions || [];
      const modulePermissions = nipostPermissions.module_permissions || {};

      req.user = {
        id: userId,
        email: user.email || '',
        accessLevel: nipostPermissions.access_level,
        branchId: nipostPermissions.branch_id,
        stateId: nipostPermissions.state_id,
        stateName: nipostPermissions.state_name,
        role: nipostPermissions.role,
        permissions: userPermissions,
        isNipostAdmin: true,
        modulePermissions,
      };

      logger.info('NIPOST admin authenticated', {
        userId,
        role: nipostPermissions.role,
        accessLevel: nipostPermissions.access_level,
        state: nipostPermissions.state_name,
      });

      return next();
    }

    // If no NIPOST permissions, check for regular admin permissions
    // This allows backward compatibility with existing admin users
    logger.warn('No NIPOST permissions found for user', { userId });
    return res.status(403).json({
      success: false,
      error: 'No admin permissions found for this user',
      code: 'NO_PERMISSIONS',
      details: {
        message: 'This user does not have NIPOST admin dashboard access',
      },
    });
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

    // Case-insensitive role comparison
    const userRoleLower = req.user.role.toLowerCase();
    const hasRole = roles.some(r => r.toLowerCase() === userRoleLower);

    if (!hasRole) {
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
// Updated to include NIPOST admin roles (DOP, PMG, etc.)
const ADMIN_ROLES = ['admin', 'super_admin', 'DOP', 'PMG', 'REGIONAL_MANAGER', 'MODULE_ADMIN', 'ADMIN'];

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.user?.role || (req.user as any)?.active_role;
  // Case-insensitive check
  const roleUpper = role ? role.toUpperCase() : '';
  const adminRolesUpper = ADMIN_ROLES.map(r => r.toUpperCase());
  
  if (!adminRolesUpper.includes(roleUpper)) {
    return res.status(403).json({
      error: 'Insufficient role permissions',
      code: 'INSUFFICIENT_ROLE',
      details: { required: ADMIN_ROLES, current: role }
    });
  }
  next();
};
export const requireManager = requireRole([
  'admin',
  'super_admin',
  'manager',
  'DOP',
  'PMG',
  'REGIONAL_MANAGER',
]);
export const requireStaff = requireRole([
  'admin',
  'super_admin',
  'manager',
  'staff',
  'DOP',
  'PMG',
  'REGIONAL_MANAGER',
  'MODULE_ADMIN',
]);

// NIPOST-specific role middleware
export const requireDOP = requireRole(['DOP']);
export const requirePMG = requireRole(['PMG']);
export const requireRegionalManager = requireRole(['REGIONAL_MANAGER']);
export const requireModuleAdmin = requireRole(['MODULE_ADMIN']);
export const requireCourier = requireRole(['COURIER']);

// NIPOST hierarchical access (DOP can access everything, PMG can access state-level, etc.)
export const requireDOPOrHigher = requireRole(['DOP']);
export const requirePMGOrHigher = requireRole(['DOP', 'PMG']);
export const requireRegionalManagerOrHigher = requireRole(['DOP', 'PMG', 'REGIONAL_MANAGER']);

/**
 * Require NIPOST admin (any NIPOST role)
 */
export const requireNipostAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTHENTICATION_REQUIRED',
    });
  }

  if (!req.user.isNipostAdmin) {
    logger.warn('NIPOST admin access denied', {
      userId: req.user.id,
      role: req.user.role,
      path: req.path,
    });

    return res.status(403).json({
      success: false,
      error: 'NIPOST admin access required',
      code: 'NIPOST_ADMIN_REQUIRED',
      details: {
        message: 'This endpoint requires NIPOST admin dashboard access',
      },
    });
  }

  next();
};

/**
 * Require state-scoped access (validates that user can only access their assigned state)
 */
export const requireStateScope = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTHENTICATION_REQUIRED',
    });
  }

  // DOP has national access, can access any state
  if (req.user.role === 'DOP') {
    return next();
  }

  // For state-level roles, validate state access
  if (req.user.accessLevel === 'state') {
    const requestedState = req.query.state || req.body.state || req.params.state;

    if (
      requestedState &&
      requestedState !== req.user.stateId &&
      requestedState !== req.user.stateName
    ) {
      logger.warn('State access denied', {
        userId: req.user.id,
        userState: req.user.stateName,
        requestedState,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: 'Access denied to this state',
        code: 'STATE_ACCESS_DENIED',
        details: {
          userState: req.user.stateName,
          requestedState,
        },
      });
    }
  }

  next();
};
