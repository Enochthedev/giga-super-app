import { SupabaseClient } from '@supabase/supabase-js';
import { Request, Response, Router } from 'express';
import { ZodError } from 'zod';

import { logger } from '../utils/logger';
import {
  ErrorCodes,
  calculatePagination,
  sendAuthError,
  sendConflict,
  sendCreated,
  sendForbidden,
  sendInternalError,
  sendNotFound,
  sendSuccess,
  sendValidationError,
} from '../utils/response';
import {
  createConnectionSchema,
  paginationSchema,
  updateConnectionSchema,
} from '../validation/schemas';

const router = Router();

const getSupabase = (req: Request): SupabaseClient => req.app.locals.supabase;

/**
 * @swagger
 * /connections:
 *   get:
 *     summary: Get user connections
 *     description: Retrieve list of user's connections (friends, followers, etc.)
 *     tags: [Connections]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, blocked]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [friend, follower, family, colleague]
 *     responses:
 *       200:
 *         description: Connections retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      sendAuthError(res, 'Authentication required', req.requestId);
      return;
    }

    const { page, limit } = paginationSchema.parse(req.query);
    const status = req.query.status as string;
    const type = req.query.type as string;
    const offset = (page - 1) * limit;
    const supabase = getSupabase(req);

    let query = supabase
      .from('user_connections')
      .select(
        `
        id,
        connected_user_id,
        status,
        connection_type,
        created_at,
        user_profiles!user_connections_connected_user_id_fkey(id, first_name, last_name, avatar_url)
      `,
        { count: 'exact' }
      )
      .eq('user_id', req.user.id);

    if (status) query = query.eq('status', status);
    if (type) query = query.eq('connection_type', type);

    const {
      data: connections,
      count,
      error,
    } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    if (error) throw error;

    const pagination = calculatePagination(page, limit, count ?? 0);
    sendSuccess(res, { data: connections ?? [], pagination, requestId: req.requestId });
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(res, 'Invalid query parameters', error.issues, req.requestId);
      return;
    }
    logger.error('Error fetching connections', { error });
    sendInternalError(res, 'Failed to fetch connections', req.requestId);
  }
});

/**
 * @swagger
 * /connections/requests:
 *   get:
 *     summary: Get pending connection requests
 *     description: Retrieve pending connection requests received by the user
 *     tags: [Connections]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Requests retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/requests', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      sendAuthError(res, 'Authentication required', req.requestId);
      return;
    }

    const supabase = getSupabase(req);

    const { data: requests, error } = await supabase
      .from('user_connections')
      .select(
        `
        id,
        user_id,
        connection_type,
        created_at,
        user_profiles!user_connections_user_id_fkey(id, first_name, last_name, avatar_url)
      `
      )
      .eq('connected_user_id', req.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    sendSuccess(res, { data: requests ?? [], requestId: req.requestId });
  } catch (error) {
    logger.error('Error fetching connection requests', { error });
    sendInternalError(res, 'Failed to fetch connection requests', req.requestId);
  }
});

/**
 * @swagger
 * /connections:
 *   post:
 *     summary: Send connection request
 *     description: Send a friend/follow request to another user
 *     tags: [Connections]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - connected_user_id
 *             properties:
 *               connected_user_id:
 *                 type: string
 *                 format: uuid
 *               connection_type:
 *                 type: string
 *                 enum: [friend, follower, family, colleague]
 *                 default: friend
 *     responses:
 *       201:
 *         description: Connection request sent
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         description: Connection already exists
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      sendAuthError(res, 'Authentication required', req.requestId);
      return;
    }

    const input = createConnectionSchema.parse(req.body);
    const supabase = getSupabase(req);

    // Check if connection already exists
    const { data: existing } = await supabase
      .from('user_connections')
      .select('id, status')
      .eq('user_id', req.user.id)
      .eq('connected_user_id', input.connected_user_id)
      .single();

    if (existing) {
      sendConflict(res, ErrorCodes.CONNECTION_EXISTS, 'Connection already exists', req.requestId);
      return;
    }

    const { data: connection, error } = await supabase
      .from('user_connections')
      .insert({
        user_id: req.user.id,
        connected_user_id: input.connected_user_id,
        connection_type: input.connection_type,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Connection request sent', { from: req.user.id, to: input.connected_user_id });
    sendCreated(res, { data: connection, requestId: req.requestId });
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(res, 'Invalid connection data', error.issues, req.requestId);
      return;
    }
    logger.error('Error creating connection', { error });
    sendInternalError(res, 'Failed to create connection', req.requestId);
  }
});

/**
 * @swagger
 * /connections/{connectionId}:
 *   put:
 *     summary: Update connection status
 *     description: Accept, decline, or block a connection request
 *     tags: [Connections]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: connectionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [accepted, declined, blocked]
 *     responses:
 *       200:
 *         description: Connection updated
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:connectionId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      sendAuthError(res, 'Authentication required', req.requestId);
      return;
    }

    const { connectionId } = req.params;
    const input = updateConnectionSchema.parse(req.body);
    const supabase = getSupabase(req);

    // Verify the user is the recipient of the connection request
    const { data: existing, error: fetchError } = await supabase
      .from('user_connections')
      .select('connected_user_id')
      .eq('id', connectionId)
      .single();

    if (fetchError || !existing) {
      sendNotFound(res, ErrorCodes.CONNECTION_NOT_FOUND, 'Connection not found', req.requestId);
      return;
    }

    if (existing.connected_user_id !== req.user.id) {
      sendForbidden(res, 'You can only respond to requests sent to you', req.requestId);
      return;
    }

    const { data: connection, error } = await supabase
      .from('user_connections')
      .update({ status: input.status, updated_at: new Date().toISOString() })
      .eq('id', connectionId)
      .select()
      .single();

    if (error) throw error;

    logger.info('Connection updated', { connectionId, status: input.status });
    sendSuccess(res, { data: connection, requestId: req.requestId });
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(res, 'Invalid status', error.issues, req.requestId);
      return;
    }
    logger.error('Error updating connection', { error });
    sendInternalError(res, 'Failed to update connection', req.requestId);
  }
});

/**
 * @swagger
 * /connections/{connectionId}:
 *   delete:
 *     summary: Remove connection
 *     description: Remove an existing connection or cancel a pending request
 *     tags: [Connections]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: connectionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Connection removed
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:connectionId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      sendAuthError(res, 'Authentication required', req.requestId);
      return;
    }

    const { connectionId } = req.params;
    const supabase = getSupabase(req);

    // Verify ownership (either sender or recipient can delete)
    const { data: existing } = await supabase
      .from('user_connections')
      .select('user_id, connected_user_id')
      .eq('id', connectionId)
      .single();

    if (!existing) {
      sendNotFound(res, ErrorCodes.CONNECTION_NOT_FOUND, 'Connection not found', req.requestId);
      return;
    }

    if (existing.user_id !== req.user.id && existing.connected_user_id !== req.user.id) {
      sendForbidden(res, 'You can only remove your own connections', req.requestId);
      return;
    }

    const { error } = await supabase.from('user_connections').delete().eq('id', connectionId);

    if (error) throw error;

    logger.info('Connection removed', { connectionId, userId: req.user.id });
    sendSuccess(res, { data: { deleted: true }, requestId: req.requestId });
  } catch (error) {
    logger.error('Error removing connection', { error });
    sendInternalError(res, 'Failed to remove connection', req.requestId);
  }
});

export default router;
