import { createClient } from '@supabase/supabase-js';
import { NextFunction, Request, Response } from 'express';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * JWT Authentication middleware
 * Validates Supabase JWT tokens and attaches user to request
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authorization header with Bearer token required',
        },
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: error?.message || 'Invalid or expired token',
        },
      });
      return;
    }

    // Check if user is a driver
    const { data: driverProfile } = await supabase
      .from('driver_profiles')
      .select('id, is_verified')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || (driverProfile ? 'driver' : 'rider'),
      isDriver: !!driverProfile,
    };

    next();
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      },
    });
  }
}

/**
 * Optional auth middleware - doesn't fail if no token provided
 * Useful for public endpoints that can optionally use auth
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];

    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (user) {
      const { data: driverProfile } = await supabase
        .from('driver_profiles')
        .select('id')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .single();

      req.user = {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || (driverProfile ? 'driver' : 'rider'),
        isDriver: !!driverProfile,
      };
    }

    next();
  } catch {
    // Silently continue without auth
    next();
  }
}

/**
 * Driver-only middleware - requires authenticated driver
 */
export async function driverOnlyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
      },
    });
    return;
  }

  if (!req.user.isDriver) {
    res.status(403).json({
      success: false,
      error: {
        code: 'DRIVER_ONLY',
        message: 'This endpoint is only accessible to drivers',
      },
    });
    return;
  }

  next();
}
