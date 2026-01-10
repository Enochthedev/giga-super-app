/**
 * Likes Routes
 */

import { Router } from 'express';
import { AuthenticatedRequest } from '../types';
import { LikeService } from '../services/likeService';
import { authMiddleware } from '../middleware/auth';
import { validateLikePost, validateLikeComment, validateGetPostLikers } from '../middleware/validation';
import { writeLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/errors';
import { sendSuccess, sendPaginated } from '../utils/response';
import config from '../config';

const router = Router();

router.post(
  '/posts/:postId',
  authMiddleware,
  writeLimiter,
  validateLikePost,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const likeService = new LikeService(supabase);
    const result = await likeService.togglePostLike(req.params.postId, req.user!.id, req.body, req.requestId!);
    sendSuccess(res, result, req.requestId!);
  })
);

router.post(
  '/comments/:commentId',
  authMiddleware,
  writeLimiter,
  validateLikeComment,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const likeService = new LikeService(supabase);
    const result = await likeService.toggleCommentLike(req.params.commentId, req.user!.id, req.body, req.requestId!);
    sendSuccess(res, result, req.requestId!);
  })
);

router.get(
  '/posts/:postId/users',
  validateGetPostLikers,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const likeService = new LikeService(supabase);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || config.pagination.defaultLimit;
    const { likes, metadata } = await likeService.getPostLikers(req.params.postId, { page, limit }, req.requestId!);
    sendPaginated(res, likes, metadata, req.requestId!);
  })
);

router.get(
  '/posts/:postId/breakdown',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const likeService = new LikeService(supabase);
    const breakdown = await likeService.getPostReactionBreakdown(req.params.postId, req.requestId!);
    sendSuccess(res, breakdown, req.requestId!);
  })
);

export default router;
