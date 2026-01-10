import express from 'express';
import { v4 as uuidv4 } from 'uuid';

import { cacheMiddleware, clearCache } from '../middleware/cache.js';
import { ForbiddenError, NotFoundError } from '../middleware/errorHandler.js';
import { validateCreateComment, validateUpdateComment } from '../middleware/validation.js';
import {
  buildPaginatedResponse,
  buildPagination,
  checkResourceAccess,
  executeQuery,
} from '../utils/database.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Create a comment on a post
 * POST /api/v1/comments
 */
router.post('/', validateCreateComment, async (req, res) => {
  const { post_id, content, parent_comment_id } = req.body;
  const {supabase} = req.app.locals;

  try {
    // Check if post exists and is accessible
    const { data: post, error: postError } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('social_posts')
          .select('id, user_id, visibility, comments_count')
          .eq('id', post_id)
          .is('deleted_at', null)
          .single(),
      'Check post for comment',
      req.requestId
    );

    if (postError || !post) {
      throw new NotFoundError('Post not found');
    }

    // Check if user can comment on this post
    if (post.visibility === 'private' && post.user_id !== req.user.id) {
      throw new ForbiddenError('Cannot comment on private post');
    }

    // If replying to a comment, check if parent comment exists
    if (parent_comment_id) {
      const { data: parentComment, error: parentError } = await executeQuery(
        supabase,
        () =>
          supabase
            .from('post_comments')
            .select('id, post_id')
            .eq('id', parent_comment_id)
            .eq('post_id', post_id)
            .is('deleted_at', null)
            .single(),
        'Check parent comment',
        req.requestId
      );

      if (parentError || !parentComment) {
        throw new NotFoundError('Parent comment not found');
      }
    }

    // Create comment
    const commentData = {
      id: uuidv4(),
      post_id,
      user_id: req.user.id,
      content,
      parent_comment_id: parent_comment_id || null,
      likes_count: 0,
      replies_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: comment, error } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('post_comments')
          .insert(commentData)
          .select(
            `
          *,
          user:user_profiles(id, first_name, last_name, avatar_url)
        `
          )
          .single(),
      'Create comment',
      req.requestId
    );

    if (error) throw error;

    // Update post comments count
    await executeQuery(
      supabase,
      () =>
        supabase
          .from('social_posts')
          .update({
            comments_count: post.comments_count + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', post_id),
      'Update post comments count',
      req.requestId
    );

    // If this is a reply, update parent comment replies count
    if (parent_comment_id) {
      await executeQuery(
        supabase,
        () =>
          supabase.rpc('increment_comment_replies', {
            comment_id: parent_comment_id,
          }),
        'Update parent comment replies count',
        req.requestId
      );
    }

    // Clear relevant caches
    clearCache(`*:*posts/${post_id}*`);
    clearCache(`*:*comments*`);
    clearCache(`*:*feed*`);

    logger.info('Comment created', {
      requestId: req.requestId,
      commentId: comment.id,
      postId: post_id,
      userId: req.user.id,
      isReply: !!parent_comment_id,
    });

    res.status(201).json({
      success: true,
      data: comment,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Error creating comment', {
      requestId: req.requestId,
      postId: req.body.post_id,
      userId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

/**
 * Get comments for a post
 * GET /api/v1/comments/post/:postId
 */
router.get('/post/:postId', cacheMiddleware(180), async (req, res) => {
  const { postId } = req.params;
  const { page = 1, limit = 20, sort = 'newest' } = req.query;
  const {supabase} = req.app.locals;

  try {
    const pagination = buildPagination(page, limit);

    // Check if post exists and is accessible
    const { data: post, error: postError } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('social_posts')
          .select('id, user_id, visibility')
          .eq('id', postId)
          .is('deleted_at', null)
          .single(),
      'Check post for comments',
      req.requestId
    );

    if (postError || !post) {
      throw new NotFoundError('Post not found');
    }

    // Check visibility permissions
    if (post.visibility === 'private' && post.user_id !== req.user.id) {
      throw new ForbiddenError('Access denied to private post');
    }

    // Determine sort order
    const sortOrder = sort === 'oldest' ? { ascending: true } : { ascending: false };
    const sortColumn = sort === 'popular' ? 'likes_count' : 'created_at';

    // Get total count
    const { count, error: countError } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('post_comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId)
          .is('parent_comment_id', null) // Only top-level comments
          .is('deleted_at', null),
      'Count post comments',
      req.requestId
    );

    if (countError) throw countError;

    // Get comments with user info and like status
    const { data: comments, error } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('post_comments')
          .select(
            `
          *,
          user:user_profiles(id, first_name, last_name, avatar_url),
          is_liked:comment_likes!left(user_id),
          replies:post_comments!parent_comment_id(
            id,
            content,
            created_at,
            likes_count,
            user:user_profiles(id, first_name, last_name, avatar_url)
          )
        `
          )
          .eq('post_id', postId)
          .is('parent_comment_id', null) // Only top-level comments
          .is('deleted_at', null)
          .eq('comment_likes.user_id', req.user.id)
          .is('replies.deleted_at', null)
          .order(sortColumn, sortOrder)
          .order('replies.created_at', { ascending: true })
          .limit(3, { foreignTable: 'replies' }) // Limit replies per comment
          .range(pagination.range[0], pagination.range[1]),
      'Get post comments',
      req.requestId
    );

    if (error) throw error;

    // Transform comments to include like status
    const transformedComments = comments.map(comment => ({
      ...comment,
      is_liked: comment.is_liked && comment.is_liked.length > 0,
      replies: comment.replies || [],
      is_liked: undefined, // Remove the join data
    }));

    const response = buildPaginatedResponse(transformedComments, pagination, count);

    logger.debug('Post comments retrieved', {
      requestId: req.requestId,
      postId,
      userId: req.user.id,
      count: comments.length,
      sort,
    });

    res.json({
      ...response,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
        sort_order: sort,
      },
    });
  } catch (error) {
    logger.error('Error getting post comments', {
      requestId: req.requestId,
      postId: req.params.postId,
      userId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

/**
 * Get replies to a comment
 * GET /api/v1/comments/:commentId/replies
 */
router.get('/:commentId/replies', cacheMiddleware(180), async (req, res) => {
  const { commentId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const {supabase} = req.app.locals;

  try {
    const pagination = buildPagination(page, limit);

    // Check if parent comment exists
    const { data: parentComment, error: parentError } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('post_comments')
          .select('id, post_id')
          .eq('id', commentId)
          .is('deleted_at', null)
          .single(),
      'Check parent comment',
      req.requestId
    );

    if (parentError || !parentComment) {
      throw new NotFoundError('Comment not found');
    }

    // Get total count of replies
    const { count, error: countError } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('post_comments')
          .select('*', { count: 'exact', head: true })
          .eq('parent_comment_id', commentId)
          .is('deleted_at', null),
      'Count comment replies',
      req.requestId
    );

    if (countError) throw countError;

    // Get replies with user info and like status
    const { data: replies, error } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('post_comments')
          .select(
            `
          *,
          user:user_profiles(id, first_name, last_name, avatar_url),
          is_liked:comment_likes!left(user_id)
        `
          )
          .eq('parent_comment_id', commentId)
          .is('deleted_at', null)
          .eq('comment_likes.user_id', req.user.id)
          .order('created_at', { ascending: true })
          .range(pagination.range[0], pagination.range[1]),
      'Get comment replies',
      req.requestId
    );

    if (error) throw error;

    // Transform replies to include like status
    const transformedReplies = replies.map(reply => ({
      ...reply,
      is_liked: reply.is_liked && reply.is_liked.length > 0,
      is_liked: undefined, // Remove the join data
    }));

    const response = buildPaginatedResponse(transformedReplies, pagination, count);

    logger.debug('Comment replies retrieved', {
      requestId: req.requestId,
      commentId,
      userId: req.user.id,
      count: replies.length,
    });

    res.json({
      ...response,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
        parent_comment_id: commentId,
      },
    });
  } catch (error) {
    logger.error('Error getting comment replies', {
      requestId: req.requestId,
      commentId: req.params.commentId,
      userId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

/**
 * Update a comment
 * PUT /api/v1/comments/:commentId
 */
router.put('/:commentId', validateUpdateComment, async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;
  const {supabase} = req.app.locals;

  try {
    // Check if user owns the comment
    const hasAccess = await checkResourceAccess(
      supabase,
      'post_comments',
      commentId,
      req.user.id,
      req.requestId
    );

    if (!hasAccess) {
      throw new ForbiddenError('You can only edit your own comments');
    }

    // Update comment
    const { data: comment, error } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('post_comments')
          .update({
            content,
            updated_at: new Date().toISOString(),
          })
          .eq('id', commentId)
          .eq('user_id', req.user.id)
          .is('deleted_at', null)
          .select(
            `
          *,
          user:user_profiles(id, first_name, last_name, avatar_url)
        `
          )
          .single(),
      'Update comment',
      req.requestId
    );

    if (error) throw error;

    // Clear relevant caches
    clearCache(`*:*comments*`);
    clearCache(`*:*posts/${comment.post_id}*`);

    logger.info('Comment updated', {
      requestId: req.requestId,
      commentId,
      userId: req.user.id,
    });

    res.json({
      success: true,
      data: comment,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Error updating comment', {
      requestId: req.requestId,
      commentId: req.params.commentId,
      userId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

/**
 * Delete a comment (soft delete)
 * DELETE /api/v1/comments/:commentId
 */
router.delete('/:commentId', async (req, res) => {
  const { commentId } = req.params;
  const {supabase} = req.app.locals;

  try {
    // Check if user owns the comment or is admin
    const hasAccess = await checkResourceAccess(
      supabase,
      'post_comments',
      commentId,
      req.user.id,
      req.requestId
    );

    const isAdmin = req.user.roles.includes('admin') || req.user.roles.includes('moderator');

    if (!hasAccess && !isAdmin) {
      throw new ForbiddenError('You can only delete your own comments');
    }

    // Get comment details before deletion
    const { data: comment, error: getError } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('post_comments')
          .select('post_id, parent_comment_id')
          .eq('id', commentId)
          .is('deleted_at', null)
          .single(),
      'Get comment for deletion',
      req.requestId
    );

    if (getError || !comment) {
      throw new NotFoundError('Comment not found');
    }

    // Soft delete the comment
    const { error } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('post_comments')
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: req.user.id,
            deletion_reason: hasAccess ? 'user_request' : 'admin_action',
          })
          .eq('id', commentId)
          .is('deleted_at', null),
      'Delete comment',
      req.requestId
    );

    if (error) throw error;

    // Update post comments count
    await executeQuery(
      supabase,
      () =>
        supabase.rpc('decrement_post_comments', {
          post_id: comment.post_id,
        }),
      'Update post comments count',
      req.requestId
    );

    // If this was a reply, update parent comment replies count
    if (comment.parent_comment_id) {
      await executeQuery(
        supabase,
        () =>
          supabase.rpc('decrement_comment_replies', {
            comment_id: comment.parent_comment_id,
          }),
        'Update parent comment replies count',
        req.requestId
      );
    }

    // Clear relevant caches
    clearCache(`*:*comments*`);
    clearCache(`*:*posts/${comment.post_id}*`);

    logger.info('Comment deleted', {
      requestId: req.requestId,
      commentId,
      userId: req.user.id,
      isAdmin,
    });

    res.json({
      success: true,
      data: {
        message: 'Comment deleted successfully',
        comment_id: commentId,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Error deleting comment', {
      requestId: req.requestId,
      commentId: req.params.commentId,
      userId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

export default router;
