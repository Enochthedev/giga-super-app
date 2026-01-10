/**
 * Shares Routes
 */

import { Router } from 'express';
import { AuthenticatedRequest } from '../types';
import { ShareService } from '../services/shareService';
import { authMiddleware } from '../middleware/auth';
import { validateSharePost } from '../middleware/validation';
import { writeLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/errors';
import { sendSuccess, sendCreated } from '../utils/response';

const router = Router();

router.post(
  '/',
  authMiddleware,
  writeLimiter,
  validateSharePost,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const shareService = new ShareService(supabase);
    const result = await shareService.sharePost(req.user!.id, req.body, req.requestId!);
    sendCreated(res, result, req.requestId!);
  })
);

router.get(
  '/post/:postId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const shareService = new ShareService(supabase);
    const sharers = await shareService.getPostSharers(req.params.postId, req.requestId!);
    sendSuccess(res, sharers, req.requestId!);
  })
);

export default router;
