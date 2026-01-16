import { Router } from 'express';
import { body } from 'express-validator';

import { requireAuth } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import { webSocketService } from '../services/websocket';
import { APIResponse, AuthenticatedRequest, ERROR_CODES } from '../types';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /websocket/stats
 * Get WebSocket server statistics
 */
router.get('/websocket/stats', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    // Check if user has admin permissions
    const userRole = req.user!.role;
    if (!['admin', 'dispatcher'].includes(userRole.toLowerCase())) {
      const response: APIResponse = {
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
      };
      return res.status(403).json(response);
    }

    const stats = webSocketService.getTrackingStats();

    logger.info('WebSocket stats requested', {
      user_id: userId,
      active_rooms: stats.active_rooms,
      total_participants: stats.total_participants,
    });

    const response: APIResponse = {
      success: true,
      data: stats,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId || 'websocket-stats',
        version: '1.0.0',
      },
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Error fetching WebSocket stats', {
      error: error.message,
      user_id: req.user?.id,
    });

    const response: APIResponse = {
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
    };

    res.status(500).json(response);
  }
});

/**
 * POST /websocket/cleanup
 * Cleanup inactive WebSocket tracking rooms
 */
router.post(
  '/websocket/cleanup',
  requireAuth,
  [
    body('max_inactive_minutes')
      .optional()
      .isInt({ min: 1, max: 1440 })
      .withMessage('Max inactive minutes must be between 1 and 1440 (24 hours)'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const maxInactiveMinutes = req.body.max_inactive_minutes || 30;

      // Check if user has admin permissions
      const userRole = req.user!.role;
      if (!['admin', 'dispatcher'].includes(userRole.toLowerCase())) {
        const response: APIResponse = {
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
        };
        return res.status(403).json(response);
      }

      await webSocketService.cleanupInactiveRooms(maxInactiveMinutes);

      logger.info('WebSocket cleanup completed', {
        user_id: userId,
        max_inactive_minutes: maxInactiveMinutes,
      });

      const response: APIResponse = {
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
      };

      res.json(response);
    } catch (error: any) {
      logger.error('Error cleaning up WebSocket rooms', {
        error: error.message,
        user_id: req.user?.id,
      });

      const response: APIResponse = {
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
      };

      res.status(500).json(response);
    }
  }
);

/**
 * POST /websocket/broadcast
 * Broadcast a message to a specific tracking room (admin only)
 */
router.post(
  '/websocket/broadcast',
  requireAuth,
  [
    body('assignment_id').isUUID().withMessage('Assignment ID must be a valid UUID'),
    body('message_type')
      .isIn(['announcement', 'alert', 'update'])
      .withMessage('Message type must be announcement, alert, or update'),
    body('message')
      .isString()
      .isLength({ min: 1, max: 500 })
      .withMessage('Message is required and must be under 500 characters'),
    body('data').optional().isObject().withMessage('Data must be an object'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { assignment_id, message_type, message, data } = req.body;

      // Check if user has admin permissions
      const userRole = req.user!.role;
      if (!['admin', 'dispatcher'].includes(userRole.toLowerCase())) {
        const response: APIResponse = {
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
        };
        return res.status(403).json(response);
      }

      const io = webSocketService.getIO();
      if (!io) {
        const response: APIResponse = {
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
        };
        return res.status(500).json(response);
      }

      // Broadcast to the tracking room
      const roomName = `tracking:${assignment_id}`;
      io.to(roomName).emit('admin_message', {
        type: message_type,
        message,
        data,
        from_admin: true,
        admin_id: userId,
        timestamp: new Date().toISOString(),
      });

      logger.info('Admin message broadcasted', {
        admin_id: userId,
        assignment_id,
        message_type,
        room: roomName,
      });

      const response: APIResponse = {
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
      };

      res.json(response);
    } catch (error: any) {
      logger.error('Error broadcasting admin message', {
        error: error.message,
        user_id: req.user?.id,
      });

      const response: APIResponse = {
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: 'Failed to broadcast message',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'websocket-broadcast-error',
          version: '1.0.0',
        },
      };

      res.status(500).json(response);
    }
  }
);

export default router;
