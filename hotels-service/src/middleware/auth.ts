/**
 * Authentication middleware for Hotels Service
 * Direct Supabase token validation (consistent with other services)
 */

import { createClient } from '@supabase/supabase-js';
import { NextFunction, Request, Response } from 'express';

// Log environment variables on startup (without exposing secrets)
console.log('[Auth] Initializing Supabase client:', {
  SUPABASE_URL: process.env.SUPABASE_URL
    ? `${process.env.SUPABASE_URL.substring(0, 30)}...`
    : 'NOT SET',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET (hidden)' : 'NOT SET',
});

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  authToken?: string;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('[Auth] Processing request:', {
      path: req.path,
      method: req.method,
      hasAuthHeader: !!req.headers.authorization,
      authHeaderPrefix: req.headers.authorization?.substring(0, 15),
    });

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Auth] No valid auth header found');
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    req.authToken = token;

    console.log('[Auth] Validating token with Supabase...', {
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 20),
    });

    // Validate token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('[Auth] Token validation failed:', {
        error: error?.message,
        errorCode: error?.code,
        errorStatus: error?.status,
      });
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        details: error?.message,
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email || '',
      role: user.app_metadata?.role || 'user',
    };

    console.log('[Auth] User authenticated successfully:', {
      userId: user.id,
      email: user.email,
      role: req.user.role,
    });

    next();
  } catch (error: any) {
    console.error('[Auth] Middleware error:', {
      message: error?.message,
      stack: error?.stack,
    });
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      details: error?.message,
    });
  }
};
