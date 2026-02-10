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
 * @swagger
 * /api/admin/users:
 *   get:
 *     tags: [User Management]
 *     summary: Get paginated list of users
 *     description: Retrieve all users with search and filtering capabilities (National access required)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by first name, last name, or email
 *         example: 'john'
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       email:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       first_name:
 *                         type: string
 *                       last_name:
 *                         type: string
 *                       avatar_url:
 *                         type: string
 *                       is_active:
 *                         type: boolean
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *             example:
 *               success: true
 *               data:
 *                 - id: "u1234567-89ab-cdef-0123-456789abcdef"
 *                   email: "john.doe@example.com"
 *                   phone: "+2348012345678"
 *                   first_name: "John"
 *                   last_name: "Doe"
 *                   avatar_url: "https://example.com/avatar.jpg"
 *                   is_active: true
 *                   created_at: "2025-01-15T10:30:00Z"
 *               pagination:
 *                 page: 1
 *                 limit: 50
 *                 total: 15420
 *                 pages: 309
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - National access required
 *       500:
 *         description: Internal server error
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
 * @swagger
 * /api/admin/users/{userId}:
 *   get:
 *     tags: [User Management]
 *     summary: Get single user details
 *     description: Retrieve detailed information about a specific user including roles
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *             example:
 *               success: true
 *               data:
 *                 id: "u1234567-89ab-cdef-0123-456789abcdef"
 *                 email: "john.doe@example.com"
 *                 phone: "+2348012345678"
 *                 first_name: "John"
 *                 last_name: "Doe"
 *                 avatar_url: "https://example.com/avatar.jpg"
 *                 is_active: true
 *                 created_at: "2025-01-15T10:30:00Z"
 *                 user_roles:
 *                   - role_name: "customer"
 *                     granted_at: "2025-01-15T10:30:00Z"
 *                   - role_name: "driver"
 *                     granted_at: "2025-01-20T14:20:00Z"
 *                 user_active_roles:
 *                   active_role: "driver"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 *   patch:
 *     tags: [User Management]
 *     summary: Update user details
 *     description: Update user profile information (National access required)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *           example:
 *             first_name: "John"
 *             last_name: "Smith"
 *             phone: "+2348012345678"
 *             is_active: true
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: "u1234567-89ab-cdef-0123-456789abcdef"
 *                 first_name: "John"
 *                 last_name: "Smith"
 *                 updated_at: "2025-02-10T15:45:00Z"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 *   delete:
 *     tags: [User Management]
 *     summary: Soft delete a user
 *     description: Mark a user as deleted (soft delete) with optional reason
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *           example:
 *             reason: "User requested account deletion"
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "User deleted successfully"
 *               data:
 *                 id: "u1234567-89ab-cdef-0123-456789abcdef"
 *                 deleted_at: "2025-02-10T15:50:00Z"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
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
