import { SupabaseClient } from '@supabase/supabase-js';
import { Request, Response, Router } from 'express';
import { z, ZodError } from 'zod';

import { logger } from '../utils/logger';
import {
  ErrorCodes,
  sendAuthError,
  sendCreated,
  sendInternalError,
  sendNotFound,
  sendSuccess,
  sendValidationError,
} from '../utils/response';

const router = Router();

const getSupabase = (req: Request): SupabaseClient => req.app.locals.supabase;

const blockSchema = z.object({ user_id: z.string().uuid() });

/**
 * @swagger
 * /blocks:
 *   get:
 *     summary: List users I have blocked
 *     tags: [Blocks]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Blocked users (newest first)
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      sendAuthError(res, 'Authentication required', req.requestId);
      return;
    }

    const supabase = getSupabase(req);
    const { data: blocks, error } = await supabase
      .from('user_blocks')
      .select('blocked_id, created_at')
      .eq('blocker_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const ids = (blocks ?? []).map(b => b.blocked_id);
    const { data: profiles, error: profilesError } = ids.length
      ? await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', ids)
      : { data: [], error: null };

    if (profilesError) throw profilesError;

    const byId = new Map((profiles ?? []).map(p => [p.id, p]));
    sendSuccess(res, {
      data: (blocks ?? []).map(b => ({
        user_id: b.blocked_id,
        blocked_at: b.created_at,
        profile: byId.get(b.blocked_id) ?? null,
      })),
      requestId: req.requestId,
    });
  } catch (error) {
    logger.error('Error listing blocks', { error });
    sendInternalError(res, 'Failed to list blocked users', req.requestId);
  }
});

/**
 * @swagger
 * /blocks:
 *   post:
 *     summary: Block a user
 *     description: |
 *       Hides each user's posts, comments and stories from the other, prevents
 *       new comments and connection requests between them, and removes any
 *       existing connection. Blocking an already-blocked user is a no-op.
 *     tags: [Blocks]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: User blocked
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      sendAuthError(res, 'Authentication required', req.requestId);
      return;
    }

    const { user_id: blockedId } = blockSchema.parse(req.body);
    if (blockedId === req.user.id) {
      sendValidationError(res, 'You cannot block yourself', undefined, req.requestId);
      return;
    }

    const supabase = getSupabase(req);

    const { data: target, error: targetError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', blockedId)
      .maybeSingle();

    if (targetError) throw targetError;
    if (!target) {
      sendNotFound(res, ErrorCodes.USER_NOT_FOUND, 'User not found', req.requestId);
      return;
    }

    const { error } = await supabase
      .from('user_blocks')
      .upsert(
        { blocker_id: req.user.id, blocked_id: blockedId },
        { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true }
      );

    if (error) throw error;

    // A block ends any connection (pending or accepted) in either direction.
    const { error: connectionError } = await supabase
      .from('user_connections')
      .delete()
      .or(
        `and(user_id.eq.${req.user.id},connected_user_id.eq.${blockedId}),` +
          `and(user_id.eq.${blockedId},connected_user_id.eq.${req.user.id})`
      );

    if (connectionError) {
      logger.warn('Blocked user but failed to remove connection', {
        blockerId: req.user.id,
        blockedId,
        error: connectionError.message,
      });
    }

    sendCreated(res, { data: { user_id: blockedId, blocked: true }, requestId: req.requestId });
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(res, 'Invalid block request', error.issues, req.requestId);
      return;
    }
    logger.error('Error blocking user', { error });
    sendInternalError(res, 'Failed to block user', req.requestId);
  }
});

/**
 * @swagger
 * /blocks/{userId}:
 *   delete:
 *     summary: Unblock a user
 *     tags: [Blocks]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User unblocked (also returned if they were not blocked)
 */
router.delete('/:userId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      sendAuthError(res, 'Authentication required', req.requestId);
      return;
    }

    const { user_id: blockedId } = blockSchema.parse({ user_id: req.params.userId });
    const supabase = getSupabase(req);

    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', req.user.id)
      .eq('blocked_id', blockedId);

    if (error) throw error;

    sendSuccess(res, { data: { user_id: blockedId, blocked: false }, requestId: req.requestId });
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(res, 'Invalid user id', error.issues, req.requestId);
      return;
    }
    logger.error('Error unblocking user', { error });
    sendInternalError(res, 'Failed to unblock user', req.requestId);
  }
});

export default router;
