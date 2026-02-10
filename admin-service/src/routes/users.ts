import { Response, Router } from 'express';
import winston from 'winston';
import { createAudit, createFailedAudit } from '../middleware/audit';
import { AuthRequest, authenticate, requireNationalAccess } from '../middleware/auth';
import {
  SELECT_FIELDS,
  calculatePagination,
  getPaginationRange,
  supabase,
} from '../utils/database';

const router = Router();
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

/**
 * GET /api/admin/users
 * Get paginated list of users
 */
router.get('/', authenticate, requireNationalAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '50', search, is_active } = req.query;
    const { from, to } = getPaginationRange(page as string, limit as string);

    let query = supabase
      .from('user_profiles')
      .select(SELECT_FIELDS.USER_PROFILE, { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data: users, count, error } = await query;

    if (error) throw error;

    await createAudit(req, 'view_users', 'user_list');

    res.json({
      success: true,
      data: users,
      pagination: calculatePagination(page as string, limit as string, count || 0),
    });
  } catch (error: any) {
    logger.error('Failed to get users', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/admin/users/:userId
 * Get single user details
 */
router.get(
  '/:userId',
  authenticate,
  requireNationalAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;

      const { data: user, error } = await supabase
        .from('user_profiles')
        .select(
          `
        ${SELECT_FIELDS.USER_PROFILE},
        user_roles(role_name, granted_at),
        user_active_roles(active_role)
      `
        )
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await createAudit(req, 'view_user_details', 'user_profile', userId);

      res.json({ success: true, data: user });
    } catch (error: any) {
      logger.error('Failed to get user', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }
);

/**
 * PATCH /api/admin/users/:userId
 * Update user details
 */
router.patch(
  '/:userId',
  authenticate,
  requireNationalAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const updates = req.body;

      // Remove fields that shouldn't be updated directly
      delete updates.id;
      delete updates.created_at;
      delete updates.email; // Email changes should go through auth

      const { data: user, error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      await createAudit(req, 'update_user', 'user_profile', userId, updates);

      res.json({ success: true, data: user });
    } catch (error: any) {
      logger.error('Failed to update user', { error: error.message });
      await createFailedAudit(req, 'update_user', 'user_profile', error.message, req.params.userId);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
);

/**
 * DELETE /api/admin/users/:userId
 * Soft delete a user
 */
router.delete(
  '/:userId',
  authenticate,
  requireNationalAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      // Soft delete - set deleted_at timestamp
      const { data: user, error } = await supabase
        .from('user_profiles')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: req.user!.id,
          deletion_reason: reason || 'Admin deletion',
          is_active: false,
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      await createAudit(req, 'delete_user', 'user_profile', userId, { reason });

      res.json({ success: true, message: 'User deleted successfully', data: user });
    } catch (error: any) {
      logger.error('Failed to delete user', { error: error.message });
      await createFailedAudit(req, 'delete_user', 'user_profile', error.message, req.params.userId);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }
);

export default router;
