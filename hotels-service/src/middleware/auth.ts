/**
 * Authentication middleware for Hotels Service
 * Trusts user context from API Gateway headers (X-User-ID, X-User-Email, X-User-Role)
 * Falls back to direct Supabase token validation if headers not present
 */

import { NextFunction, Request, Response } from 'express';

import { databaseService } from '../utils/database.js';

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
    // First, check for user context from API Gateway headers
    // The gateway validates the token and forwards user info
    const userId = req.headers['x-user-id'] as string;
    const userEmail = req.headers['x-user-email'] as string;
    const userRole = req.headers['x-user-role'] as string;

    if (userId) {
      // Trust the gateway's authentication
      req.user = {
        id: userId,
        email: userEmail || '',
        role: userRole || 'user',
      };

      // Store the auth token if present
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        req.authToken = authHeader.substring(7);
      }

      console.log(`[Auth] User authenticated via gateway: ${userId}`);
      next();
      return;
    }

    // Fallback: Direct token validation (for local development or direct access)
    const authHeader = req.headers.authorization || req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    req.authToken = token;

    // Validate token with Supabase
    const userClient = databaseService.createUserClient(token);
    const {
      data: { user },
      error,
    } = await userClient.auth.getUser();

    if (error || !user) {
      console.error('[Auth] Token validation failed:', error?.message);
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email || '',
      role: user.app_metadata?.role || 'user',
    };

    console.log(`[Auth] User authenticated via token: ${user.id}`);
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};
