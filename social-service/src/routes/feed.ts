import { SupabaseClient } from '@supabase/supabase-js';
import { Request, Response, Router } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import {
  calculatePagination,
  sendInternalError,
  sendSuccess,
  sendValidationError,
} from '../utils/response';
import { paginationSchema } from '../validation/schemas';

const router = Router();

const getSupabase = (req: Request): SupabaseClient => req.app.locals.supabase;

/**
 * @swagger
 * /feed:
 *   get:
 *     summary: Get personalized feed
 *     description: |
 *       Retrieve a personalized feed of posts. For authenticated users, includes posts from
 *       connections and public posts. For unauthenticated users, shows only public posts.
 *     tags: [Feed]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Feed retrieved successfully
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
 *                     $ref: '#/components/schemas/Post'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const offset = (page - 1) * limit;
    const supabase = getSupabase(req);

    let query = supabase
      .from('social_posts_with_profiles')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (req.user) {
      // For authenticated users, show public posts and posts from connections
      // For now, just show public posts (connection-based filtering can be added later)
      query = query.or(`visibility.eq.public,user_id.eq.${req.user.id}`);
    } else {
      query = query.eq('visibility', 'public');
    }

    const { data: posts, count, error } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    const pagination = calculatePagination(page, limit, count ?? 0);

    sendSuccess(res, {
      data: posts ?? [],
      pagination,
      requestId: req.requestId,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(res, 'Invalid query parameters', error.issues, req.requestId);
      return;
    }
    logger.error('Error fetching feed', { error });
    sendInternalError(res, 'Failed to fetch feed', req.requestId);
  }
});

/**
 * @swagger
 * /feed/trending:
 *   get:
 *     summary: Get trending posts
 *     description: Retrieve trending posts based on engagement (likes, comments, shares)
 *     tags: [Feed]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: week
 *         description: Time period for trending calculation
 *     responses:
 *       200:
 *         description: Trending posts retrieved successfully
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const timeframe = (req.query.timeframe as string) || 'week';
    const offset = (page - 1) * limit;
    const supabase = getSupabase(req);

    // Calculate date threshold based on timeframe
    const now = new Date();
    let dateThreshold: Date;
    switch (timeframe) {
      case 'day':
        dateThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // week
        dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const {
      data: posts,
      count,
      error,
    } = await supabase
      .from('social_posts_with_profiles')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .eq('visibility', 'public')
      .gte('created_at', dateThreshold.toISOString())
      .order('like_count', { ascending: false })
      .order('comment_count', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const pagination = calculatePagination(page, limit, count ?? 0);

    sendSuccess(res, {
      data: posts ?? [],
      pagination,
      requestId: req.requestId,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(res, 'Invalid query parameters', error.issues, req.requestId);
      return;
    }
    logger.error('Error fetching trending posts', { error });
    sendInternalError(res, 'Failed to fetch trending posts', req.requestId);
  }
});

/**
 * @swagger
 * /feed/following:
 *   get:
 *     summary: Get posts from followed users
 *     description: Retrieve posts only from users the authenticated user follows
 *     tags: [Feed]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Following feed retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/following', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' },
      });
      return;
    }

    const { page, limit } = paginationSchema.parse(req.query);
    const offset = (page - 1) * limit;
    const supabase = getSupabase(req);

    // Get list of users the current user follows
    const { data: connections } = await supabase
      .from('user_connections')
      .select('connected_user_id')
      .eq('user_id', req.user.id)
      .eq('status', 'accepted');

    const followingIds = connections?.map(c => c.connected_user_id) ?? [];

    if (followingIds.length === 0) {
      sendSuccess(res, {
        data: [],
        pagination: calculatePagination(page, limit, 0),
        requestId: req.requestId,
      });
      return;
    }

    const {
      data: posts,
      count,
      error,
    } = await supabase
      .from('social_posts_with_profiles')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .in('user_id', followingIds)
      .in('visibility', ['public', 'friends'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const pagination = calculatePagination(page, limit, count ?? 0);

    sendSuccess(res, {
      data: posts ?? [],
      pagination,
      requestId: req.requestId,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(res, 'Invalid query parameters', error.issues, req.requestId);
      return;
    }
    logger.error('Error fetching following feed', { error });
    sendInternalError(res, 'Failed to fetch following feed', req.requestId);
  }
});

export default router;
