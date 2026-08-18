import { Response, Router } from 'express';
import winston from 'winston';
import { createAudit, createFailedAudit } from '../middleware/audit';
import {
  AuthRequest,
  authenticate,
  requireAnyAccess,
  requireNationalAccess,
} from '../middleware/auth';
import {
  SELECT_FIELDS,
  calculatePagination,
  getPaginationRange,
  supabase,
} from '../utils/database';
import {
  applyRegionScope,
  getAllowedRegionIds,
  isRegionInScope,
  resolveRegionId,
} from '../utils/regionScope';

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
router.get('/', authenticate, requireAnyAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '50', search, is_active } = req.query;
    const { from, to } = getPaginationRange(page as string, limit as string);

    // Geo-scope: national admins see all users; a region-tagged admin only sees
    // users within their region subtree.
    const allowedRegionIds = await getAllowedRegionIds(req.user!);

    let query = supabase
      .from('user_profiles')
      .select(SELECT_FIELDS.USER_PROFILE, { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    query = applyRegionScope(query, allowedRegionIds);

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

// Roles accepted by the user_roles / user_active_roles CHECK constraints.
const ROLE_ENUM = [
  'CUSTOMER',
  'VENDOR',
  'DRIVER',
  'HOST',
  'ADVERTISER',
  'ADMIN',
  'DOP',
  'PMG',
  'REGIONAL_MANAGER',
  'MODULE_ADMIN',
  'COURIER',
];
const VALID_USER_TYPES = [
  'ADMIN',
  'CUSTOMER',
  'VENDOR',
  'DRIVER',
  'HOST',
  'ADVERTISER',
  'NIPOST_OFFICIAL',
];

/**
 * POST /api/admin/users
 * Create a user with a location-based region tag and geo-scope enforcement.
 *
 * Replaces the admin-create-user edge function with a Railway-deployed endpoint
 * (no Supabase function cap). A national admin (global) can register anyone in
 * any region; a region-tagged admin may only register within their own subtree.
 *
 * Body: { email, password, user_type, metadata?, nipost_details? }
 */
router.post('/', authenticate, requireAnyAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, user_type, metadata, nipost_details } = req.body;

    // --- Validate ---
    if (!email || !password || !user_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, password, user_type',
        code: 'MISSING_FIELDS',
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid email format', code: 'INVALID_EMAIL' });
    }
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long',
        code: 'WEAK_PASSWORD',
      });
    }
    if (!VALID_USER_TYPES.includes(user_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid user_type. Must be one of: ${VALID_USER_TYPES.join(', ')}`,
        code: 'INVALID_USER_TYPE',
      });
    }

    // --- Rate limit: max 20 admin user creations per hour (per acting admin) ---
    const { count } = await supabase
      .from('nipost_admin_audit')
      .select('*', { count: 'exact', head: true })
      .eq('action_type', 'create_user')
      .eq('admin_id', req.user!.id)
      .gte('created_at', new Date(Date.now() - 3600000).toISOString());
    if (count && count >= 20) {
      return res.status(429).json({
        success: false,
        error: 'Too many user creations in the last hour. Please try again later.',
        code: 'RATE_LIMITED',
      });
    }

    // --- Region scope enforcement ---
    const isGlobal = req.user!.accessLevel === 'national';
    const callerRegionId = req.user!.regionId || null;

    const requestedRegionId =
      user_type === 'NIPOST_OFFICIAL'
        ? await resolveRegionId({ regionId: nipost_details?.region_id })
        : await resolveRegionId({
            regionId: metadata?.region_id,
            regionCode: metadata?.region_code,
          });

    let effectiveRegionId = requestedRegionId;
    if (!isGlobal) {
      if (!effectiveRegionId) effectiveRegionId = callerRegionId;
      const inScope = await isRegionInScope(req.user!, effectiveRegionId);
      if (!inScope) {
        return res.status(403).json({
          success: false,
          error: 'You can only register users within your assigned region',
          code: 'REGION_OUT_OF_SCOPE',
          details: { yourRegion: callerRegionId, requestedRegion: effectiveRegionId },
        });
      }
    }

    // --- Determine the precise role (NIPOST officials use their rank) ---
    const roleName = user_type === 'NIPOST_OFFICIAL' ? nipost_details?.rank : user_type;
    if (!roleName || !ROLE_ENUM.includes(roleName)) {
      return res.status(400).json({
        success: false,
        error:
          user_type === 'NIPOST_OFFICIAL'
            ? `nipost_details.rank must be one of: ${ROLE_ENUM.join(', ')}`
            : 'Unsupported role',
        code: 'INVALID_ROLE',
      });
    }
    const isAdminType =
      user_type === 'ADMIN' ||
      user_type === 'NIPOST_OFFICIAL' ||
      ['DOP', 'PMG', 'REGIONAL_MANAGER', 'MODULE_ADMIN'].includes(roleName);

    // --- Create the auth user (signup trigger handles profile/role/wallet + region tag) ---
    const userMetadata: Record<string, any> = { ...(metadata || {}) };
    if (effectiveRegionId) userMetadata.region_id = effectiveRegionId;

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
      app_metadata: { role: isAdminType ? 'ADMIN' : user_type },
    });

    if (createError || !created.user) {
      return res.status(400).json({
        success: false,
        error: createError?.message || 'User creation failed',
        code: 'USER_CREATION_FAILED',
      });
    }
    const userId = created.user.id;

    // --- Set the precise role (trigger only assigns ADMIN/CUSTOMER) ---
    await supabase
      .from('user_roles')
      .upsert(
        { user_id: userId, role_name: roleName },
        { onConflict: 'user_id,role_name', ignoreDuplicates: true }
      );
    await supabase
      .from('user_active_roles')
      .upsert({ user_id: userId, active_role: roleName }, { onConflict: 'user_id' });

    // --- NIPOST official setup ---
    if (user_type === 'NIPOST_OFFICIAL') {
      const required = ['employee_id', 'office_id', 'position', 'clearance_level'];
      const missing = required.filter(k => nipost_details?.[k] === undefined);
      if (missing.length || !effectiveRegionId) {
        return res.status(400).json({
          success: false,
          error: `NIPOST official requires region + nipost_details: ${required.join(', ')}`,
          code: 'MISSING_NIPOST_DETAILS',
          details: { missing, region: effectiveRegionId },
        });
      }

      await supabase.from('nipost_officials').insert({
        user_id: userId,
        employee_id: nipost_details.employee_id,
        office_id: nipost_details.office_id,
        region_id: effectiveRegionId,
        position: nipost_details.position,
        rank: roleName,
        department: nipost_details.department || 'Operations',
        clearance_level: nipost_details.clearance_level,
        reporting_to: nipost_details.reporting_to || null,
        hire_date: new Date().toISOString().split('T')[0],
        is_active: true,
      });

      const accessLevel = nipost_details.clearance_level >= 8 ? 'national' : 'state';
      await supabase.from('nipost_user_permissions').insert({
        user_id: userId,
        access_level: accessLevel,
        role: roleName,
        region_id: accessLevel === 'national' ? null : effectiveRegionId,
        state_id: accessLevel === 'national' ? null : effectiveRegionId,
        is_active: true,
      });
    }

    await createAudit(req, 'create_user', 'user', userId, {
      user_type,
      role: roleName,
      region_id: effectiveRegionId,
    });

    res.status(201).json({
      success: true,
      data: { id: userId, email: created.user.email, role: roleName, region_id: effectiveRegionId },
      message: `${user_type} user created successfully`,
    });
  } catch (error: any) {
    logger.error('Failed to create user', { error: error.message });
    await createFailedAudit(req, 'create_user', 'user', error.message);
    res.status(500).json({ success: false, error: 'Failed to create user' });
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
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;

      // Geo-scope: region-tagged admins can only fetch users in their subtree.
      const allowedRegionIds = await getAllowedRegionIds(req.user!);

      // V8: user_roles / user_active_roles carry no foreign key to user_profiles, so
      // PostgREST cannot resolve them as embedded selects — including them here made
      // every request 500 (the list endpoint works precisely because it has no embeds).
      // Fetch the profile plainly, then join the role rows in a second round trip.
      let detailQuery = supabase
        .from('user_profiles')
        .select(SELECT_FIELDS.USER_PROFILE)
        .eq('id', userId);

      detailQuery = applyRegionScope(detailQuery, allowedRegionIds);

      const { data: user, error } = await detailQuery.maybeSingle();

      if (error) throw error;

      if (!user) {
        // Either missing or outside the admin's region scope.
        return res.status(404).json({ error: 'User not found' });
      }

      const [{ data: roles }, { data: activeRole }] = await Promise.all([
        supabase.from('user_roles').select('role_name, granted_at, is_active').eq('user_id', userId),
        supabase.from('user_active_roles').select('active_role').eq('user_id', userId).maybeSingle(),
      ]);

      await createAudit(req, 'view_user_details', 'user_profile', userId);

      res.json({
        success: true,
        data: {
          // SELECT_FIELDS.USER_PROFILE is a runtime string, so the row type is opaque to TS.
          ...(user as unknown as Record<string, unknown>),
          user_roles: roles ?? [],
          user_active_roles: activeRole ? [activeRole] : [],
        },
      });
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
        // V8: `.single()` throws when no row matches, turning "unknown user" into a 500.
        .maybeSingle();

      // V8: an unknown field in the body is a client error, not a server fault.
      // PostgREST reports it as 42703 / PGRST204; surface it as a 400 with the detail.
      if (error && (error.code === '42703' || error.code === 'PGRST204')) {
        return res.status(400).json({
          success: false,
          error: 'Unknown field in update payload',
          details: error.message,
        });
      }

      if (error) throw error;

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

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
