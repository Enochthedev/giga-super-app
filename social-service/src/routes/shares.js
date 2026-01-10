import express from 'express';
import { v4 as uuidv4 } from 'uuid';

import { clearCache } from '../middleware/cache.js';
import { ForbiddenError, NotFoundError } from '../middleware/errorHandler.js';
import { validateSharePost } from '../middleware/validation.js';
import { buildPaginatedResponse, buildPagination, executeQuery } from '../utils/database.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Share a post
 * POST /api/v1/shares/posts/:postId
 */
router.post('/posts/:postId', validateSharePost, async (req, res) => {
  const { postId } = req.params;
  const { content, visibility = 'public' } = req.body;
  const {supabase} = req.app.locals;

  try {
    // Check if post exists and is accessible
    const { data: originalPost, error: postError } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('social_posts')
          .select('id, user_id, visibility, shares_count')
          .eq('id', postId)
          .is('deleted_at', null)
          .single(),
      'Check post for share',
      req.requestId
    );

    if (postError || !originalPost) {
      throw new NotFoundError('Post not found');
    }

    // Check if user can share this post (private posts can only be shared by owner)
    if (originalPost.visibility === 'private' && originalPost.user_id !== req.user.id) {
      throw new ForbiddenError('Cannot share private post');
    }

    // Create shared post
    const sharedPostData = {
      id: uuidv4(),
      user_id: req.user.id,
      content: content || '',
      shared_post_id: postId,
      post_type: 'shared',
      visibility,
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: sharedPost, error } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('social_posts')
          .insert(sharedPostData)
          .select(
            `
          *,
          user:user_profiles(id, first_name, last_name, avatar_url),
          shared_post:social_posts!shared_post_id(
            id,
            content,
            media_urls,
            created_at,
            likes_count,
            comments_count,
            shares_count,
            user:user_profiles(id, first_name, last_name, avatar_url)
          )
        `
          )
          .single(),
      'Create shared post',
      req.requestId
    );

    if (error) throw error;

    // Update original post shares count
    const newSharesCount = originalPost.shares_count + 1;
    await executeQuery(
      supabase,
      () =>
        supabase
          .from('social_posts')
          .update({
            shares_count: newSharesCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', postId),
      'Update post shares count',
      req.requestId
    );

    // Create notification for original post owner (if not sharing own post)
    if (originalPost.user_id !== req.user.id) {
      await executeQuery(
        supabase,
        () =>
          supabase.from('notification_queue').insert({
            user_id: originalPost.user_id,
            template_name: 'post_shared',
            variables: {
              sharer_name: `${req.user.first_name} ${req.user.last_name}`,
              post_id: postId,
              shared_post_id: sharedPost.id,
            },
          }),
        'Create share notification',
        req.requestId
      );
    }

    // Clear relevant caches
    clearCache(`*:*posts*`);
    clearCache(`*:*feed*`);
    clearCache(`*:*/posts/${postId}*`);

    logger.info('Post shared', {
      requestId: req.requestId,
      originalPostId: postId,
      sharedPostId: sharedPost.id,
      userId: req.user.id,
      newSharesCount,
    });

    res.status(201).json({
      success: true,
      data: {
        ...sharedPost,
        original_post: sharedPost.shared_post,
        shared_post: undefined, // Remove the join data after using it
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Error sharing post', {
      requestId: req.requestId,
      postId: req.params.postId,
      userId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

/**
 * Get users who shared a post
 * GET /api/v1/shares/posts/:postId/users
 */
router.get('/posts/:postId/users', async (req, res) => {
  const { postId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const {supabase} = req.app.locals;

  try {
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
      'Check post for shares list',
      req.requestId
    );

    if (postError || !post) {
      throw new NotFoundError('Post not found');
    }

    // Check visibility permissions
    if (post.visibility === 'private' && post.user_id !== req.user.id) {
      throw new ForbiddenError('Access denied to private post');
    }

    const pagination = buildPagination(page, limit);

    // Get users who shared the post
    const { data: shares, error } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('social_posts')
          .select(
            `
          id,
          content,
          created_at,
          user:user_profiles(id, first_name, last_name, avatar_url)
        `
          )
          .eq('shared_post_id', postId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(pagination.range[0], pagination.range[1]),
      'Get post shares',
      req.requestId
    );

    if (error) throw error;

    // Get total count
    const { count, error: countError } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('social_posts')
          .select('*', { count: 'exact', head: true })
          .eq('shared_post_id', postId)
          .is('deleted_at', null),
      'Count post shares',
      req.requestId
    );

    if (countError) throw countError;

    const response = buildPaginatedResponse(shares, pagination, count);

    logger.debug('Post shares retrieved', {
      requestId: req.requestId,
      postId,
      userId: req.user.id,
      count: shares.length,
    });

    res.json({
      ...response,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
        post_id: postId,
      },
    });
  } catch (error) {
    logger.error('Error getting post shares', {
      requestId: req.requestId,
      postId: req.params.postId,
      userId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

/**
 * Unshare a post (delete the shared post)
 * DELETE /api/v1/shares/posts/:sharedPostId
 */
router.delete('/posts/:sharedPostId', async (req, res) => {
  const { sharedPostId } = req.params;
  const {supabase} = req.app.locals;

  try {
    // Check if user owns the shared post
    const { data: sharedPost, error: getError } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('social_posts')
          .select('id, user_id, shared_post_id')
          .eq('id', sharedPostId)
          .eq('user_id', req.user.id)
          .eq('post_type', 'shared')
          .is('deleted_at', null)
          .single(),
      'Check shared post ownership',
      req.requestId
    );

    if (getError || !sharedPost) {
      throw new NotFoundError('Shared post not found or access denied');
    }

    // Soft delete the shared post
    const { error } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('social_posts')
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: req.user.id,
            deletion_reason: 'user_request',
          })
          .eq('id', sharedPostId)
          .eq('user_id', req.user.id),
      'Delete shared post',
      req.requestId
    );

    if (error) throw error;

    // Decrement original post shares count
    if (sharedPost.shared_post_id) {
      await executeQuery(
        supabase,
        () =>
          supabase.rpc('decrement_post_shares', {
            post_id: sharedPost.shared_post_id,
          }),
        'Update original post shares count',
        req.requestId
      );
    }

    // Clear relevant caches
    clearCache(`*:*posts*`);
    clearCache(`*:*feed*`);
    clearCache(`*:*/posts/${sharedPost.shared_post_id}*`);

    logger.info('Shared post deleted', {
      requestId: req.requestId,
      sharedPostId,
      originalPostId: sharedPost.shared_post_id,
      userId: req.user.id,
    });

    res.json({
      success: true,
      data: {
        message: 'Shared post deleted successfully',
        shared_post_id: sharedPostId,
        original_post_id: sharedPost.shared_post_id,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Error deleting shared post', {
      requestId: req.requestId,
      sharedPostId: req.params.sharedPostId,
      userId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

export default router;
