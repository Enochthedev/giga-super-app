import { Router } from 'express';
import { body } from 'express-validator';

import { requireAuth } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import { AuthenticatedRequest, ERROR_CODES } from '../types';
import logger from '../utils/logger';
import { schedulerService } from '../utils/scheduler';

const router = Router();

/**
 * @swagger
 * /scheduler/stats:
 *   get:
 *     tags: [Scheduler]
 *     summary: Get scheduler statistics
 *     description: Retrieves scheduler service statistics (Admin/Dispatcher only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Scheduler stats retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 active_tasks: 5
 *                 completed_tasks: 150
 *                 failed_tasks: 2
 *                 uptime_seconds: 86400
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/scheduler/stats', requireAuth, async (req: AuthenticatedRequest, res) => {
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
          request_id: req.requestId || 'scheduler-stats-error',
          version: '1.0.0',
        },
      });
    }
    const stats = schedulerService.getStats();
    logger.info('Scheduler stats requested', {
      user_id: req.user!.id,
      active_tasks: stats.active_tasks,
    });
    res.json({
      success: true,
      data: stats,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId || 'scheduler-stats',
        version: '1.0.0',
      },
    });
  } catch (error: any) {
    logger.error('Error fetching scheduler stats', { error: error.message });
    res.status(500).json({
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
    });
  }
});

/**
 * @swagger
 * /scheduler/cleanup:
 *   post:
 *     tags: [Scheduler]
 *     summary: Trigger manual cleanup
 *     description: Triggers manual cleanup tasks (Admin/Dispatcher only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [tracking, websocket, assignments, all]
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/scheduler/cleanup',
  requireAuth,
  [body('type').isIn(['tracking', 'websocket', 'assignments', 'all'])],
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
            request_id: req.requestId || 'scheduler-cleanup-error',
            version: '1.0.0',
          },
        });
      }
      const { type } = req.body;
      logger.info('Manual cleanup triggered', { user_id: req.user!.id, type });
      await schedulerService.triggerManualCleanup(type);
      res.json({
        success: true,
        data: {
          message: `Manual cleanup completed for type: ${type}`,
          type,
          triggered_by: req.user!.id,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'scheduler-cleanup',
          version: '1.0.0',
        },
      });
    } catch (error: any) {
      logger.error('Error during manual cleanup', { error: error.message });
      res.status(500).json({
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
      });
    }
  }
);

export default router;
