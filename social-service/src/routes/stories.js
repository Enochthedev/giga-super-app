import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { cacheMiddleware, clearCache } from '../middleware/cache.js';
import { ForbiddenError, NotFoundError } from '../middleware/errorHandler.js';
import { validateCreateStory, validateViewStory } from '../middleware/validation.js';
import {
  buildPaginatedResponse,
  buildPagination,
  checkResourceAccess,
  executeQuery,
} from '../utils/database.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Create a new story
 * POST /api/v1/stories
 */
router.post('/', validateCreateStory, async (req, res) => {
  const { content, media_url, media_type = 'image', duration = 24 } = req.body;
  const supabase = req.app.locals.supabase;

  try {
    if (!content && !media_url) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content or media URL required',
        },
      });
    }

    // Calculate expiry time (default 24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + duration);

    const storyData = {
      id: uuidv4(),
      user_id: req.user.id,
      content: content || '',
      media_url,
      media_type,
      expires_at: expiresAt.toISOString(),
      views_count: 0,
      created_at: new Date().toISOString(),
    };

    const { data: story, error } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('stories')
          .insert(storyData)
          .select(
            `
          *,
          user:user_profiles(id, first_name, last_name, avatar_url)
        `
          )
          .single(),
      'Create story',
      req.requestId
    );

    if (error) throw error;

    // Clear stories cache
    clearCache(`*:*stories*`);

    logger.info('Story created', {
      requestId: req.requestId,
      storyId: story.id,
      userId: req.user.id,
      mediaType: media_type,
    });

    res.status(201).json({
      success: true,
      data: story,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Error creating story', {
      requestId: req.requestId,
      userId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

/**
 * Get active stories
 * GET /api/v1/stories
 */
router.get('/', cacheMiddleware(120), async (req, res) => {
  const { page = 1, limit = 20, user_id } = req.query;
  const supabase = req.app.locals.supabase;

  try {
    const pagination = buildPagination(page, limit);

    let query = supabase
      .from('stories')
      .select(
        `
        *,
        user:user_profiles(id, first_name, last_name, avatar_url),
        is_viewed:story_views!left(user_id)
      `
      )
      .gt('expires_at', new Date().toISOString()) // Only active stories
      .eq('story_views.user_id', req.user.id)
      .order('created_at', { ascending: false });

    // Filter by user if specified
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    // Get total count
    let countQuery = supabase
      .from('stories')
      .select('*', { count: 'exact', head: true })
      .gt('expires_at', new Date().toISOString());

    if (user_id) {
      countQuery = countQuery.eq('user_id', user_id);
    }

    const { count, error: countError } = await executeQuery(
      supabase,
      () => countQuery,
      'Count active stories',
      req.requestId
    );

    if (countError) throw countError;

    // Get stories
    const { data: stories, error } = await executeQuery(
      supabase,
      () => query.range(pagination.range[0], pagination.range[1]),
      'Get active stories',
      req.requestId
    );

    if (error) throw error;

    // Transform stories to include view status
    const transformedStories = stories.map(story => ({
      ...story,
      is_viewed: story.is_viewed && story.is_viewed.length > 0,
      is_viewed: undefined, // Remove the join data
    }));

    const response = buildPaginatedResponse(transformedStories, pagination, count);

    logger.debug('Stories retrieved', {
      requestId: req.requestId,
      userId: req.user.id,
      count: stories.length,
      filterUserId: user_id,
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
    logger.error('Error getting stories', {
      requestId: req.requestId,
      userId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

/**
 * View a story
 * POST /api/v1/stories/:storyId/view
 */
router.post('/:storyId/view', validateViewStory, async (req, res) => {
  const { storyId } = req.params;
  const supabase = req.app.locals.supabase;

  try {
    // Check if story exists and is active
    const { data: story, error: storyError } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('stories')
          .select('id, user_id, views_count, expires_at')
          .eq('id', storyId)
          .gt('expires_at', new Date().toISOString())
          .single(),
      'Check story for view',
      req.requestId
    );

    if (storyError || !story) {
      throw new NotFoundError('Story not found or expired');
    }

    // Check if user has already viewed this story
    const { data: existingView, error: viewCheckError } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('story_views')
          .select('id')
          .eq('story_id', storyId)
          .eq('user_id', req.user.id)
          .single(),
      'Check existing story view',
      req.requestId
    );

    if (viewCheckError && viewCheckError.code !== 'PGRST116') {
      throw viewCheckError;
    }

    let newViewsCount = story.views_count;

    if (!existingView) {
      // Record the view
      const viewData = {
        id: uuidv4(),
        story_id: storyId,
        user_id: req.user.id,
        viewed_at: new Date().toISOString(),
      };

      const { error: insertError } = await executeQuery(
        supabase,
        () => supabase.from('story_views').insert(viewData),
        'Record story view',
        req.requestId
      );

      if (insertError) throw insertError;

      newViewsCount = story.views_count + 1;

      // Update story views count
      await executeQuery(
        supabase,
        () =>
          supabase
            .from('stories')
            .update({
              views_count: newViewsCount,
            })
            .eq('id', storyId),
        'Update story views count',
        req.requestId
      );
    }

    // Clear relevant caches
    clearCache(`*:*stories*`);

    logger.info('Story viewed', {
      requestId: req.requestId,
      storyId,
      userId: req.user.id,
      newView: !existingView,
      newViewsCount,
    });

    res.json({
      success: true,
      data: {
        story_id: storyId,
        views_count: newViewsCount,
        already_viewed: !!existingView,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Error viewing story', {
      requestId: req.requestId,
      storyId: req.params.storyId,
      userId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

/**
 * Get story viewers
 * GET /api/v1/stories/:storyId/viewers
 */
router.get('/:storyId/viewers', async (req, res) => {
  const { storyId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const supabase = req.app.locals.supabase;

  try {
    // Check if user owns the story
    const hasAccess = await checkResourceAccess(
      supabase,
      'stories',
      storyId,
      req.user.id,
      req.requestId
    );

    if (!hasAccess) {
      throw new ForbiddenError('You can only view your own story viewers');
    }

    const pagination = buildPagination(page, limit);

    // Get total count
    const { count, error: countError } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('story_views')
          .select('*', { count: 'exact', head: true })
          .eq('story_id', storyId),
      'Count story viewers',
      req.requestId
    );

    if (countError) throw countError;

    // Get viewers with user info
    const { data: viewers, error } = await executeQuery(
      supabase,
      () =>
        supabase
          .from('story_views')
          .select(
            `
          viewed_at,
          user:user_profiles(id, first_name, last_name, avatar_url)
        `
          )
          .eq('story_id', storyId)
          .order('viewed_at', { ascending: false })
          .range(pagination.range[0], pagination.range[1]),
      'Get story viewers',
      req.requestId
    );

    if (error) throw error;

    const response = buildPaginatedResponse(viewers, pagination, count);

    logger.debug('Story viewers retrieved', {
      requestId: req.requestId,
      storyId,
      userId: req.user.id,
      count: viewers.length,
    });

    res.json({
      ...response,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
        story_id: storyId,
      },
    });
  } catch (error) {
    logger.error('Error getting story viewers', {
      requestId: req.requestId,
      storyId: req.params.storyId,
      userId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

/**
 * Delete a story
 * DELETE /api/v1/stories/:storyId
 */
router.delete('/:storyId', async (req, res) => {
  const { storyId } = req.params;
  const supabase = req.app.locals.supabase;

  try {
    // Check if user owns the story
    const hasAccess = await checkResourceAccess(
      supabase,
      'stories',
      storyId,
      req.user.id,
      req.requestId
    );

    if (!hasAccess) {
      throw new ForbiddenError('You can only delete your own stories');
    }

    // Delete the story (hard delete since stories are temporary)
    const { error } = await executeQuery(
      supabase,
      () => supabase.from('stories').delete().eq('id', storyId).eq('user_id', req.user.id),
      'Delete story',
      req.requestId
    );

    if (error) throw error;

    // Clear relevant caches
    clearCache(`*:*stories*`);

    logger.info('Story deleted', {
      requestId: req.requestId,
      storyId,
      userId: req.user.id,
    });

    res.json({
      success: true,
      data: {
        message: 'Story deleted successfully',
        story_id: storyId,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Error deleting story', {
      requestId: req.requestId,
      storyId: req.params.storyId,
      userId: req.user.id,
      error: error.message,
    });
    throw error;
  }
});

export default router;
