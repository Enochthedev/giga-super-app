import { Router } from 'express';
import { body, param, query } from 'express-validator';

import config from '../config';
import { requireAuth, requireRole } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import { CourierService } from '../services/courier';
import { APIResponse, AuthenticatedRequest, CreateCourierRequest, ERROR_CODES } from '../types';
import { db } from '../utils/database';
import logger from '../utils/logger';

const router = Router();
const courierService = new CourierService(db);

/**
 * POST /couriers
 * Create a new courier profile (onboarding)
 */
router.post(
  '/couriers',
  requireAuth,
  [
    body('first_name').isString().notEmpty().withMessage('First name is required'),
    body('last_name').isString().notEmpty().withMessage('Last name is required'),
    body('phone_number').isString().notEmpty().withMessage('Phone number is required'),
    body('email').optional().isEmail().withMessage('Invalid email address'),
    body('vehicle_type')
      .isIn(['bicycle', 'motorcycle', 'car', 'van', 'truck'])
      .withMessage('Invalid vehicle type'),
    body('vehicle_registration').optional().isString().withMessage('Vehicle registration must be a string'),
    body('vehicle_capacity_kg').optional().isFloat({ min: 0 }).withMessage('Vehicle capacity must be positive'),
    body('max_delivery_radius_km').optional().isFloat({ min: 0 }).withMessage('Delivery radius must be positive'),
    body('license_number').optional().isString().withMessage('License number must be a string'),
    body('license_expiry').optional().isISO8601().withMessage('Invalid license expiry date'),
    body('verification_documents').optional().isObject().withMessage('Verification documents must be an object'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const courierData: CreateCourierRequest = {
        ...req.body,
        user_id: req.user!.id,
      };

      logger.info('Creating courier profile', {
        user_id: req.user!.id,
        request_id: req.requestId,
      });

      const courier = await courierService.createCourier(courierData, req.requestId || 'create-courier');

      const response: APIResponse = {
        success: true,
        data: courier,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'create-courier',
          version: '1.0.0',
        },
      };

      res.status(201).json(response);
    } catch (error: any) {
      logger.error('Error creating courier', {
        error: error.message,
        user_id: req.user?.id,
      });

      const response: APIResponse = {
        success: false,
        error: {
          code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to create courier',
          details: error.details,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'create-courier',
          version: '1.0.0',
        },
      };

      res.status(error.statusCode || 500).json(response);
    }
  }
);

/**
 * GET /couriers/:courierId
 * Get courier details by ID
 */
router.get(
  '/couriers/:courierId',
  requireAuth,
  [param('courierId').isUUID().withMessage('Courier ID must be a valid UUID')],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { courierId } = req.params;

      const courier = await courierService.getCourierById(courierId, req.requestId || 'get-courier');

      const response: APIResponse = {
        success: true,
        data: courier,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-courier',
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error: any) {
      logger.error('Error fetching courier', {
        error: error.message,
        courier_id: req.params.courierId,
      });

      const response: APIResponse = {
        success: false,
        error: {
          code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to fetch courier',
          details: error.details,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-courier',
          version: '1.0.0',
        },
      };

      res.status(error.statusCode || 500).json(response);
    }
  }
);

/**
 * GET /couriers/user/:userId
 * Get courier profile by user ID
 */
router.get(
  '/couriers/user/:userId',
  requireAuth,
  [param('userId').isUUID().withMessage('User ID must be a valid UUID')],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;

      const courier = await courierService.getCourierByUserId(userId, req.requestId || 'get-courier-by-user');

      const response: APIResponse = {
        success: true,
        data: courier,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-courier-by-user',
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error: any) {
      logger.error('Error fetching courier by user ID', {
        error: error.message,
        user_id: req.params.userId,
      });

      const response: APIResponse = {
        success: false,
        error: {
          code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to fetch courier',
          details: error.details,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-courier-by-user',
          version: '1.0.0',
        },
      };

      res.status(error.statusCode || 500).json(response);
    }
  }
);

