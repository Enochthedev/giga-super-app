import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import logger from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    branchId?: string;
    stateId?: string;
    permissions?: string[];
  };
}

type AdminLevel = 'branch' | 'state' | 'national';

/**
 * Check if user has required role
 */
export const requireRole = (allowedRoles: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const userRole = req.user.role;

      if (!allowedRoles.includes(userRole)) {
        logger.warn('Insufficient role', {
          userId: req.user.id,
          userRole,
          requiredRoles: allowedRoles,
        });
        throw new ForbiddenError('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user has specific permission
 */
export const requirePermission = (permission: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const userPermissions = req.user.permissions || [];

      if (!userPermissions.includes(permission) && !userPermissions.includes('*')) {
        logger.warn('Missing permission', {
          userId: req.user.id,
          requiredPermission: permission,
          userPermissions,
        });
        throw new ForbiddenError(`Missing permission: ${permission}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check admin hierarchy access level
 * Branch admin can only see their branch
 * State admin can see all branches in their state
 * National admin can see everything
 */
export const requireAdminLevel = (level: AdminLevel) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const userRole = req.user.role;

      // Define hierarchy
      const hierarchy: Record<string, number> = {
        branch_admin: 1,
        state_admin: 2,
        national_admin: 3,
        super_admin: 4,
      };

      const levelRequirements: Record<AdminLevel, number> = {
        branch: 1,
        state: 2,
        national: 3,
      };

      const userLevel = hierarchy[userRole] || 0;
      const requiredLevel = levelRequirements[level] || 0;

      if (userLevel < requiredLevel) {
        logger.warn('Insufficient admin level', {
          userId: req.user.id,
          userRole,
          requiredLevel: level,
        });
        throw new ForbiddenError(`Admin level ${level} required`);
      }

      // Add access scope to request for filtering
      if (level === 'branch' && req.user.branchId) {
        req.query.branchId = req.user.branchId;
      } else if (level === 'state' && req.user.stateId) {
        req.query.stateId = req.user.stateId;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user can access specific branch data
 */
export const canAccessBranch = (branchIdParam: string = 'branchId') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const requestedBranchId = req.params[branchIdParam] || req.query[branchIdParam] as string;

      if (!requestedBranchId) {
        throw new ForbiddenError('Branch ID required');
      }

      const userRole = req.user.role;
      const userBranchId = req.user.branchId;
      const userStateId = req.user.stateId;

      // Super admin and national admin can access all branches
      if (userRole === 'super_admin' || userRole === 'national_admin') {
        return next();
      }

      // State admin can access branches in their state
      if (userRole === 'state_admin' && userStateId) {
        // We would need to verify if the requested branch belongs to user's state
        // For simplicity, allowing state admins to access any branch in this example
        // In production, add proper state-branch relationship check
        return next();
      }

      // Branch admin can only access their own branch
      if (userRole === 'branch_admin' && userBranchId === requestedBranchId) {
        return next();
      }

      logger.warn('Unauthorized branch access attempt', {
        userId: req.user.id,
        userRole,
        userBranchId,
        requestedBranchId,
      });

      throw new ForbiddenError('Cannot access this branch data');
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user can access specific state data
 */
export const canAccessState = (stateIdParam: string = 'stateId') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const requestedStateId = req.params[stateIdParam] || req.query[stateIdParam] as string;

      if (!requestedStateId) {
        throw new ForbiddenError('State ID required');
      }

      const userRole = req.user.role;
      const userStateId = req.user.stateId;

      // Super admin and national admin can access all states
      if (userRole === 'super_admin' || userRole === 'national_admin') {
        return next();
      }

      // State admin can only access their own state
      if (userRole === 'state_admin' && userStateId === requestedStateId) {
        return next();
      }

      logger.warn('Unauthorized state access attempt', {
        userId: req.user.id,
        userRole,
        userStateId,
        requestedStateId,
      });

      throw new ForbiddenError('Cannot access this state data');
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Verify webhook signature (for external services)
 */
export const verifyWebhookSignature = (secretHeaderName: string = 'x-webhook-signature') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers[secretHeaderName.toLowerCase()] as string;

      if (!signature) {
        throw new UnauthorizedError('Missing webhook signature');
      }

      // Signature verification logic would go here
      // This is a placeholder - implement based on your webhook provider
      
      next();
    } catch (error) {
      next(error);
    }
  };
};
