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
import { createStorySchema } from '../validation/schemas';

const router = Router();

const getSupabase = (req: Request): SupabaseClient => req.app.locals.supabase;

/**
 * @swagger
 * /stories:
 *   get:
 *     summary: Get stories feed
 *     description: Retrieve stories from followed users and own stories. Stories expire after 24 hours.
 *     tags: [Stories]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Stories retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       user:
 *                         $ref: '#/components/schemas/UserProfile'
 *                       stories:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/Story'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      sendAuthError(res, 'Authentication required', req.requestId);
      return;
    }

    const supabase = getSupabase(req);
    const now = new Date().toISOString();

    // Get connections
    const { data: connections } = await supabase
      .from('user_connections')
      .select('connected_user_id')
      .eq('user_id', req.user.id)
      .eq('status', 'accepted');

    const userIds = [req.user.id, ...(connections?.map(c => c.connected_user_id) ?? [])];

    // Get active stories (not expired)
    const { data: stories, error } = await supabase
      .from('stories')
      .select(
        `
        id,
        user_id,
        media_url,
        media_type,
        caption,
        view_count,
        expires_at,
        created_at,
        user_profiles!inner(id, first_name, last_name, avatar_url)
      `
      )
      .in('user_id', userIds)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Group stories by user
    const groupedStories = (stories ?? []).reduce(
      (acc: Record<string, any>, story: any) => {
        const userId = story.user_id;
        if (!acc[userId]) {
          acc[userId] = {
            user: {
              id: story.user_profiles.id,
              first_name: story.user_profiles.first_name,
              last_name: story.user_profiles.last_name,
              avatar_url: story.user_profiles.avatar_url,
            },
            stories: [],
          };
        }
        acc[userId].stories.push({
          id: story.id,
          media_url: story.media_url,
          media_type: story.media_type,
          caption: story.caption,
          view_count: story.view_count,
          expires_at: story.expires_at,
          created_at: story.created_at,
        });
        return acc;
      },
      {} as Record<string, any>
    );

    sendSuccess(res, {
      data: Object.values(groupedStories),
      requestId: req.requestId,
    });
  } catch (error) {
    logger.error('Error fetching stories', { error });
    sendInternalError(res, 'Failed to fetch stories', req.requestId);
  }
});

/**
 * @swagger
 * /stories:
 *   post:
 *     summary: Create a story
 *     description: Create a new story that expires after 24 hours
 *     tags: [Stories]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - media_url
 *               - media_type
 *             properties:
 *               media_url:
 *                 type: string
 *                 format: uri
 *               media_type:
 *                 type: string
 *                 enum: [image, video]
 *               caption:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Story created successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      sendAuthError(res, 'Authentication required', req.requestId);
      return;
    }

    const input = createStorySchema.parse(req.body);
    const supabase = getSupabase(req);

    // Calculate expiration (24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: story, error } = await supabase
      .from('stories')
      .insert({
        user_id: req.user.id,
        media_url: input.media_url,
        media_type: input.media_type,
        caption: input.caption,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Story created', { storyId: story.id, userId: req.user.id });
    sendCreated(res, { data: story, requestId: req.requestId });
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(res, 'Invalid story data', error.issues, req.requestId);
      return;
    }
    logger.error('Error creating story', { error });
    sendInternalError(res, 'Failed to create story', req.requestId);
  }
});

/**
 * @swagger
 * /stories/{storyId}:
 *   get:
 *     summary: Get a single story
 *     description: Retrieve a specific story and mark it as viewed
 *     tags: [Stories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Story retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/:storyId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      sendAuthError(res, 'Authentication required', req.requestId);
      return;
    }

    const { storyId } = req.params;
    const supabase = getSupabase(req);
    const now = new Date().toISOString();

    const { data: story, error } = await supabase
      .from('stories')
      .select('*')
      .eq('id', storyId)
      .gt('expires_at', now)
      .single();

    if (error || !story) {
      sendNotFound(res, ErrorCodes.STORY_NOT_FOUND, 'Story not found or expired', req.requestId);
      return;
    }

    // Record view if not own story
    if (story.user_id !== req.user.id) {
      // Check if already viewed
      const { data: existingView } = await supabase
        .from('story_views')
        .select('id')
        .eq('story_id', storyId)
        .eq('viewer_id', req.user.id)
        .single();

      if (!existingView) {
        await supabase.from('story_views').insert({
          story_id: storyId,
          viewer_id: req.user.id,
        });

        // Increment view count
        await supabase
          .from('stories')
          .update({ view_count: (story.view_count || 0) + 1 })
          .eq('id', storyId);
      }
    }

    sendSuccess(res, { data: story, requestId: req.requestId });
  } catch (error) {
    logger.error('Error fetching story', { error, storyId: req.params.storyId });
    sendInternalError(res, 'Failed to fetch story', req.requestId);
  }
});

/**
 * @swagger
 * /stories/{storyId}:
 *   delete:
 *     summary: Delete a story
 *     description: Delete a story. Only the story owner can delete.
 *     tags: [Stories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Story deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.delete('/:storyId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      sendAuthError(res, 'Authentication required', req.requestId);
      return;
    }

    const { storyId } = req.params;
    const supabase = getSupabase(req);

    const { data: story, error: fetchError } = await supabase
      .from('stories')
      .select('user_id')
      .eq('id', storyId)
      .single();

    if (fetchError || !story) {
      sendNotFound(res, ErrorCodes.STORY_NOT_FOUND, 'Story not found', req.requestId);
      return;
    }

    if (story.user_id !== req.user.id && req.user.role !== 'admin') {
      sendForbidden(res, 'You can only delete your own stories', req.requestId);
      return;
    }

    const { error } = await supabase.from('stories').delete().eq('id', storyId);

    if (error) throw error;

    logger.info('Story deleted', { storyId, userId: req.user.id });
    sendSuccess(res, { data: { deleted: true }, requestId: req.requestId });
  } catch (error) {
    logger.error('Error deleting story', { error, storyId: req.params.storyId });
    sendInternalError(res, 'Failed to delete story', req.requestId);
  }
});

/**
 * @swagger
 * /stories/{storyId}/viewers:
 *   get:
 *     summary: Get story viewers
 *     description: Get list of users who viewed a story. Only the story owner can see this.
 *     tags: [Stories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Viewers retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/:storyId/viewers', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      sendAuthError(res, 'Authentication required', req.requestId);
      return;
    }

    const { storyId } = req.params;
    const supabase = getSupabase(req);

    // Verify ownership
    const { data: story } = await supabase
      .from('stories')
      .select('user_id')
      .eq('id', storyId)
      .single();

    if (!story) {
      sendNotFound(res, ErrorCodes.STORY_NOT_FOUND, 'Story not found', req.requestId);
      return;
    }

    if (story.user_id !== req.user.id) {
      sendForbidden(res, 'You can only view viewers of your own stories', req.requestId);
      return;
    }

    const { data: views, error } = await supabase
      .from('story_views')
      .select(
        `
        viewed_at,
        user_profiles!inner(id, first_name, last_name, avatar_url)
      `
      )
      .eq('story_id', storyId)
      .order('viewed_at', { ascending: false });

    if (error) throw error;

    const viewers = views?.map((v: any) => ({
      id: v.user_profiles.id,
      first_name: v.user_profiles.first_name,
      last_name: v.user_profiles.last_name,
      avatar_url: v.user_profiles.avatar_url,
      viewed_at: v.viewed_at,
    }));

    sendSuccess(res, { data: viewers ?? [], requestId: req.requestId });
  } catch (error) {
    logger.error('Error fetching story viewers', { error, storyId: req.params.storyId });
    sendInternalError(res, 'Failed to fetch story viewers', req.requestId);
  }
});

export default router;
