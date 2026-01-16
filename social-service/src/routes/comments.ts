import { SupabaseClient } from '@supabase/supabase-js';
import { Request, Response, Router } from 'express';
import { ZodError } from 'zod';

import { logger } from '../utils/logger';
import {
  ErrorCodes,
  sendAuthError,
  sendCreated,
  sendForbidden,
  sendInternalError,
  sendNotFound,
  sendSuccess,
  sendValidationError,
} from '../utils/response';
import { createCommentSchema, paginationSchema, updateCommentSchema } from '../validation/schemas';

const router = Router({ mergeParams: true });

const getSupabase = (req: Request): SupabaseClient => req.app.locals.supabase;

/**
 * @swagger
 * /posts/{postId}/comments:
 *   get:
 *     summary: Get comments for a post
 *     description: Retrieve paginated comments for a specific post
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Comments retrieved successfully
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
 *                     $ref: '#/components/schemas/Comment'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { page, limit } = paginationSchema.parse(req.query);
    const offset = (page - 1) * limit;
    const supabase = getSupabase(req);

    const {
      data: comments,
      count,
      error,
    } = await supabase
      .from('post_comments_with_profiles')
      .select('*', { count: 'exact' })
      .eq('post_id', postId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    sendSuccess(res, {
      data: comments ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
        hasMore: page < Math.ceil((count ?? 0) / limit),
      },
      requestId: req.requestId,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(res, 'Invalid query parameters', error.issues, req.requestId);
      return;
    }
    logger.error('Error fetching comments', { error, postId: req.params.postId });
    sendInternalError(res, 'Failed to fetch comments', req.requestId);
  }
});

/**
 * @swagger
 * /posts/{postId}/comments:
 *   post:
 *     summary: Create a comment
 *     description: Add a comment to a post. Requires authentication.
 *     tags: [Comments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCommentRequest'
 *     responses:
 *       201:
 *         description: Comment created successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      sendAuthError(res, 'Authentication required', req.requestId);
      return;
    }

    const { postId } = req.params;
    const input = createCommentSchema.parse(req.body);
    const supabase = getSupabase(req);

    // Verify post exists
    const { data: post, error: postError } = await supabase
      .from('social_posts')
      .select('id')
      .eq('id', postId)
      .is('deleted_at', null)
      .single();

    if (postError || !post) {
      sendNotFound(res, ErrorCodes.POST_NOT_FOUND, 'Post not found', req.requestId);
      return;
    }

    // Create comment using RPC function
    const { data: comments, error } = await supabase.rpc('create_post_comment', {
      p_post_id: postId,
      p_user_id: req.user.id,
      p_content: input.content,
      p_tenant_id: null,
    });

    if (error) throw error;

    const comment = comments?.[0];
    if (!comment) throw new Error('Failed to create comment');

    logger.info('Comment created', { commentId: comment.id, postId, userId: req.user.id });
    sendCreated(res, { data: comment, requestId: req.requestId });
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(res, 'Invalid comment data', error.issues, req.requestId);
      return;
    }
    logger.error('Error creating comment', { error, postId: req.params.postId });
    sendInternalError(res, 'Failed to create comment', req.requestId);
  }
});

/**
 * @swagger
 * /posts/{postId}/comments/{commentId}:
 *   put:
 *     summary: Update a comment
 *     description: Update an existing comment. Only the comment owner can update.
 *     tags: [Comments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: commentId
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
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.put('/:commentId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      sendAuthError(res, 'Authentication required', req.requestId);
      return;
    }

    const { commentId } = req.params;
    const input = updateCommentSchema.parse(req.body);
    const supabase = getSupabase(req);

    // Check ownership
    const { data: existing, error: fetchError } = await supabase
      .from('post_comments')
      .select('user_id')
      .eq('id', commentId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      sendNotFound(res, ErrorCodes.COMMENT_NOT_FOUND, 'Comment not found', req.requestId);
      return;
    }

    if (existing.user_id !== req.user.id && req.user.role !== 'admin') {
      sendForbidden(res, 'You can only update your own comments', req.requestId);
      return;
    }

    const { data: comment, error } = await supabase
      .from('post_comments')
      .update({ content: input.content, updated_at: new Date().toISOString() })
      .eq('id', commentId)
      .select()
      .single();

    if (error) throw error;

    sendSuccess(res, { data: comment, requestId: req.requestId });
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(res, 'Invalid comment data', error.issues, req.requestId);
      return;
    }
    logger.error('Error updating comment', { error, commentId: req.params.commentId });
    sendInternalError(res, 'Failed to update comment', req.requestId);
  }
});

/**
 * @swagger
 * /posts/{postId}/comments/{commentId}:
 *   delete:
 *     summary: Delete a comment
 *     description: Soft delete a comment. Only the comment owner or admin can delete.
 *     tags: [Comments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.delete('/:commentId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      sendAuthError(res, 'Authentication required', req.requestId);
      return;
    }

    const { commentId } = req.params;
    const supabase = getSupabase(req);

    const { data: existing, error: fetchError } = await supabase
      .from('post_comments')
      .select('user_id')
      .eq('id', commentId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      sendNotFound(res, ErrorCodes.COMMENT_NOT_FOUND, 'Comment not found', req.requestId);
      return;
    }

    if (existing.user_id !== req.user.id && req.user.role !== 'admin') {
      sendForbidden(res, 'You can only delete your own comments', req.requestId);
      return;
    }

    const { error } = await supabase
      .from('post_comments')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: req.user.id,
      })
      .eq('id', commentId);

    if (error) throw error;

    logger.info('Comment deleted', { commentId, userId: req.user.id });
    sendSuccess(res, { data: { deleted: true }, requestId: req.requestId });
  } catch (error) {
    logger.error('Error deleting comment', { error, commentId: req.params.commentId });
    sendInternalError(res, 'Failed to delete comment', req.requestId);
  }
});

export default router;
