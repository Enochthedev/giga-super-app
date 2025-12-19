import express from 'express';
import { cacheMiddleware } from '../middleware/cache.js';
import { validateGetFeed } from '../middleware/validation.js';
import { buildPaginatedResponse, buildPagination, executeQuery } from '../utils/database.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Get social media feed
 * GET /api/v1/feed
 */
router.get('/', validateGetFeed, cacheMiddleware(120), async (req, res) => {
  const { page = 1, limit = 20, type = 'all', since } = req.query;
  const supabase = req.app.locals.supabase;

  try {
    const pagination = buildPagination(page, limit);

    // Build feed query based on type
    let feedQuery = supabase
      .from('social_posts')
      .select(
        `
        *,
        user:user_profiles(id, first_name, last_name, avatar_url),
        is_liked:post_likes!left(user_id),
        recent_comments:post_comments!left(
          id,
          content,
          created_at,
          user:user_profiles(id, first_name, last_name, avatar_url)
        )
      `
      )
      .is('deleted_at', null)
      .eq('post_likes.user_id', req.user.id)
      .is('post_comments.deleted_at', null)
      .order('post_comments.created_at', { ascending: false })
      .limit(3, { foreignTable: 'post_comments' });

    // Apply feed type filters
    switch (type) {
      case 'friends':
        // Get posts from friends only
        feedQuery = feedQuery.in('user_id', [
          // This would need a subquery to get friend IDs
          // For now, we'll use a placeholder approach
          req.user.id, // Include own posts for now
        ]);
        break;

      case 'following':
        // Get posts from followed users
        feedQuery = feedQuery.in('user_id', [
          // This would need a subquery to get followed user IDs
          req.user.id, // Include own posts for now
        ]);
        break;

      case 'all':
      default:
        // Public posts only for 'all' feed
        feedQuery = feedQuery.eq('visibility', 'public');
        break;
    }

    // Apply time filter if provided
    if (since) {
      feedQuery = feedQuery.gte('created_at', since);
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('social_posts')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    // Apply same filters to count query
    switch (type) {
      case 'friends':
        countQuery = countQuery.in('user_id', [req.user.id]);
        break;
      case 'following':
        countQuery = countQuery.in('user_id', [req.user.id]);
        break;
      case 'all':
      default:
        countQuery = countQuery.eq('visibility', 'public');
        break;
    }

    if (since) {
      countQuery = countQuery.gte('created_at', since);
    }

    // Execute count query
    const { count, error: countError } = await executeQuery(
      supabase,
      () => countQuery,
      'Count feed posts',
      req.requestId
    );

    if (countError) throw countError;

    // Execute main feed query
    const { data: posts, error } = await executeQuery(
      supabase,
      () =>
        feedQuery
          .order('created_at', { ascending: false })
          .range(pagination.range[0], pagination.range[1]),
      'Get social feed',
      req.requestId
    );

    if (error) throw error;

    // Transform posts to include like status and recent comments
    const transformedPosts = posts.map(post => ({
      ...post,
      is_liked: post.is_liked && post.is_liked.length > 0,
      recent_comments: post.recent_comments || [],
      is_liked: undefined, // Remove the join data
    }));

    const response = buildPaginatedResponse(transformedPosts, pagination, count);

    logger.debug('Social feed retrieved', {
      requestId: req.requestId,
      userId: req.user.id,
      feedType: type,
      count: posts.length,
      since,
    });

    res.json({
      ...response,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
        feed_type: type,
      },
    });
  } catch (error) {
    logger.error('Error getting social feed', {
      requestId: req.requestId,
      userId: req.user.id,
      feedType: type,
      error: error.message,
    });
    throw error;
  }
});

/**
 * Get trending posts
 * GET /api/v1/feed/trending
 */
