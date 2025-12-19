import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { clearCache } from '../middleware/cache.js';
import { NotFoundError } from '../middleware/errorHandler.js';
import { validateLikeComment, validateLikePost } from '../middleware/validation.js';
import { executeQuery } from '../utils/database.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Like or unlike a post
 * POST /api/v1/likes/posts/:postId
 */
router.post('/posts/:postId', validateLikePost, async (req, res) => {
  const { postId } = req.params;
  const supabase = req.app.locals.supabase;

  try {
    // Check if post exists and is accessible
    const { data: post, error: postError } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('social_posts')
          .select('id, user_id, visibility, likes_count')
          .eq('id', postId)
          .is('deleted_at', null)
          .single(),
      'Check post for like',
      req.requestId
    );

    if (postError || !post) {
      throw new NotFoundError('Post not found');
    }

    // Check if user can like this post (private posts can only be liked by owner)
    if (post.visibility === 'private' && post.user_id !== req.user.id) {
      throw new ForbiddenError('Cannot like private post');
    }

    // Check if user has already liked this post
    const { data: existingLike, error: likeCheckError } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', req.user.id)
          .single(),
      'Check existing post like',
      req.requestId
    );

    if (likeCheckError && likeCheckError.code !== 'PGRST116') {
      throw likeCheckError;
    }

    let action = '';
    let newLikesCount = post.likes_count;

    if (existingLike) {
      // Unlike the post
      const { error: deleteError } = await executeQuery(
        supabase,
        () => supabase.from('post_likes').delete().eq('id', existingLike.id),
        'Unlike post',
        req.requestId
      );

      if (deleteError) throw deleteError;

      newLikesCount = Math.max(0, post.likes_count - 1);
      action = 'unliked';
    } else {
      // Like the post
      const likeData = {
        id: uuidv4(),
        post_id: postId,
        user_id: req.user.id,
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await executeQuery(
        supabase,
        () => supabase.from('post_likes').insert(likeData),
        'Like post',
        req.requestId
      );

      if (insertError) throw insertError;

      newLikesCount = post.likes_count + 1;
      action = 'liked';
    }

    // Update post likes count
    await executeQuery(
      supabase,
      () =>
        supabase
          .from('social_posts')
          .update({
            likes_count: newLikesCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', postId),
      'Update post likes count',
      req.requestId
    );

    // Clear relevant caches
    clearCache(`*:*posts/${postId}*`);
    clearCache(`*:*posts*`);
    clearCache(`*:*feed*`);

    logger.info(`Post ${action}`, {
      requestId: req.requestId,
      postId,
      userId: req.user.id,
      action,
      newLikesCount,
    });

    res.json({
      success: true,
      data: {
        action,
        post_id: postId,
        likes_count: newLikesCount,
        is_liked: action === 'liked',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Error toggling post like', {
      requestId: req.requestId,
      postId: req.params.postId,
      userId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

/**
 * Like or unlike a comment
 * POST /api/v1/likes/comments/:commentId
 */
router.post('/comments/:commentId', validateLikeComment, async (req, res) => {
  const { commentId } = req.params;
  const supabase = req.app.locals.supabase;

  try {
    // Check if comment exists
    const { data: comment, error: commentError } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('post_comments')
          .select('id, post_id, likes_count')
          .eq('id', commentId)
          .is('deleted_at', null)
          .single(),
      'Check comment for like',
      req.requestId
    );

    if (commentError || !comment) {
      throw new NotFoundError('Comment not found');
    }

    // Check if user has already liked this comment
    const { data: existingLike, error: likeCheckError } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('comment_likes')
          .select('id')
          .eq('comment_id', commentId)
          .eq('user_id', req.user.id)
          .single(),
      'Check existing comment like',
      req.requestId
    );

    if (likeCheckError && likeCheckError.code !== 'PGRST116') {
      throw likeCheckError;
    }

    let action = '';
    let newLikesCount = comment.likes_count;

    if (existingLike) {
      // Unlike the comment
      const { error: deleteError } = await executeQuery(
        supabase,
        () => supabase.from('comment_likes').delete().eq('id', existingLike.id),
        'Unlike comment',
        req.requestId
      );

      if (deleteError) throw deleteError;

      newLikesCount = Math.max(0, comment.likes_count - 1);
      action = 'unliked';
    } else {
      // Like the comment
      const likeData = {
        id: uuidv4(),
        comment_id: commentId,
        user_id: req.user.id,
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await executeQuery(
        supabase,
        () => supabase.from('comment_likes').insert(likeData),
        'Like comment',
        req.requestId
      );

      if (insertError) throw insertError;

      newLikesCount = comment.likes_count + 1;
      action = 'liked';
    }

    // Update comment likes count
    await executeQuery(
      supabase,
      () =>
        supabase
          .from('post_comments')
          .update({
            likes_count: newLikesCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', commentId),
      'Update comment likes count',
      req.requestId
    );

    // Clear relevant caches
    clearCache(`*:*comments*`);
    clearCache(`*:*posts/${comment.post_id}*`);

    logger.info(`Comment ${action}`, {
      requestId: req.requestId,
      commentId,
      postId: comment.post_id,
      userId: req.user.id,
      action,
      newLikesCount,
    });

    res.json({
      success: true,
      data: {
        action,
        comment_id: commentId,
        likes_count: newLikesCount,
        is_liked: action === 'liked',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Error toggling comment like', {
      requestId: req.requestId,
      commentId: req.params.commentId,
      userId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

/**
 * Get users who liked a post
 * GET /api/v1/likes/posts/:postId/users
 */
router.get('/posts/:postId/users', validateLikePost, async (req, res) => {
  const { postId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const supabase = req.app.locals.supabase;

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
      'Check post for likes list',
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

    // Get users who liked the post
    const { data: likes, error } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('post_likes')
          .select(
            `
          created_at,
          user:user_profiles(id, first_name, last_name, avatar_url)
        `
          )
          .eq('post_id', postId)
          .order('created_at', { ascending: false })
          .range(pagination.range[0], pagination.range[1]),
      'Get post likes',
      req.requestId
    );

    if (error) throw error;

    // Get total count
    const { count, error: countError } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId),
      'Count post likes',
      req.requestId
    );

    if (countError) throw countError;

    const response = buildPaginatedResponse(likes, pagination, count);

    logger.debug('Post likes retrieved', {
      requestId: req.requestId,
      postId,
      userId: req.user.id,
      count: likes.length,
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
    logger.error('Error getting post likes', {
      requestId: req.requestId,
      postId: req.params.postId,
      userId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

/**
 * Get users who liked a comment
 * GET /api/v1/likes/comments/:commentId/users
 */
router.get('/comments/:commentId/users', validateLikeComment, async (req, res) => {
  const { commentId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const supabase = req.app.locals.supabase;

  try {
    // Check if comment exists
    const { data: comment, error: commentError } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('post_comments')
          .select('id, post_id')
          .eq('id', commentId)
          .is('deleted_at', null)
          .single(),
      'Check comment for likes list',
      req.requestId
    );

    if (commentError || !comment) {
      throw new NotFoundError('Comment not found');
    }

    const pagination = buildPagination(page, limit);

    // Get users who liked the comment
    const { data: likes, error } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('comment_likes')
          .select(
            `
          created_at,
          user:user_profiles(id, first_name, last_name, avatar_url)
        `
          )
          .eq('comment_id', commentId)
          .order('created_at', { ascending: false })
          .range(pagination.range[0], pagination.range[1]),
      'Get comment likes',
      req.requestId
    );

    if (error) throw error;

    // Get total count
    const { count, error: countError } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('comment_likes')
          .select('*', { count: 'exact', head: true })
          .eq('comment_id', commentId),
      'Count comment likes',
      req.requestId
    );

    if (countError) throw countError;

    const response = buildPaginatedResponse(likes, pagination, count);

    logger.debug('Comment likes retrieved', {
      requestId: req.requestId,
      commentId,
      userId: req.user.id,
      count: likes.length,
    });

    res.json({
      ...response,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
        comment_id: commentId,
      },
    });
  } catch (error) {
    logger.error('Error getting comment likes', {
      requestId: req.requestId,
      commentId: req.params.commentId,
      userId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

export default router;
