import express from 'express';
import { v4 as uuidv4 } from 'uuid';

import { cacheMiddleware, clearCache } from '../middleware/cache.js';
import { ForbiddenError, NotFoundError } from '../middleware/errorHandler.js';
import {
  validateCreatePost,
  validateGetPostDetails,
  validateGetUserPosts,
  validateReportContent,
  validateUpdatePost,
} from '../middleware/validation.js';
import {
  buildPaginatedResponse,
  buildPagination,
  checkResourceAccess,
  executeQuery,
} from '../utils/database.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Create a new social post
 * POST /api/v1/posts
 */
router.post('/', validateCreatePost, async (req, res) => {
  const { content, visibility = 'public', media_urls = [], tags = [] } = req.body;
  const {supabase} = req.app.locals;

  try {
    const postData = {
      id: uuidv4(),
      user_id: req.user.id,
      content,
      visibility,
      media_urls,
      tags,
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: post, error } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('social_posts')
          .insert(postData)
          .select(
            `
          *,
          user:user_profiles(id, first_name, last_name, avatar_url)
        `
          )
          .single(),
      'Create social post',
      req.requestId
    );

    if (error) throw error;

    // Clear user's feed cache
    clearCache(`${req.user.id}:*feed*`);
    clearCache(`*:*posts*`);

    logger.info('Social post created', {
      requestId: req.requestId,
      postId: post.id,
      userId: req.user.id,
      visibility,
    });

    res.status(201).json({
      success: true,
      data: post,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Error creating social post', {
      requestId: req.requestId,
      userId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

/**
 * Get user's posts
 * GET /api/v1/posts/user/:userId
 */
router.get('/user/:userId', validateGetUserPosts, cacheMiddleware(300), async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const {supabase} = req.app.locals;

  try {
    const pagination = buildPagination(page, limit);

    // Check if requesting own posts or public posts
    const isOwnPosts = userId === req.user.id;
    const visibilityFilter = isOwnPosts
      ? {} // Own posts - all visibility levels
      : { visibility: 'public' }; // Others' posts - only public

    // Get total count
    const { count, error: countError } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('social_posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .match(visibilityFilter)
          .is('deleted_at', null),
      'Count user posts',
      req.requestId
    );

    if (countError) throw countError;

    // Get posts with user info
    const { data: posts, error } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('social_posts')
          .select(
            `
          *,
          user:user_profiles(id, first_name, last_name, avatar_url),
          is_liked:post_likes!inner(user_id)
        `
          )
          .eq('user_id', userId)
          .match(visibilityFilter)
          .is('deleted_at', null)
          .eq('post_likes.user_id', req.user.id)
          .order('created_at', { ascending: false })
          .range(pagination.range[0], pagination.range[1]),
      'Get user posts',
      req.requestId
    );

    if (error) throw error;

    // Transform posts to include like status
    const transformedPosts = posts.map(post => ({
      ...post,
      is_liked: post.is_liked && post.is_liked.length > 0,
      is_liked: undefined, // Remove the join data
    }));

    const response = buildPaginatedResponse(transformedPosts, pagination, count);

    logger.debug('User posts retrieved', {
      requestId: req.requestId,
      userId,
      requesterId: req.user.id,
      count: posts.length,
      isOwnPosts,
    });

    res.json({
      ...response,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Error getting user posts', {
      requestId: req.requestId,
      userId,
      requesterId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

/**
 * Get post details
 * GET /api/v1/posts/:postId
 */
router.get('/:postId', validateGetPostDetails, cacheMiddleware(180), async (req, res) => {
  const { postId } = req.params;
  const { include_comments = false, comments_limit = 10 } = req.query;
  const {supabase} = req.app.locals;

  try {
    // Get post with user info
    const { data: post, error } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('social_posts')
          .select(
            `
          *,
          user:user_profiles(id, first_name, last_name, avatar_url),
          is_liked:post_likes!left(user_id)
        `
          )
          .eq('id', postId)
          .eq('post_likes.user_id', req.user.id)
          .is('deleted_at', null)
          .single(),
      'Get post details',
      req.requestId
    );

    if (error || !post) {
      throw new NotFoundError('Post not found');
    }

    // Check visibility permissions
    if (post.visibility === 'private' && post.user_id !== req.user.id) {
      throw new ForbiddenError('Access denied to private post');
    }

    // Transform post data
    const transformedPost = {
      ...post,
      is_liked: post.is_liked && post.is_liked.length > 0,
      is_liked: undefined, // Remove the join data
    };

    // Get comments if requested
    if (include_comments) {
      const { data: comments, error: commentsError } = await executeQuery(
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
            .eq('post_id', postId)
            .eq('comment_likes.user_id', req.user.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: true })
            .limit(comments_limit),
        'Get post comments',
        req.requestId
      );

      if (commentsError) throw commentsError;

      transformedPost.comments = comments.map(comment => ({
        ...comment,
        is_liked: comment.is_liked && comment.is_liked.length > 0,
        is_liked: undefined, // Remove the join data
      }));
    }

    logger.debug('Post details retrieved', {
      requestId: req.requestId,
      postId,
      userId: req.user.id,
      includeComments: include_comments,
    });

    res.json({
      success: true,
      data: transformedPost,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Error getting post details', {
      requestId: req.requestId,
      postId,
      userId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

/**
 * Update a post
 * PUT /api/v1/posts/:postId
 */
router.put('/:postId', validateUpdatePost, async (req, res) => {
  const { postId } = req.params;
  const { content, visibility, media_urls, tags } = req.body;
  const {supabase} = req.app.locals;

  try {
    // Check if user owns the post
    const hasAccess = await checkResourceAccess(
      supabase,
      'social_posts',
      postId,
      req.user.id,
      req.requestId
    );

    if (!hasAccess) {
      throw new ForbiddenError('You can only edit your own posts');
    }

    // Build update data
    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (content !== undefined) updateData.content = content;
    if (visibility !== undefined) updateData.visibility = visibility;
    if (media_urls !== undefined) updateData.media_urls = media_urls;
    if (tags !== undefined) updateData.tags = tags;

    const { data: post, error } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('social_posts')
          .update(updateData)
          .eq('id', postId)
          .eq('user_id', req.user.id)
          .is('deleted_at', null)
          .select(
            `
          *,
          user:user_profiles(id, first_name, last_name, avatar_url)
        `
          )
          .single(),
      'Update social post',
      req.requestId
    );

    if (error) throw error;

    // Clear relevant caches
    clearCache(`*:*posts*`);
    clearCache(`*:*feed*`);
    clearCache(`*:*/posts/${postId}*`);

    logger.info('Social post updated', {
      requestId: req.requestId,
      postId,
      userId: req.user.id,
    });

    res.json({
      success: true,
      data: post,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Error updating social post', {
      requestId: req.requestId,
      postId,
      userId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

/**
 * Delete a post (soft delete)
 * DELETE /api/v1/posts/:postId
 */
router.delete('/:postId', async (req, res) => {
  const { postId } = req.params;
  const {supabase} = req.app.locals;

  try {
    // Check if user owns the post or is admin
    const hasAccess = await checkResourceAccess(
      supabase,
      'social_posts',
      postId,
      req.user.id,
      req.requestId
    );

    const isAdmin = req.user.roles.includes('admin') || req.user.roles.includes('moderator');

    if (!hasAccess && !isAdmin) {
      throw new ForbiddenError('You can only delete your own posts');
    }

    // Soft delete the post
    const { error } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('social_posts')
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: req.user.id,
            deletion_reason: hasAccess ? 'user_request' : 'admin_action',
          })
          .eq('id', postId)
          .is('deleted_at', null),
      'Delete social post',
      req.requestId
    );

    if (error) throw error;

    // Clear relevant caches
    clearCache(`*:*posts*`);
    clearCache(`*:*feed*`);
    clearCache(`*:*/posts/${postId}*`);

    logger.info('Social post deleted', {
      requestId: req.requestId,
      postId,
      userId: req.user.id,
      isAdmin,
    });

    res.json({
      success: true,
      data: {
        message: 'Post deleted successfully',
        post_id: postId,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Error deleting social post', {
      requestId: req.requestId,
      postId,
      userId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

/**
 * Report a post
 * POST /api/v1/posts/:postId/report
 */
router.post('/:postId/report', validateReportContent, async (req, res) => {
  const { postId } = req.params;
  const { reason, description } = req.body;
  const {supabase} = req.app.locals;

  try {
    // Check if post exists
    const { data: post, error: postError } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('social_posts')
          .select('id, user_id')
          .eq('id', postId)
          .is('deleted_at', null)
          .single(),
      'Check post exists for report',
      req.requestId
    );

    if (postError || !post) {
      throw new NotFoundError('Post not found');
    }

    // Create report
    const reportData = {
      id: uuidv4(),
      reporter_id: req.user.id,
      content_type: 'post',
      content_id: postId,
      content_owner_id: post.user_id,
      reason,
      description,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const { data: report, error } = await executeQuery(
      supabase,
      () => supabase.from('content_reports').insert(reportData).select().single(),
      'Create post report',
      req.requestId
    );

    if (error) throw error;

    logger.info('Post reported', {
      requestId: req.requestId,
      postId,
      reporterId: req.user.id,
      reason,
    });

    res.status(201).json({
      success: true,
      data: {
        message: 'Post reported successfully',
        report_id: report.id,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Error reporting post', {
      requestId: req.requestId,
      postId,
      userId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

export default router;
