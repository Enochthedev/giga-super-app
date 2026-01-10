/**
 * Feed Routes
 * Endpoints for personalized feeds and trending content
 */

import { Router } from 'express';
import { AuthenticatedRequest } from '../types';
import { FeedService } from '../services/feedService';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { validateGetFeed, validateGetTrending, validatePagination } from '../middleware/validation';
import { asyncHandler } from '../utils/errors';
import { sendPaginated } from '../utils/response';
import config from '../config';

const router = Router();

/**
 * @route GET /api/v1/feed
 * @desc Get personalized feed
 * @access Private
 */
router.get(
  '/',
  authMiddleware,
  validateGetFeed,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const feedService = new FeedService(supabase);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || config.pagination.defaultLimit;
    const filter = (req.query.filter as 'all' | 'friends' | 'following') || 'all';

    const { posts, metadata } = await feedService.getPersonalizedFeed(
      req.user!.id,
      { page, limit, filter },
      req.requestId!
    );

    sendPaginated(res, posts, metadata, req.requestId!);
  })
);

/**
 * @route GET /api/v1/feed/trending
 * @desc Get trending posts
 * @access Public (with optional auth)
 */
router.get(
  '/trending',
  optionalAuth,
  validateGetTrending,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const feedService = new FeedService(supabase);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || config.pagination.defaultLimit;
    const timeframe = (req.query.timeframe as '24h' | '7d' | '30d') || '24h';

    const { posts, metadata } = await feedService.getTrendingPosts(
      req.user?.id || null,
      { page, limit, timeframe },
      req.requestId!
    );

    sendPaginated(res, posts, metadata, req.requestId!);
  })
);

/**
 * @route GET /api/v1/feed/recommended
 * @desc Get recommended posts
 * @access Private
 */
router.get(
  '/recommended',
  authMiddleware,
  validatePagination,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const feedService = new FeedService(supabase);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || config.pagination.defaultLimit;

    const { posts, metadata } = await feedService.getRecommendedPosts(
      req.user!.id,
      { page, limit },
      req.requestId!
    );

    sendPaginated(res, posts, metadata, req.requestId!);
  })
);

/**
 * @route GET /api/v1/feed/explore
 * @desc Get explore feed (popular public posts)
 * @access Public (with optional auth)
 */
router.get(
  '/explore',
  optionalAuth,
  validatePagination,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const feedService = new FeedService(supabase);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || config.pagination.defaultLimit;

    const { posts, metadata } = await feedService.getExploreFeed(
      req.user?.id || null,
      { page, limit },
      req.requestId!
    );

    sendPaginated(res, posts, metadata, req.requestId!);
  })
);

export default router;
