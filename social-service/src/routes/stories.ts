/**
 * Stories Routes
 * Endpoints for managing stories (24-hour expiring content)
 */

import { Router } from 'express';
import { AuthenticatedRequest } from '../types';
import { StoryService } from '../services/storyService';
import { authMiddleware } from '../middleware/auth';
import {
  validateCreateStory,
  validateGetStory,
  validateRecordStoryView,
  validatePagination,
} from '../middleware/validation';
import { writeLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/errors';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import config from '../config';

const router = Router();

/**
 * @route POST /api/v1/stories
 * @desc Create a new story
 * @access Private
 */
router.post(
  '/',
  authMiddleware,
  writeLimiter,
  validateCreateStory,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const storyService = new StoryService(supabase);

    const story = await storyService.createStory(
      req.user!.id,
      req.body,
      req.requestId!
    );

    sendCreated(res, story, req.requestId!);
  })
);

/**
 * @route GET /api/v1/stories
 * @desc Get stories from user's network
 * @access Private
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const storyService = new StoryService(supabase);

    const stories = await storyService.getNetworkStories(
      req.user!.id,
      req.requestId!
    );

    sendSuccess(res, stories, req.requestId!);
  })
);

/**
 * @route GET /api/v1/stories/my
 * @desc Get user's own stories
 * @access Private
 */
router.get(
  '/my',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const storyService = new StoryService(supabase);

    const stories = await storyService.getUserStories(
      req.user!.id,
      req.requestId!
    );

    sendSuccess(res, stories, req.requestId!);
  })
);

/**
 * @route GET /api/v1/stories/:storyId
 * @desc Get a specific story
 * @access Private
 */
router.get(
  '/:storyId',
  authMiddleware,
  validateGetStory,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const storyService = new StoryService(supabase);

    const story = await storyService.getStoryById(
      req.params.storyId,
      req.user!.id,
      req.requestId!
    );

    sendSuccess(res, story, req.requestId!);
  })
);

/**
 * @route POST /api/v1/stories/:storyId/view
 * @desc Record a story view
 * @access Private
 */
router.post(
  '/:storyId/view',
  authMiddleware,
  validateRecordStoryView,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const storyService = new StoryService(supabase);

    const view = await storyService.recordStoryView(
      req.params.storyId,
      req.user!.id,
      req.requestId!
    );

    sendSuccess(res, view, req.requestId!);
  })
);

/**
 * @route GET /api/v1/stories/:storyId/viewers
 * @desc Get viewers of a story
 * @access Private (owner only)
 */
router.get(
  '/:storyId/viewers',
  authMiddleware,
  validateGetStory,
  validatePagination,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const storyService = new StoryService(supabase);

    const page = parseInt(req.query.page as string) || 1;
    const limit =
      parseInt(req.query.limit as string) || config.pagination.defaultLimit;

    const { viewers, metadata } = await storyService.getStoryViewers(
      req.params.storyId,
      req.user!.id,
      { page, limit },
      req.requestId!
    );

    sendPaginated(res, viewers, metadata, req.requestId!);
  })
);

/**
 * @route DELETE /api/v1/stories/:storyId
 * @desc Delete a story
 * @access Private (owner only)
 */
router.delete(
  '/:storyId',
  authMiddleware,
  writeLimiter,
  validateGetStory,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const storyService = new StoryService(supabase);

    await storyService.deleteStory(
      req.params.storyId,
      req.user!.id,
      req.requestId!
    );

    sendSuccess(res, { message: 'Story deleted successfully' }, req.requestId!);
  })
);

export default router;
