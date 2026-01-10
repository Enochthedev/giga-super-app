/**
 * Posts Routes
 * Endpoints for managing social posts
 */

import { Router } from 'express';
import { AuthenticatedRequest } from '../types';
import { PostService } from '../services/postService';
import { authMiddleware } from '../middleware/auth';
import {
  validateCreatePost,
  validateUpdatePost,
  validateGetPost,
  validateDeletePost,
  validateGetUserPosts,
} from '../middleware/validation';
import { writeLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/errors';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import config from '../config';

const router = Router();

/**
 * @route POST /api/v1/posts
 * @desc Create a new post
 * @access Private
 */
router.post(
  '/',
  authMiddleware,
  writeLimiter,
  validateCreatePost,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const postService = new PostService(supabase);

    const post = await postService.createPost(
      req.user!.id,
      req.body,
      req.requestId!
    );

    sendCreated(res, post, req.requestId!);
  })
);

/**
 * @route GET /api/v1/posts/:postId
 * @desc Get a post by ID
 * @access Public (with optional auth)
 */
router.get(
  '/:postId',
  validateGetPost,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const postService = new PostService(supabase);

    const post = await postService.getPostById(
      req.params.postId,
      req.user?.id || null,
      req.requestId!
    );

    // Increment view count asynchronously
    postService.incrementViewCount(req.params.postId, req.requestId!).catch(()  => {});

    sendSuccess(res, post, req.requestId!);
  })
);

/**
 * @route GET /api/v1/posts/user/:userId
 * @desc Get posts by user ID
 * @access Public (with optional auth)
 */
router.get(
  '/user/:userId',
  validateGetUserPosts,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const postService = new PostService(supabase);

    const page = parseInt(req.query.page as string) || 1;
    const limit =
      parseInt(req.query.limit as string) || config.pagination.defaultLimit;

    const { posts, metadata } = await postService.getUserPosts(
      req.params.userId,
      req.user?.id || null,
      { page, limit },
      req.requestId!
    );

    sendPaginated(res, posts, metadata, req.requestId!);
  })
);

/**
 * @route PUT /api/v1/posts/:postId
 * @desc Update a post
 * @access Private
 */
router.put(
  '/:postId',
  authMiddleware,
  writeLimiter,
  validateUpdatePost,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const postService = new PostService(supabase);

    const post = await postService.updatePost(
      req.params.postId,
      req.user!.id,
      req.body,
      req.requestId!
    );

    sendSuccess(res, post, req.requestId!);
  })
);

/**
 * @route DELETE /api/v1/posts/:postId
 * @desc Delete a post
 * @access Private
 */
router.delete(
  '/:postId',
  authMiddleware,
  writeLimiter,
  validateDeletePost,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const postService = new PostService(supabase);

    await postService.deletePost(
      req.params.postId,
      req.user!.id,
      req.requestId!
    );

    sendSuccess(res, { message: 'Post deleted successfully' }, req.requestId!);
  })
);

export default router;
