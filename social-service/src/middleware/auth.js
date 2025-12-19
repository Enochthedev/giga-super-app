import logger from '../utils/logger.js';

/**
 * Authentication middleware for social service
 * Validates JWT tokens and extracts user context
 */
export const authMiddleware = async (req, res, next) => {
  try {
    // Skip auth for health checks and public endpoints
    if (req.path.startsWith('/health')) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authorization header with Bearer token is required',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId,
          service: 'social-service',
        },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token using Supabase client
    const supabase = req.app.locals.supabase;
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

      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired authentication token',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId,
          service: 'social-service',
        },
      });
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

      return res.status(403).json({
        success: false,
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is inactive or not found',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId,
          service: 'social-service',
        },
      });
    }

    // Extract active roles
    const roles =
      profile.user_roles?.filter(role => role.is_active)?.map(role => role.role_name) || [];

    // Attach user context to request
    req.user = {
      id: user.id,
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      avatarUrl: profile.avatar_url,
      roles,
      isActive: profile.is_active,
    };

    logger.debug('User authenticated successfully', {
      requestId: req.requestId,
      userId: user.id,
      roles,
    });

    next();
  } catch (error) {
    logger.error('Authentication middleware error', {
      requestId: req.requestId,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Internal authentication error',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
      },
    });
  }
};

/**
 * Role-based authorization middleware
 * @param {string[]} allowedRoles - Array of roles that can access the endpoint
 */
export const requireRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId,
          service: 'social-service',
        },
      });
    }

    const userRoles = req.user.roles || [];
    const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));

    if (allowedRoles.length > 0 && !hasRequiredRole) {
      logger.warn('Insufficient permissions', {
        requestId: req.requestId,
        userId: req.user.id,
        userRoles,
        requiredRoles: allowedRoles,
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId,
          service: 'social-service',
        },
      });
    }

    next();
  };
};
