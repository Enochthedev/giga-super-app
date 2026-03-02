import { Response, Router } from 'express';
import winston from 'winston';

import { createAudit, createFailedAudit } from '../middleware/audit';
import {
  AuthRequest,
  authenticate,
  requireDOP,
  requirePMGOrHigher,
  requireStateScope,
} from '../middleware/auth';
import { calculatePagination, getPaginationRange, supabase } from '../utils/database';

const router = Router();
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           description: Human-readable error message
 *         code:
 *           type: string
 *           description: Machine-readable error code
 *         details:
 *           type: object
 *           description: Additional error context
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: JWT token from Supabase Auth
 */

/**
 * @swagger
 * tags:
 *   - name: NIPOST Admin
 *     description: NIPOST admin hierarchy system - postal staff and courier approval workflows
 */

/**
 * @swagger
 * /api/nipost-admin/postal-staff/applications:
 *   get:
 *     tags: [NIPOST Admin]
 *     summary: Get postal staff applications
 *     description: DOP can view all applications nationwide, PMG can view applications in their assigned state only
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by approval status
 *       - in: query
 *         name: staff_type
 *         schema:
 *           type: string
 *           enum: [postmaster, regional_manager, admin_staff]
 *         description: Filter by staff type
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filter by state (DOP only - PMG automatically filtered to their state)
 *     responses:
 *       200:
 *         description: Applications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       staff_type:
 *                         type: string
 *                         enum: [postmaster, regional_manager, admin_staff]
 *                       first_name:
 *                         type: string
 *                       last_name:
 *                         type: string
 *                       email:
 *                         type: string
 *                         format: email
 *                       phone:
 *                         type: string
 *                       state:
 *                         type: string
 *                       approval_status:
 *                         type: string
 *                         enum: [pending, approved, rejected]
 *                       user_id:
 *                         type: string
 *                         format: uuid
 *                         nullable: true
 *                         description: NULL until staff member creates and links their account
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: Invalid token
 *               code: INVALID_TOKEN
 *       403:
 *         description: Forbidden - User does not have NIPOST admin permissions or trying to access different state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               no_permissions:
 *                 value:
 *                   success: false
 *                   error: No admin permissions found for this user
 *                   code: NO_PERMISSIONS
 *               state_access_denied:
 *                 value:
 *                   success: false
 *                   error: Access denied to this state
 *                   code: STATE_ACCESS_DENIED
 *                   details:
 *                     userState: Lagos
 *                     requestedState: Abuja
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/postal-staff/applications',
  authenticate,
  requirePMGOrHigher,
  requireStateScope,
  async (req: AuthRequest, res: Response) => {
    try {
      const { page = '1', limit = '20', status, staff_type, state } = req.query;
      const { from, to } = getPaginationRange(page as string, limit as string);

      let query = supabase
        .from('postal_staff')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .range(from, to)
        .order('created_at', { ascending: false });

      // Filter by status
      if (status) {
        query = query.eq('approval_status', status as string);
      }

      // Filter by staff_type
      if (staff_type) {
        query = query.eq('staff_type', staff_type as string);
      }

      // State filtering: DOP sees all, PMG sees only their state
      if (req.user!.role === 'PMG') {
        query = query.eq('state', req.user!.stateName);
      } else if (state) {
        // DOP can filter by specific state
        query = query.eq('state', state as string);
      }

      const { data: applications, count, error } = await query;

      if (error) throw error;

      await createAudit(req, 'view_postal_staff_applications', 'postal_staff');

      res.json({
        success: true,
        data: applications,
        pagination: calculatePagination(page as string, limit as string, count || 0),
      });
    } catch (error: any) {
      logger.error('Failed to get postal staff applications', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch applications' });
    }
  }
);

/**
 * @swagger
 * /api/nipost-admin/postal-staff/applications/{id}/approve:
 *   post:
 *     tags: [NIPOST Admin]
 *     summary: Approve postal staff application
 *     description: |
 *       DOP approves postal staff application and automatically creates admin roles.
 *
 *       **Validation Requirements:**
 *       1. user_id must be provided in request body
 *       2. Application must exist
 *       3. User account must exist in auth.users (staff member must sign up first)
 *       4. If user_id already set, must match provided user_id
 *
 *       **Automatic Actions:**
 *       - Creates entry in user_roles with role (PMG/REGIONAL_MANAGER/MODULE_ADMIN)
 *       - Creates entry in nipost_user_permissions with permissions array
 *       - Creates entry in user_active_roles
 *       - Staff member can immediately log in to NIPOST admin dashboard
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Postal staff application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *                 description: User ID from auth.users (staff member must create account first)
 *           example:
 *             user_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *     responses:
 *       200:
 *         description: Application approved successfully and roles created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     approval_status:
 *                       type: string
 *                       example: approved
 *                     approved_by:
 *                       type: string
 *                       format: uuid
 *                     approved_at:
 *                       type: string
 *                       format: date-time
 *                     staff_type:
 *                       type: string
 *                       enum: [postmaster, regional_manager, admin_staff]
 *                     user_id:
 *                       type: string
 *                       format: uuid
 *                 message:
 *                   type: string
 *                   example: Postal staff application approved successfully
 *       400:
 *         description: Bad request - Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missing_user_id:
 *                 summary: Missing user_id
 *                 value:
 *                   success: false
 *                   error: user_id is required
 *                   code: MISSING_USER_ID
 *                   details:
 *                     message: You must provide the user_id of the staff member to approve
 *               missing_user_account:
 *                 summary: User account not created
 *                 value:
 *                   success: false
 *                   error: This staff member has not created their account yet
 *                   code: MISSING_USER_ACCOUNT
 *                   details:
 *                     user_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                     message: The staff member must create their user account before approval. Ask them to sign up first.
 *               user_account_mismatch:
 *                 summary: User account mismatch
 *                 value:
 *                   success: false
 *                   error: This staff member has already linked a different user account
 *                   code: USER_ACCOUNT_MISMATCH
 *                   details:
 *                     existing_user_id: "existing-uuid"
 *                     provided_user_id: "provided-uuid"
 *                     message: Cannot change user_id after it has been set
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User is not DOP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: Insufficient role permissions
 *               code: INSUFFICIENT_ROLE
 *               details:
 *                 required: [DOP]
 *                 current: PMG
 *       404:
 *         description: Application not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: Application not found
 *               code: APPLICATION_NOT_FOUND
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/postal-staff/applications/:id/approve',
  authenticate,
  requireDOP,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { user_id } = req.body;

      // Validate user_id is provided
      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: 'user_id is required',
          code: 'MISSING_USER_ID',
          details: {
            message: 'You must provide the user_id of the staff member to approve',
          },
        });
      }

      // Get the postal staff application
      const { data: application, error: fetchError } = await supabase
        .from('postal_staff')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !application) {
        return res.status(404).json({
          success: false,
          error: 'Application not found',
          code: 'APPLICATION_NOT_FOUND',
        });
      }

      // Check if staff member has already linked their account
      if (application.user_id && application.user_id !== user_id) {
        return res.status(400).json({
          success: false,
          error: 'This staff member has already linked a different user account',
          code: 'USER_ACCOUNT_MISMATCH',
          details: {
            existing_user_id: application.user_id,
            provided_user_id: user_id,
            message: 'Cannot change user_id after it has been set',
          },
        });
      }

      // Verify the user account exists in auth.users
      const { data: userExists, error: userError } = await supabase.auth.admin.getUserById(user_id);

      if (userError || !userExists) {
        return res.status(400).json({
          success: false,
          error: 'This staff member has not created their account yet',
          code: 'MISSING_USER_ACCOUNT',
          details: {
            user_id,
            message:
              'The staff member must create their user account before approval. Ask them to sign up first.',
          },
        });
      }

      // Update postal_staff record - trigger will handle role creation
      const { data: approvedApplication, error } = await supabase
        .from('postal_staff')
        .update({
          approval_status: 'approved',
          approved_by: req.user!.id,
          approved_at: new Date().toISOString(),
          user_id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await createAudit(req, 'approve_postal_staff', 'postal_staff', id, {
        staff_type: approvedApplication.staff_type,
        user_id,
      });

      res.json({
        success: true,
        data: approvedApplication,
        message: 'Postal staff application approved successfully',
      });
    } catch (error: any) {
      logger.error('Failed to approve postal staff application', { error: error.message });
      await createFailedAudit(
        req,
        'approve_postal_staff',
        'postal_staff',
        error.message,
        req.params.id
      );
      res.status(500).json({ error: 'Failed to approve application' });
    }
  }
);

/**
 * @swagger
 * /api/nipost-admin/postal-staff/applications/{id}/reject:
 *   post:
 *     tags: [NIPOST Admin]
 *     summary: Reject postal staff application
 *     description: DOP can reject any application
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/postal-staff/applications/:id/reject',
  authenticate,
  requireDOP,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason is required',
          code: 'MISSING_REASON',
        });
      }

      const { data: application, error } = await supabase
        .from('postal_staff')
        .update({
          approval_status: 'rejected',
          rejected_by: req.user!.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      await createAudit(req, 'reject_postal_staff', 'postal_staff', id, { reason });

      res.json({
        success: true,
        data: application,
        message: 'Postal staff application rejected',
      });
    } catch (error: any) {
      logger.error('Failed to reject postal staff application', { error: error.message });
      await createFailedAudit(
        req,
        'reject_postal_staff',
        'postal_staff',
        error.message,
        req.params.id
      );
      res.status(500).json({ error: 'Failed to reject application' });
    }
  }
);

/**
 * @swagger
 * /api/nipost-admin/couriers/applications:
 *   get:
 *     tags: [NIPOST Admin]
 *     summary: Get courier applications
 *     description: DOP can view all, PMG can view applications in their state
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/couriers/applications',
  authenticate,
  requirePMGOrHigher,
  requireStateScope,
  async (req: AuthRequest, res: Response) => {
    try {
      const { page = '1', limit = '20', status, state } = req.query;
      const { from, to } = getPaginationRange(page as string, limit as string);

      let query = supabase
        .from('courier_profiles')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .range(from, to)
        .order('created_at', { ascending: false });

      // Filter by status
      if (status) {
        query = query.eq('approval_status', status as string);
      }

      // State filtering: DOP sees all, PMG sees only their state
      if (req.user!.role === 'PMG') {
        query = query.or(`state.eq.${req.user!.stateName},state_id.eq.${req.user!.stateId}`);
      } else if (state) {
        // DOP can filter by specific state
        query = query.or(`state.eq.${state},state_id.eq.${state}`);
      }

      const { data: applications, count, error } = await query;

      if (error) throw error;

      await createAudit(req, 'view_courier_applications', 'courier_profiles');

      res.json({
        success: true,
        data: applications,
        pagination: calculatePagination(page as string, limit as string, count || 0),
      });
    } catch (error: any) {
      logger.error('Failed to get courier applications', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch courier applications' });
    }
  }
);

/**
 * @swagger
 * /api/nipost-admin/couriers/applications/{id}/approve:
 *   post:
 *     tags: [NIPOST Admin]
 *     summary: Approve courier application
 *     description: PMG can approve couriers in their state, DOP can approve any
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/couriers/applications/:id/approve',
  authenticate,
  requirePMGOrHigher,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Get courier application
      const { data: courier, error: fetchError } = await supabase
        .from('courier_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !courier) {
        return res.status(404).json({ error: 'Courier application not found' });
      }

      // PMG can only approve couriers in their state
      if (req.user!.role === 'PMG') {
        const courierState = courier.state || courier.state_id;
        const pmgState = req.user!.stateName || req.user!.stateId;

        if (courierState !== pmgState) {
          return res.status(403).json({
            success: false,
            error: 'Cannot approve courier from different state',
            code: 'STATE_MISMATCH',
            details: {
              courierState,
              pmgState,
            },
          });
        }
      }

      // Update courier profile - trigger will handle role creation
      const { data: application, error } = await supabase
        .from('courier_profiles')
        .update({
          approval_status: 'approved',
          approved_by: req.user!.id,
          approved_at: new Date().toISOString(),
          is_verified: true,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await createAudit(req, 'approve_courier', 'courier_profiles', id, {
        user_id: courier.user_id,
      });

      res.json({
        success: true,
        data: application,
        message: 'Courier application approved successfully',
      });
    } catch (error: any) {
      logger.error('Failed to approve courier application', { error: error.message });
      await createFailedAudit(
        req,
        'approve_courier',
        'courier_profiles',
        error.message,
        req.params.id
      );
      res.status(500).json({ error: 'Failed to approve courier application' });
    }
  }
);

/**
 * @swagger
 * /api/nipost-admin/couriers/applications/{id}/reject:
 *   post:
 *     tags: [NIPOST Admin]
 *     summary: Reject courier application
 *     description: PMG can reject couriers in their state, DOP can reject any
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/couriers/applications/:id/reject',
  authenticate,
  requirePMGOrHigher,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason is required',
          code: 'MISSING_REASON',
        });
      }

      // Get courier application
      const { data: courier, error: fetchError } = await supabase
        .from('courier_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !courier) {
        return res.status(404).json({ error: 'Courier application not found' });
      }

      // PMG can only reject couriers in their state
      if (req.user!.role === 'PMG') {
        const courierState = courier.state || courier.state_id;
        const pmgState = req.user!.stateName || req.user!.stateId;

        if (courierState !== pmgState) {
          return res.status(403).json({
            success: false,
            error: 'Cannot reject courier from different state',
            code: 'STATE_MISMATCH',
          });
        }
      }

      const { data: application, error } = await supabase
        .from('courier_profiles')
        .update({
          approval_status: 'rejected',
          rejected_by: req.user!.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await createAudit(req, 'reject_courier', 'courier_profiles', id, { reason });

      res.json({
        success: true,
        data: application,
        message: 'Courier application rejected',
      });
    } catch (error: any) {
      logger.error('Failed to reject courier application', { error: error.message });
      await createFailedAudit(
        req,
        'reject_courier',
        'courier_profiles',
        error.message,
        req.params.id
      );
      res.status(500).json({ error: 'Failed to reject courier application' });
    }
  }
);

/**
 * @swagger
 * /api/nipost-admin/my-permissions:
 *   get:
 *     tags: [NIPOST Admin]
 *     summary: Get current user's NIPOST permissions
 *     description: Returns the authenticated user's NIPOST admin permissions
 *     security:
 *       - BearerAuth: []
 */
router.get('/my-permissions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        user_id: req.user!.id,
        email: req.user!.email,
        role: req.user!.role,
        access_level: req.user!.accessLevel,
        state_id: req.user!.stateId,
        state_name: req.user!.stateName,
        branch_id: req.user!.branchId,
        permissions: req.user!.permissions,
        module_permissions: req.user!.modulePermissions,
        is_nipost_admin: req.user!.isNipostAdmin,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get user permissions', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

export default router;