/**
 * GET /couriers
 * Get all couriers with optional filtering
 */
router.get(
  '/couriers',
  requireAuth,
  [
    query('verification_status')
      .optional()
      .isIn(['pending', 'verified', 'rejected', 'suspended'])
      .withMessage('Invalid verification status'),
    query('availability_status')
      .optional()
      .isIn(['available', 'busy', 'offline', 'on_break'])
      .withMessage('Invalid availability status'),
    query('is_online').optional().isBoolean().withMessage('is_online must be a boolean'),
    query('vehicle_type')
      .optional()
      .isIn(['bicycle', 'motorcycle', 'car', 'van', 'truck'])
      .withMessage('Invalid vehicle type'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: config.pagination.maxLimit })
      .withMessage(`Limit must be between 1 and ${config.pagination.maxLimit}`),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || config.pagination.defaultLimit;

      const filters: any = {};
      if (req.query.verification_status) filters.verification_status = req.query.verification_status;
      if (req.query.availability_status) filters.availability_status = req.query.availability_status;
      if (req.query.is_online !== undefined) filters.is_online = req.query.is_online === 'true';
      if (req.query.vehicle_type) filters.vehicle_type = req.query.vehicle_type;

      const result = await courierService.getCouriers(
        filters,
        page,
        limit,
        req.requestId || 'get-couriers'
      );

      const response: APIResponse = {
        success: true,
        data: result.couriers,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-couriers',
          version: '1.0.0',
        },
        pagination: {
          page,
          limit,
          total: result.total,
          total_pages: Math.ceil(result.total / limit),
          has_previous: page > 1,
          has_next: page * limit < result.total,
          previous_page: page > 1 ? page - 1 : undefined,
          next_page: page * limit < result.total ? page + 1 : undefined,
        },
      };

      res.json(response);
    } catch (error: any) {
      logger.error('Error fetching couriers', {
        error: error.message,
      });

      const response: APIResponse = {
        success: false,
        error: {
          code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to fetch couriers',
          details: error.details,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-couriers',
          version: '1.0.0',
        },
      };

      res.status(error.statusCode || 500).json(response);
    }
  }
);

/**
 * PUT /couriers/:courierId
 * Update courier profile
 */
