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
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use Supabase's built-in auth verification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      logger.error('Auth failed', { error: authError?.message });
      return res.status(401).json({ error: 'Invalid token' });
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
      return res.status(403).json({ error: 'No permissions found' });
    }

    req.user = {
      id: userId,
      email: user.email || '',
      accessLevel: permissions.access_level,
      branchId: permissions.branch_id,
      stateId: permissions.state_id,
      role: permissions.role,
    };

    next();
  } catch (error: any) {
    logger.error('Authentication failed', { error: error.message });
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireAccessLevel = (levels: Array<'national' | 'state' | 'branch'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!levels.includes(req.user.accessLevel)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: levels,
        current: req.user.accessLevel,
      });
    }

    next();
  };
};

export const requireNationalAccess = requireAccessLevel(['national']);
export const requireStateOrHigher = requireAccessLevel(['national', 'state']);
export const requireAnyAccess = requireAccessLevel(['national', 'state', 'branch']);
