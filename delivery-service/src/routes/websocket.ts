import { Router } from 'express';
import { body } from 'express-validator';

import { requireAuth } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import { webSocketService } from '../services/websocket';
import { AuthenticatedRequest, ERROR_CODES } from '../types';
import logger from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /websocket/stats:
 *   get:
 *     tags: [WebSocket]
 *     summary: Get WebSocket statistics
 *     description: Retrieves WebSocket server statistics (Admin/Dispatcher only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: WebSocket stats retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 active_rooms: 25
 *                 total_participants: 50
 *                 messages_per_minute: 120
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/websocket/stats', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userRole = req.user!.role;
    if (!['admin', 'dispatcher'].includes(userRole.toLowerCase())) {
      return res.status(403).json({
        success: false,
        error: {
          code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
          message: 'Admin permissions required',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'websocket-stats-error',
          version: '1.0.0',
        },
      });
    }
    const stats = webSocketService.getTrackingStats();
    logger.info('WebSocket stats requested', {
      user_id: req.user!.id,
      active_rooms: stats.active_rooms,
    });
    res.json({
      success: true,
      data: stats,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId || 'websocket-stats',
        version: '1.0.0',
      },
    });
  } catch (error: any) {
    logger.error('Error fetching WebSocket stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Failed to fetch WebSocket statistics',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId || 'websocket-stats-error',
        version: '1.0.0',
      },
    });
  }
});

/**
 * @swagger
 * /websocket/cleanup:
 *   post:
 *     tags: [WebSocket]
 *     summary: Cleanup inactive rooms
 *     description: Cleans up inactive WebSocket tracking rooms (Admin/Dispatcher only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               max_inactive_minutes:
 *                 type: integer
 *                 default: 30
 *                 minimum: 1
 *                 maximum: 1440
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/websocket/cleanup',
  requireAuth,
  [body('max_inactive_minutes').optional().isInt({ min: 1, max: 1440 })],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userRole = req.user!.role;
      if (!['admin', 'dispatcher'].includes(userRole.toLowerCase())) {
        return res.status(403).json({
          success: false,
          error: {
            code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
            message: 'Admin permissions required',
          },
          metadata: {
            timestamp: new Date().toISOString(),
            request_id: req.requestId || 'websocket-cleanup-error',
            version: '1.0.0',
          },
        });
      }
      const maxInactiveMinutes = req.body.max_inactive_minutes || 30;
      await webSocketService.cleanupInactiveRooms(maxInactiveMinutes);
      logger.info('WebSocket cleanup completed', {
        user_id: req.user!.id,
        max_inactive_minutes: maxInactiveMinutes,
      });
      res.json({
        success: true,
        data: {
          message: 'Cleanup completed successfully',
          max_inactive_minutes: maxInactiveMinutes,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'websocket-cleanup',
          version: '1.0.0',
        },
      });
    } catch (error: any) {
      logger.error('Error cleaning up WebSocket rooms', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: 'Failed to cleanup WebSocket rooms',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'websocket-cleanup-error',
          version: '1.0.0',
        },
      });
    }
  }
);

/**
 * @swagger
 * /websocket/broadcast:
 *   post:
 *     tags: [WebSocket]
 *     summary: Broadcast message to tracking room
 *     description: Broadcasts a message to a specific tracking room (Admin/Dispatcher only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assignment_id, message_type, message]
 *             properties:
 *               assignment_id:
 *                 type: string
 *                 format: uuid
 *               message_type:
 *                 type: string
 *                 enum: [announcement, alert, update]
 *               message:
 *                 type: string
 *                 maxLength: 500
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Message broadcasted successfully
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/websocket/broadcast',
  requireAuth,
  [
    body('assignment_id').isUUID(),
    body('message_type').isIn(['announcement', 'alert', 'update']),
    body('message').isString().isLength({ min: 1, max: 500 }),
    body('data').optional().isObject(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userRole = req.user!.role;
      if (!['admin', 'dispatcher'].includes(userRole.toLowerCase())) {
        return res.status(403).json({
          success: false,
          error: {
            code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
            message: 'Admin permissions required',
          },
          metadata: {
            timestamp: new Date().toISOString(),
            request_id: req.requestId || 'websocket-broadcast-error',
            version: '1.0.0',
          },
        });
      }
      const { assignment_id, message_type, message, data } = req.body;
      const io = webSocketService.getIO();
      if (!io) {
        return res.status(500).json({
          success: false,
          error: {
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: 'WebSocket server not available',
          },
          metadata: {
            timestamp: new Date().toISOString(),
            request_id: req.requestId || 'websocket-broadcast-error',
            version: '1.0.0',
          },
        });
      }
      const roomName = `tracking:${assignment_id}`;
      io.to(roomName).emit('admin_message', {
        type: message_type,
        message,
        data,
        from_admin: true,
        admin_id: req.user!.id,
        timestamp: new Date().toISOString(),
      });
      logger.info('Admin message broadcasted', {
        admin_id: req.user!.id,
        assignment_id,
        message_type,
        room: roomName,
      });
      res.json({
        success: true,
        data: {
          message: 'Message broadcasted successfully',
          assignment_id,
          message_type,
          room: roomName,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'websocket-broadcast',
          version: '1.0.0',
        },
      });
    } catch (error: any) {
      logger.error('Error broadcasting admin message', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: ERROR_CODES.INTERNAL_SERVER_ERROR, message: 'Failed to broadcast message' },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'websocket-broadcast-error',
          version: '1.0.0',
        },
      });
    }
  }
);

export default router;
