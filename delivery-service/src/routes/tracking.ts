import { Router } from 'express';
import { body, param, query } from 'express-validator';

import { requireAuth } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import { trackingService } from '../services/tracking';
import { APIResponse, AuthenticatedRequest, ERROR_CODES, TrackDeliveryRequest } from '../types';
import logger from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /track-delivery:
 *   post:
 *     tags: [Tracking]
 *     summary: Update delivery location
 *     description: Updates courier location with real-time tracking data
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assignment_id, latitude, longitude]
 *             properties:
 *               assignment_id:
 *                 type: string
 *                 format: uuid
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               accuracy_meters:
 *                 type: number
 *               speed_kmh:
 *                 type: number
 *               heading_degrees:
 *                 type: number
 *               battery_level:
 *                 type: integer
 *               status:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Location updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/track-delivery',
  requireAuth,
  [
    body('assignment_id').isUUID(),
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    body('accuracy_meters').optional().isFloat({ min: 0 }),
    body('speed_kmh').optional().isFloat({ min: 0 }),
    body('heading_degrees').optional().isFloat({ min: 0, max: 360 }),
    body('battery_level').optional().isInt({ min: 0, max: 100 }),
    body('status')
      .optional()
      .isIn(['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed']),
    body('notes').optional().isString().isLength({ max: 1000 }),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const trackingData: TrackDeliveryRequest = req.body;
      const result = await trackingService.updateDeliveryTracking(trackingData, req.user!.id);
      const response: APIResponse = {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'track',
          version: '1.0.0',
        },
      };
      res.json(response);
    } catch (error: any) {
      logger.error('Error updating tracking', { error: error.message });
      res.status(error.statusCode || 500).json({
        success: false,
        error: { code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR, message: error.message },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'track-err',
          version: '1.0.0',
        },
      });
    }
  }
);

/**
 * @swagger
 * /tracking/{assignmentId}:
 *   get:
 *     tags: [Tracking]
 *     summary: Get tracking data
 *     description: Retrieves real-time tracking data for a delivery assignment
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Tracking data retrieved
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  '/tracking/:assignmentId',
  requireAuth,
  [
    param('assignmentId').isUUID(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('since').optional().isISO8601(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { assignmentId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const since = req.query.since as string;
      const trackingData = await trackingService.getTrackingData(assignmentId, req.user!.id, {
        limit,
        since,
      });
      res.json({
        success: true,
        data: trackingData,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-tracking',
          version: '1.0.0',
        },
      });
    } catch (error: any) {
      logger.error('Error fetching tracking', { error: error.message });
      res.status(error.statusCode || 500).json({
        success: false,
        error: { code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR, message: error.message },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-tracking-err',
          version: '1.0.0',
        },
      });
    }
  }
);

/**
 * @swagger
 * /tracking/{assignmentId}/progress:
 *   get:
 *     tags: [Tracking]
 *     summary: Get delivery progress
 *     description: Retrieves delivery progress and ETA information
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Delivery progress retrieved
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  '/tracking/:assignmentId/progress',
  requireAuth,
  [param('assignmentId').isUUID()],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { assignmentId } = req.params;
      const progress = await trackingService.getDeliveryProgress(assignmentId, req.user!.id);
      res.json({
        success: true,
        data: progress,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-progress',
          version: '1.0.0',
        },
      });
    } catch (error: any) {
      logger.error('Error fetching progress', { error: error.message });
      res.status(error.statusCode || 500).json({
        success: false,
        error: { code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR, message: error.message },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-progress-err',
          version: '1.0.0',
        },
      });
    }
  }
);

/**
 * @swagger
 * /tracking/{assignmentId}/cleanup:
 *   post:
 *     tags: [Tracking]
 *     summary: Cleanup tracking data
 *     description: Removes old tracking data for a delivery assignment
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               retention_hours:
 *                 type: integer
 *                 default: 72
 *     responses:
 *       200:
 *         description: Tracking data cleaned up
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/tracking/:assignmentId/cleanup',
  requireAuth,
  [param('assignmentId').isUUID(), body('retention_hours').optional().isInt({ min: 1, max: 8760 })],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { assignmentId } = req.params;
      const retentionHours = req.body.retention_hours || 72;
      const result = await trackingService.cleanupTrackingData(
        assignmentId,
        req.user!.id,
        retentionHours
      );
      res.json({
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'cleanup',
          version: '1.0.0',
        },
      });
    } catch (error: any) {
      logger.error('Error cleaning up tracking', { error: error.message });
      res.status(error.statusCode || 500).json({
        success: false,
        error: { code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR, message: error.message },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'cleanup-err',
          version: '1.0.0',
        },
      });
    }
  }
);

export default router;