router.get('/trending', cacheMiddleware(300), async (req, res) => {
  const { page = 1, limit = 20, timeframe = '24h' } = req.query;
  const supabase = req.app.locals.supabase;

  try {
    const pagination = buildPagination(page, limit);

    // Calculate time threshold based on timeframe
    let timeThreshold = new Date();
    switch (timeframe) {
      case '1h':
        timeThreshold.setHours(timeThreshold.getHours() - 1);
        break;
      case '6h':
        timeThreshold.setHours(timeThreshold.getHours() - 6);
        break;
      case '24h':
      default:
        timeThreshold.setHours(timeThreshold.getHours() - 24);
        break;
      case '7d':
        timeThreshold.setDate(timeThreshold.getDate() - 7);
        break;
    }

    // Get trending posts based on engagement score
    // Score = (likes * 1) + (comments * 2) + (shares * 3)
    const { data: posts, error } = await executeQuery(
      supabase,
      () =>
        supabase.rpc('get_trending_posts', {
          time_threshold: timeThreshold.toISOString(),
          page_limit: pagination.limit,
          page_offset: pagination.offset,
        }),
      'Get trending posts',
      req.requestId
    );

    if (error) throw error;

    // Get total count for trending posts
    const { data: countData, error: countError } = await executeQuery(
      supabase,
      () =>
        supabase.rpc('count_trending_posts', {
          time_threshold: timeThreshold.toISOString(),
        }),
      'Count trending posts',
      req.requestId
    );

    if (countError) throw countError;

    const totalCount = countData?.[0]?.count || 0;
    const response = buildPaginatedResponse(posts || [], pagination, totalCount);

    logger.debug('Trending posts retrieved', {
      requestId: req.requestId,
      userId: req.user.id,
      timeframe,
      count: posts?.length || 0,
    });

    res.json({
      ...response,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
        timeframe,
      },
    });
  } catch (error) {
    logger.error('Error getting trending posts', {
      requestId: req.requestId,
      userId: req.user.id,
      timeframe,
      error: error.message,
    });

    // Fallback to regular feed if trending function fails
    logger.info('Falling back to regular feed', {
      requestId: req.requestId,
      userId: req.user.id,
    });

    // Redirect to regular feed
    req.query.type = 'all';
    return router.handle(req, res);
  }
});

/**
 * Get personalized feed recommendations
 * GET /api/v1/feed/recommended
 */
router.get('/recommended', cacheMiddleware(180), async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const supabase = req.app.locals.supabase;

  try {
    const pagination = buildPagination(page, limit);

    // Get recommended posts based on user's interaction history
    // This is a simplified version - in production, you'd use ML algorithms
    const { data: posts, error } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('social_posts')
          .select(
            `
          *,
          user:user_profiles(id, first_name, last_name, avatar_url),
          is_liked:post_likes!left(user_id),
          engagement_score:post_engagement_scores(score)
        `
          )
          .is('deleted_at', null)
          .eq('visibility', 'public')
          .neq('user_id', req.user.id) // Exclude own posts
          .eq('post_likes.user_id', req.user.id)
          .order('post_engagement_scores.score', { ascending: false })
          .order('created_at', { ascending: false })
          .range(pagination.range[0], pagination.range[1]),
      'Get recommended posts',
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
          .is('deleted_at', null)
          .eq('visibility', 'public')
          .neq('user_id', req.user.id),
      'Count recommended posts',
      req.requestId
    );

    if (countError) throw countError;

    // Transform posts
    const transformedPosts = posts.map(post => ({
      ...post,
      is_liked: post.is_liked && post.is_liked.length > 0,
      engagement_score: post.engagement_score?.[0]?.score || 0,
      is_liked: undefined, // Remove the join data
      engagement_score: undefined, // Remove the join data after using it
    }));

    const response = buildPaginatedResponse(transformedPosts, pagination, count);

    logger.debug('Recommended posts retrieved', {
      requestId: req.requestId,
      userId: req.user.id,
      count: posts.length,
    });

    res.json({
      ...response,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
        feed_type: 'recommended',
      },
    });
  } catch (error) {
    logger.error('Error getting recommended posts', {
      requestId: req.requestId,
      userId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

export default router;
