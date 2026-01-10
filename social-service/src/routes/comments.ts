/**
 * Comments Routes
 */

import { Router } from 'express';
import { AuthenticatedRequest } from '../types';
import { CommentService } from '../services/commentService';
import { authMiddleware } from '../middleware/auth';
import {
  validateCreateComment,
  validateUpdateComment,
  validateDeleteComment,
  validateGetPostComments,
  validateGetCommentReplies,
} from '../middleware/validation';
import { writeLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/errors';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import config from '../config';

const router = Router();

router.post(
  '/',
  authMiddleware,
  writeLimiter,
  validateCreateComment,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const commentService = new CommentService(supabase);
    const comment = await commentService.createComment(req.user!.id, req.body, req.requestId!);
    sendCreated(res, comment, req.requestId!);
  })
);

router.get(
  '/post/:postId',
  validateGetPostComments,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const commentService = new CommentService(supabase);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || config.pagination.defaultLimit;
    const { comments, metadata } = await commentService.getPostComments(
      req.params.postId,
      req.user?.id || null,
      { page, limit },
      req.requestId!
    );
    sendPaginated(res, comments, metadata, req.requestId!);
  })
);

router.get(
  '/:commentId/replies',
  validateGetCommentReplies,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const commentService = new CommentService(supabase);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || config.pagination.defaultLimit;
    const { replies, metadata } = await commentService.getCommentReplies(
      req.params.commentId,
      req.user?.id || null,
      { page, limit },
      req.requestId!
    );
    sendPaginated(res, replies, metadata, req.requestId!);
  })
);

router.put(
  '/:commentId',
  authMiddleware,
  writeLimiter,
  validateUpdateComment,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const commentService = new CommentService(supabase);
    const comment = await commentService.updateComment(
      req.params.commentId,
      req.user!.id,
      req.body,
      req.requestId!
    );
    sendSuccess(res, comment, req.requestId!);
  })
);

router.delete(
  '/:commentId',
  authMiddleware,
  writeLimiter,
  validateDeleteComment,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const commentService = new CommentService(supabase);
    await commentService.deleteComment(req.params.commentId, req.user!.id, req.requestId!);
    sendSuccess(res, { message: 'Comment deleted successfully' }, req.requestId!);
  })
);

export default router;
