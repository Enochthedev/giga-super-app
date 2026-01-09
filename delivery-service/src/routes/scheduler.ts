import { requireAuth } from '@/middleware/auth';
import { handleValidationErrors } from '@/middleware/validation';
import { APIResponse, AuthenticatedRequest, ERROR_CODES } from '@/types';
import logger from '@/utils/logger';
import { schedulerService } from '@/utils/scheduler';
import { Router } from 'express';
import { body } from 'express-validator';

const router = Router();

/**
 * GET /scheduler/stats
 * Get scheduler service statistics
 */
router.get('/scheduler/stats', requireAuth, async (req: AuthenticatedRequest, res) => {
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
          request_id: req.requestId || 'scheduler-stats-error',
          version: '1.0.0',
        },
      };
      return res.status(403).json(response);
    }

    const stats = schedulerService.getStats();

    logger.info('Scheduler stats requested', {
      user_id: userId,
      active_tasks: stats.active_tasks,
    });

    const response: APIResponse = {
      success: true,
      data: stats,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId || 'scheduler-stats',
        version: '1.0.0',
      },
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Error fetching scheduler stats', {
      error: error.message,
      user_id: req.user?.id,
    });

    const response: APIResponse = {
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Failed to fetch scheduler statistics',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId || 'scheduler-stats-error',
        version: '1.0.0',
      },
    };

    res.status(500).json(response);
  }
});

/**
 * POST /scheduler/cleanup
 * Trigger manual cleanup tasks
 */
router.post(
  '/scheduler/cleanup',
  requireAuth,
  [
    body('type')
      .isIn(['tracking', 'websocket', 'assignments', 'all'])
      .withMessage('Type must be one of: tracking, websocket, assignments, all'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { type } = req.body;

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
            request_id: req.requestId || 'scheduler-cleanup-error',
            version: '1.0.0',
          },
        };
        return res.status(403).json(response);
      }

      logger.info('Manual cleanup triggered', {
        user_id: userId,
        type,
      });

      await schedulerService.triggerManualCleanup(type);

      const response: APIResponse = {
        success: true,
        data: {
          message: `Manual cleanup completed for type: ${type}`,
          type,
          triggered_by: userId,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'scheduler-cleanup',
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error: any) {
      logger.error('Error during manual cleanup', {
        error: error.message,
        user_id: req.user?.id,
        type: req.body.type,
      });

      const response: APIResponse = {
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: 'Failed to execute manual cleanup',
          details: error.message,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'scheduler-cleanup-error',
          version: '1.0.0',
        },
      };

      res.status(500).json(response);
    }
  }
);

export default router;
