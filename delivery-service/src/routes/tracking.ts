import { Router } from 'express';
import { body, param, query } from 'express-validator';

import { requireAuth } from '@/middleware/auth';
import { handleValidationErrors } from '@/middleware/validation';
import { trackingService } from '@/services/tracking';
import { APIResponse, AuthenticatedRequest, ERROR_CODES, TrackDeliveryRequest } from '@/types';
import logger from '@/utils/logger';

const router = Router();

/**
 * POST /track-delivery
 * Update delivery location and status with real-time tracking
 */
router.post(
  '/track-delivery',
  requireAuth,
  [
    body('assignment_id').isUUID().withMessage('Assignment ID must be a valid UUID'),
    body('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    body('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    body('accuracy_meters')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Accuracy must be a positive number'),
    body('speed_kmh').optional().isFloat({ min: 0 }).withMessage('Speed must be a positive number'),
    body('heading_degrees')
      .optional()
      .isFloat({ min: 0, max: 360 })
      .withMessage('Heading must be between 0 and 360 degrees'),
    body('battery_level')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Battery level must be between 0 and 100'),
    body('status')
      .optional()
      .isIn([
        'pending',
        'assigned',
        'picked_up',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'failed',
        'cancelled',
        'returned',
      ])
      .withMessage('Invalid delivery status'),
    body('notes')
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage('Notes must be a string with max 1000 characters'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const trackingData: TrackDeliveryRequest = req.body;
      const userId = req.user!.id;

      logger.info('Processing tracking update', {
        assignment_id: trackingData.assignment_id,
        user_id: userId,
        latitude: trackingData.latitude,
        longitude: trackingData.longitude,
      });

      const result = await trackingService.updateDeliveryTracking(trackingData, userId);

      const response: APIResponse = {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'track-delivery',
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error: any) {
      logger.error('Error updating delivery tracking', {
        error: error.message,
        assignment_id: req.body.assignment_id,
        user_id: req.user?.id,
      });

      const response: APIResponse = {
        success: false,
        error: {
          code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to update tracking',
          details: error.details,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'track-delivery-error',
          version: '1.0.0',
        },
      };

      res.status(error.statusCode || 500).json(response);
    }
  }
);

/**
 * GET /tracking/:assignmentId
 * Get real-time tracking data for a delivery assignment
 */
router.get(
  '/tracking/:assignmentId',
  requireAuth,
  [
    param('assignmentId').isUUID().withMessage('Assignment ID must be a valid UUID'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('since').optional().isISO8601().withMessage('Since must be a valid ISO 8601 date'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { assignmentId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const since = req.query.since as string;
      const userId = req.user!.id;

      logger.info('Fetching tracking data', {
        assignment_id: assignmentId,
        user_id: userId,
        limit,
        since,
      });

      const trackingData = await trackingService.getTrackingData(assignmentId, userId, {
        limit,
        since,
      });

      const response: APIResponse = {
        success: true,
        data: trackingData,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-tracking',
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error: any) {
      logger.error('Error fetching tracking data', {
        error: error.message,
        assignment_id: req.params.assignmentId,
        user_id: req.user?.id,
      });

      const response: APIResponse = {
        success: false,
        error: {
          code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to fetch tracking data',
          details: error.details,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-tracking-error',
          version: '1.0.0',
        },
      };

      res.status(error.statusCode || 500).json(response);
    }
  }
);

/**
 * GET /tracking/:assignmentId/progress
 * Get delivery progress and ETA information
 */
router.get(
  '/tracking/:assignmentId/progress',
  requireAuth,
  [param('assignmentId').isUUID().withMessage('Assignment ID must be a valid UUID')],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { assignmentId } = req.params;
      const userId = req.user!.id;

      logger.info('Fetching delivery progress', {
        assignment_id: assignmentId,
        user_id: userId,
      });

      const progress = await trackingService.getDeliveryProgress(assignmentId, userId);

      const response: APIResponse = {
        success: true,
        data: progress,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-progress',
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error: any) {
      logger.error('Error fetching delivery progress', {
        error: error.message,
        assignment_id: req.params.assignmentId,
        user_id: req.user?.id,
      });

      const response: APIResponse = {
        success: false,
        error: {
          code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to fetch delivery progress',
          details: error.details,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-progress-error',
          version: '1.0.0',
        },
      };

      res.status(error.statusCode || 500).json(response);
    }
  }
);

/**
 * POST /tracking/:assignmentId/cleanup
 * Cleanup old tracking data for a delivery assignment
 */
router.post(
  '/tracking/:assignmentId/cleanup',
  requireAuth,
  [
    param('assignmentId').isUUID().withMessage('Assignment ID must be a valid UUID'),
    body('retention_hours')
      .optional()
      .isInt({ min: 1, max: 8760 })
      .withMessage('Retention hours must be between 1 and 8760 (1 year)'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { assignmentId } = req.params;
      const retentionHours = req.body.retention_hours || 72; // Default 3 days
      const userId = req.user!.id;

      logger.info('Cleaning up tracking data', {
        assignment_id: assignmentId,
        user_id: userId,
        retention_hours: retentionHours,
      });

      const result = await trackingService.cleanupTrackingData(
        assignmentId,
        userId,
        retentionHours
      );

      const response: APIResponse = {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'cleanup-tracking',
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error: any) {
      logger.error('Error cleaning up tracking data', {
        error: error.message,
        assignment_id: req.params.assignmentId,
        user_id: req.user?.id,
      });

      const response: APIResponse = {
        success: false,
        error: {
          code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to cleanup tracking data',
          details: error.details,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'cleanup-tracking-error',
          version: '1.0.0',
        },
      };

      res.status(error.statusCode || 500).json(response);
    }
  }
);

export default router;
