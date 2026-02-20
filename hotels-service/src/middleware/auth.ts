/**
 * Authentication middleware for Booking Service
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

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};