router.put(
  '/couriers/:courierId',
  requireAuth,
  [
    param('courierId').isUUID().withMessage('Courier ID must be a valid UUID'),
    body('first_name').optional().isString().withMessage('First name must be a string'),
    body('last_name').optional().isString().withMessage('Last name must be a string'),
    body('phone_number').optional().isString().withMessage('Phone number must be a string'),
    body('email').optional().isEmail().withMessage('Invalid email address'),
    body('vehicle_type')
      .optional()
      .isIn(['bicycle', 'motorcycle', 'car', 'van', 'truck'])
      .withMessage('Invalid vehicle type'),
    body('vehicle_registration').optional().isString().withMessage('Vehicle registration must be a string'),
    body('vehicle_capacity_kg').optional().isFloat({ min: 0 }).withMessage('Vehicle capacity must be positive'),
    body('max_delivery_radius_km').optional().isFloat({ min: 0 }).withMessage('Delivery radius must be positive'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { courierId } = req.params;

      const courier = await courierService.updateCourier(
        courierId,
        req.body,
        req.requestId || 'update-courier'
      );

      const response: APIResponse = {
        success: true,
        data: courier,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'update-courier',
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error: any) {
      logger.error('Error updating courier', {
        error: error.message,
        courier_id: req.params.courierId,
      });

      const response: APIResponse = {
        success: false,
        error: {
          code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to update courier',
          details: error.details,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'update-courier',
          version: '1.0.0',
        },
      };

      res.status(error.statusCode || 500).json(response);
    }
  }
);

/**
 * POST /couriers/:courierId/location
 * Update courier location
 */
router.post(
  '/couriers/:courierId/location',
  requireAuth,
  [
    param('courierId').isUUID().withMessage('Courier ID must be a valid UUID'),
    body('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    body('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { courierId } = req.params;
      const { latitude, longitude } = req.body;

      await courierService.updateCourierLocation(
        courierId,
        latitude,
        longitude,
        req.requestId || 'update-courier-location'
      );

      const response: APIResponse = {
        success: true,
        data: { message: 'Location updated successfully' },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'update-courier-location',
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error: any) {
      logger.error('Error updating courier location', {
        error: error.message,
        courier_id: req.params.courierId,
      });

      const response: APIResponse = {
        success: false,
        error: {
          code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to update location',
          details: error.details,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'update-courier-location',
          version: '1.0.0',
        },
      };

      res.status(error.statusCode || 500).json(response);
    }
  }
);

/**
 * POST /couriers/:courierId/availability
 * Update courier availability status
 */
router.post(
  '/couriers/:courierId/availability',
  requireAuth,
  [
    param('courierId').isUUID().withMessage('Courier ID must be a valid UUID'),
    body('status')
      .isIn(['available', 'busy', 'offline', 'on_break'])
      .withMessage('Invalid availability status'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { courierId } = req.params;
      const { status } = req.body;

      const courier = await courierService.updateAvailabilityStatus(
        courierId,
        status,
        req.requestId || 'update-courier-availability'
      );

      const response: APIResponse = {
        success: true,
        data: courier,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'update-courier-availability',
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error: any) {
      logger.error('Error updating courier availability', {
        error: error.message,
        courier_id: req.params.courierId,
      });

      const response: APIResponse = {
        success: false,
        error: {
          code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to update availability',
          details: error.details,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'update-courier-availability',
          version: '1.0.0',
        },
      };

      res.status(error.statusCode || 500).json(response);
    }
  }
);

/**
 * POST /couriers/:courierId/verification
 * Update courier verification status (Admin/Moderator only)
 */
router.post(
  '/couriers/:courierId/verification',
  requireAuth,
  requireRole(['admin', 'moderator']),
  [
    param('courierId').isUUID().withMessage('Courier ID must be a valid UUID'),
    body('status')
      .isIn(['pending', 'verified', 'rejected', 'suspended'])
      .withMessage('Invalid verification status'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { courierId } = req.params;
      const { status } = req.body;

      const courier = await courierService.updateVerificationStatus(
        courierId,
        status,
        req.requestId || 'update-courier-verification'
      );

      const response: APIResponse = {
        success: true,
        data: courier,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'update-courier-verification',
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error: any) {
      logger.error('Error updating courier verification status', {
        error: error.message,
        courier_id: req.params.courierId,
      });

      const response: APIResponse = {
        success: false,
        error: {
          code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to update verification status',
          details: error.details,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'update-courier-verification',
          version: '1.0.0',
        },
      };

      res.status(error.statusCode || 500).json(response);
    }
  }
);

/**
 * GET /couriers/:courierId/stats
 * Get courier statistics and performance metrics
 */
router.get(
  '/couriers/:courierId/stats',
  requireAuth,
  [param('courierId').isUUID().withMessage('Courier ID must be a valid UUID')],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { courierId } = req.params;

      const stats = await courierService.getCourierStats(courierId, req.requestId || 'get-courier-stats');

      const response: APIResponse = {
        success: true,
        data: stats,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-courier-stats',
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error: any) {
      logger.error('Error fetching courier stats', {
        error: error.message,
        courier_id: req.params.courierId,
      });

      const response: APIResponse = {
        success: false,
        error: {
          code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to fetch courier stats',
          details: error.details,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-courier-stats',
          version: '1.0.0',
        },
      };

      res.status(error.statusCode || 500).json(response);
    }
  }
);

export default router;
