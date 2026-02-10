import { createClient } from '@supabase/supabase-js';
import { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '../utils/errors';
import logger from '../utils/logger';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedError('Invalid token');
    }

    req.user = {
      id: user.id,
      email: user.email || '',
      role: user.user_metadata?.role,
    };

    next();
  } catch (error: any) {
    logger.error('Authentication failed', { error: error.message });
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Verify token with Supabase
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (!error && user) {
        req.user = {
          id: user.id,
          email: user.email || '',
          role: user.user_metadata?.role,
        };
      }
    }

    next();
  } catch (error) {
    // Continue without auth
    next();
  }
};
