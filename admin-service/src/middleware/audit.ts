import { createClient } from '@supabase/supabase-js';
import winston from 'winston';
import { AuthRequest } from './auth';

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

export const createAudit = async (
  req: AuthRequest,
  actionType: string,
  resourceType: string,
  resourceId?: string,
  actionDetails?: any
) => {
  try {
    if (!req.user) {
      logger.warn('Attempted audit without user context');
      return;
    }

    await supabase.from('nipost_admin_audit').insert({
      admin_id: req.user.id,
      admin_name: 'Admin User', // TODO: Get from user_profiles table
      admin_role: req.user.role,
      access_level: req.user.accessLevel,
      branch_id: req.user.branchId,
      state_id: req.user.stateId,
      action_type: actionType,
      resource_type: resourceType,
      resource_id: resourceId,
      action_details: actionDetails,
      endpoint: req.path,
      method: req.method,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      success: true,
    });
  } catch (error: any) {
    logger.error('Failed to create audit', { error: error.message });
  }
};

export const createFailedAudit = async (
  req: AuthRequest,
  actionType: string,
  resourceType: string,
  errorMessage: string,
  resourceId?: string
) => {
  try {
    if (!req.user) {
      return;
    }

    await supabase.from('nipost_admin_audit').insert({
      admin_id: req.user.id,
      admin_name: 'Admin User',
      admin_role: req.user.role,
      access_level: req.user.accessLevel,
      branch_id: req.user.branchId,
      state_id: req.user.stateId,
      action_type: actionType,
      resource_type: resourceType,
      resource_id: resourceId,
      endpoint: req.path,
      method: req.method,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      success: false,
      error_message: errorMessage,
    });
  } catch (error: any) {
    logger.error('Failed to create failed audit', { error: error.message });
  }
};
