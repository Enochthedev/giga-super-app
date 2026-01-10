/**
 * Connections Routes
 * Endpoints for managing user connections (following, followers, blocking)
 */

import { Router } from 'express';
import { AuthenticatedRequest } from '../types';
import { ConnectionService } from '../services/connectionService';
import { authMiddleware } from '../middleware/auth';
import {
  validateFollowUser,
  validateUnfollowUser,
  validateBlockUser,
  validateUnblockUser,
  validateGetFollowers,
  validatePagination,
} from '../middleware/validation';
import { writeLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/errors';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import config from '../config';

const router = Router();

// ============================================================================
// Following Endpoints
// ============================================================================

/**
 * @route POST /api/v1/connections/follow
 * @desc Follow a user
 * @access Private
 */
router.post(
  '/follow',
  authMiddleware,
  writeLimiter,
  validateFollowUser,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const connectionService = new ConnectionService(supabase);

    const connection = await connectionService.followUser(
      req.user!.id,
      req.body,
      req.requestId!
    );

    sendCreated(res, connection, req.requestId!);
  })
);

/**
 * @route DELETE /api/v1/connections/unfollow/:userId
 * @desc Unfollow a user
 * @access Private
 */
router.delete(
  '/unfollow/:userId',
  authMiddleware,
  writeLimiter,
  validateUnfollowUser,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const connectionService = new ConnectionService(supabase);

    await connectionService.unfollowUser(
      req.user!.id,
      req.params.userId,
      req.requestId!
    );

    sendSuccess(res, { message: 'User unfollowed successfully' }, req.requestId!);
  })
);

/**
 * @route GET /api/v1/connections/followers/:userId
 * @desc Get user's followers
 * @access Public
 */
router.get(
  '/followers/:userId',
  validateGetFollowers,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const connectionService = new ConnectionService(supabase);

    const page = parseInt(req.query.page as string) || 1;
    const limit =
      parseInt(req.query.limit as string) || config.pagination.defaultLimit;

    const { connections, metadata } = await connectionService.getFollowers(
      req.params.userId,
      { page, limit },
      req.requestId!
    );

    sendPaginated(res, connections, metadata, req.requestId!);
  })
);

/**
 * @route GET /api/v1/connections/following/:userId
 * @desc Get users that the user is following
 * @access Public
 */
router.get(
  '/following/:userId',
  validateGetFollowers,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const connectionService = new ConnectionService(supabase);

    const page = parseInt(req.query.page as string) || 1;
    const limit =
      parseInt(req.query.limit as string) || config.pagination.defaultLimit;

    const { connections, metadata } = await connectionService.getFollowing(
      req.params.userId,
      { page, limit },
      req.requestId!
    );

    sendPaginated(res, connections, metadata, req.requestId!);
  })
);

/**
 * @route GET /api/v1/connections/is-following/:userId
 * @desc Check if current user is following another user
 * @access Private
 */
router.get(
  '/is-following/:userId',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const connectionService = new ConnectionService(supabase);

    const isFollowing = await connectionService.isFollowing(
      req.user!.id,
      req.params.userId,
      req.requestId!
    );

    sendSuccess(res, { is_following: isFollowing }, req.requestId!);
  })
);

// ============================================================================
// Blocking Endpoints
// ============================================================================

/**
 * @route POST /api/v1/connections/block
 * @desc Block a user
 * @access Private
 */
router.post(
  '/block',
  authMiddleware,
  writeLimiter,
  validateBlockUser,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const connectionService = new ConnectionService(supabase);

    const block = await connectionService.blockUser(
      req.user!.id,
      req.body,
      req.requestId!
    );

    sendCreated(res, block, req.requestId!);
  })
);

/**
 * @route DELETE /api/v1/connections/unblock/:userId
 * @desc Unblock a user
 * @access Private
 */
router.delete(
  '/unblock/:userId',
  authMiddleware,
  writeLimiter,
  validateUnblockUser,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const connectionService = new ConnectionService(supabase);

    await connectionService.unblockUser(
      req.user!.id,
      req.params.userId,
      req.requestId!
    );

    sendSuccess(res, { message: 'User unblocked successfully' }, req.requestId!);
  })
);

/**
 * @route GET /api/v1/connections/blocked
 * @desc Get blocked users
 * @access Private
 */
router.get(
  '/blocked',
  authMiddleware,
  validatePagination,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const connectionService = new ConnectionService(supabase);

    const page = parseInt(req.query.page as string) || 1;
    const limit =
      parseInt(req.query.limit as string) || config.pagination.defaultLimit;

    const { blocks, metadata } = await connectionService.getBlockedUsers(
      req.user!.id,
      { page, limit },
      req.requestId!
    );

    sendPaginated(res, blocks, metadata, req.requestId!);
  })
);

/**
 * @route GET /api/v1/connections/is-blocked/:userId
 * @desc Check if a user is blocked
 * @access Private
 */
router.get(
  '/is-blocked/:userId',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const connectionService = new ConnectionService(supabase);

    const isBlocked = await connectionService.isBlocked(
      req.user!.id,
      req.params.userId,
      req.requestId!
    );

    sendSuccess(res, { is_blocked: isBlocked }, req.requestId!);
  })
);

export default router;
