import { SupabaseClient } from '@supabase/supabase-js';
import { Request, Response, Router } from 'express';
import { logger } from '../utils/logger';
import {
  ErrorCodes,
  sendAuthError,
  sendInternalError,
  sendNotFound,
  sendSuccess,
} from '../utils/response';

const router = Router({ mergeParams: true });

const getSupabase = (req: Request): SupabaseClient => req.app.locals.supabase;

/**
 * @swagger
 * /posts/{postId}/like:
 *   post:
 *     summary: Like a post
 *     description: Toggle like on a post. If already liked, it will unlike.
 *     tags: [Likes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Like toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     liked:
 *                       type: boolean
 *                     like_count:
 *                       type: integer
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
    const supabase = getSupabase(req);

    // Verify post exists
    const { data: post, error: postError } = await supabase
      .from('social_posts')
      .select('id, like_count')
      .eq('id', postId)
      .is('deleted_at', null)
      .single();

    if (postError || !post) {
      sendNotFound(res, ErrorCodes.POST_NOT_FOUND, 'Post not found', req.requestId);
      return;
    }

    // Toggle like using RPC function
    const { data: result, error } = await supabase.rpc('toggle_post_like', {
      p_post_id: postId,
      p_user_id: req.user.id,
      p_tenant_id: null,
    });

    if (error) throw error;

    const liked = result?.[0]?.liked ?? false;

    // Get updated like count
    const { data: updatedPost } = await supabase
      .from('social_posts')
      .select('like_count')
      .eq('id', postId)
      .single();

    logger.info('Post like toggled', { postId, userId: req.user.id, liked });

    sendSuccess(res, {
      data: { liked, like_count: updatedPost?.like_count ?? 0 },
      requestId: req.requestId,
    });
  } catch (error) {
    logger.error('Error toggling like', { error, postId: req.params.postId });
    sendInternalError(res, 'Failed to toggle like', req.requestId);
  }
});

/**
 * @swagger
 * /posts/{postId}/like:
 *   delete:
 *     summary: Unlike a post
 *     description: Remove like from a post
 *     tags: [Likes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Post unliked successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.delete('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      sendAuthError(res, 'Authentication required', req.requestId);
      return;
    }

    const { postId } = req.params;
    const supabase = getSupabase(req);

    // Remove like directly
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', req.user.id);

    if (error) throw error;

    // Update like count
    await supabase.rpc('decrement_post_like_count', { p_post_id: postId });

    logger.info('Post unliked', { postId, userId: req.user.id });

    sendSuccess(res, { data: { liked: false }, requestId: req.requestId });
  } catch (error) {
    logger.error('Error unliking post', { error, postId: req.params.postId });
    sendInternalError(res, 'Failed to unlike post', req.requestId);
  }
});

/**
 * @swagger
 * /posts/{postId}/likes:
 *   get:
 *     summary: Get users who liked a post
 *     description: Retrieve list of users who liked a specific post
 *     tags: [Likes]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Likes retrieved successfully
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
 *                     $ref: '#/components/schemas/UserProfile'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const supabase = getSupabase(req);

    const { data: likes, error } = await supabase
      .from('post_likes')
      .select(
        `
        user_id,
        created_at,
        user_profiles!inner(id, first_name, last_name, avatar_url)
      `
      )
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const users = likes?.map((like: any) => ({
      id: like.user_profiles.id,
      first_name: like.user_profiles.first_name,
      last_name: like.user_profiles.last_name,
      avatar_url: like.user_profiles.avatar_url,
      liked_at: like.created_at,
    }));

    sendSuccess(res, { data: users ?? [], requestId: req.requestId });
  } catch (error) {
    logger.error('Error fetching likes', { error, postId: req.params.postId });
    sendInternalError(res, 'Failed to fetch likes', req.requestId);
  }
});

/**
 * @swagger
 * /comments/{commentId}/like:
 *   post:
 *     summary: Like a comment
 *     description: Toggle like on a comment
 *     tags: [Likes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Comment like toggled successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
export const likeComment = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      sendAuthError(res, 'Authentication required', req.requestId);
      return;
    }

    const { commentId } = req.params;
    const supabase = getSupabase(req);

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', req.user.id)
      .single();

    let liked: boolean;

    if (existingLike) {
      // Unlike
      await supabase.from('comment_likes').delete().eq('id', existingLike.id);
      liked = false;
    } else {
      // Like
      await supabase.from('comment_likes').insert({
        comment_id: commentId,
        user_id: req.user.id,
      });
      liked = true;
    }

    sendSuccess(res, { data: { liked }, requestId: req.requestId });
  } catch (error) {
    logger.error('Error toggling comment like', { error, commentId: req.params.commentId });
    sendInternalError(res, 'Failed to toggle comment like', req.requestId);
  }
};

export default router;
