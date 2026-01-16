import { Router } from 'express';
import { body, param, query } from 'express-validator';

import config from '../config';
import { requireAuth } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import { PackageService } from '../services/package';
import { APIResponse, AuthenticatedRequest, CreatePackageRequest, ERROR_CODES } from '../types';
import { db } from '../utils/database';
import logger from '../utils/logger';

const router = Router();
const packageService = new PackageService(db);

/**
 * POST /packages
 * Create a new delivery package
 */
router.post(
  '/packages',
  requireAuth,
  [
    body('sender_name').isString().notEmpty().withMessage('Sender name is required'),
    body('sender_phone').isString().notEmpty().withMessage('Sender phone is required'),
    body('sender_address').isString().notEmpty().withMessage('Sender address is required'),
    body('sender_lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid sender latitude'),
    body('sender_lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid sender longitude'),
    body('recipient_name').isString().notEmpty().withMessage('Recipient name is required'),
    body('recipient_phone').isString().notEmpty().withMessage('Recipient phone is required'),
    body('recipient_address').isString().notEmpty().withMessage('Recipient address is required'),
    body('recipient_lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid recipient latitude'),
    body('recipient_lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid recipient longitude'),
    body('package_description').optional().isString().withMessage('Package description must be a string'),
    body('package_weight').optional().isFloat({ min: 0 }).withMessage('Package weight must be positive'),
    body('package_dimensions').optional().isObject().withMessage('Package dimensions must be an object'),
    body('delivery_fee').isFloat({ min: 0 }).withMessage('Delivery fee must be positive'),
    body('priority')
      .optional()
      .isIn(['low', 'normal', 'high', 'urgent'])
      .withMessage('Invalid priority'),
    body('delivery_instructions').optional().isString().withMessage('Delivery instructions must be a string'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const packageData: CreatePackageRequest = {
        ...req.body,
        sender_id: req.user!.id,
      };

      logger.info('Creating package', {
        user_id: req.user!.id,
        request_id: req.requestId,
      });

      const pkg = await packageService.createPackage(packageData, req.requestId || 'create-package');

      const response: APIResponse = {
        success: true,
        data: pkg,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'create-package',
          version: '1.0.0',
        },
      };

      res.status(201).json(response);
    } catch (error: any) {
      logger.error('Error creating package', {
        error: error.message,
        user_id: req.user?.id,
      });

      const response: APIResponse = {
        success: false,
        error: {
          code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to create package',
          details: error.details,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'create-package',
          version: '1.0.0',
        },
      };

      res.status(error.statusCode || 500).json(response);
    }
  }
);

/**
 * GET /packages/:packageId
 * Get package details by ID
 */
router.get(
  '/packages/:packageId',
  requireAuth,
  [param('packageId').isUUID().withMessage('Package ID must be a valid UUID')],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { packageId } = req.params;

      const pkg = await packageService.getPackageById(packageId, req.requestId || 'get-package');

      const response: APIResponse = {
        success: true,
        data: pkg,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-package',
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error: any) {
      logger.error('Error fetching package', {
        error: error.message,
        package_id: req.params.packageId,
      });

      const response: APIResponse = {
        success: false,
        error: {
          code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to fetch package',
          details: error.details,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-package',
          version: '1.0.0',
        },
      };

      res.status(error.statusCode || 500).json(response);
    }
  }
);

/**
 * GET /packages/sender/:senderId
 * Get packages by sender ID
 */
router.get(
  '/packages/sender/:senderId',
  requireAuth,
  [
    param('senderId').isUUID().withMessage('Sender ID must be a valid UUID'),
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
      const { senderId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || config.pagination.defaultLimit;

      const result = await packageService.getPackagesBySender(
        senderId,
        page,
        limit,
        req.requestId || 'get-sender-packages'
      );

      const response: APIResponse = {
        success: true,
        data: result.packages,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-sender-packages',
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
      logger.error('Error fetching sender packages', {
        error: error.message,
        sender_id: req.params.senderId,
      });

      const response: APIResponse = {
        success: false,
        error: {
          code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to fetch packages',
          details: error.details,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-sender-packages',
          version: '1.0.0',
        },
      };

      res.status(error.statusCode || 500).json(response);
    }
  }
);

/**
 * GET /packages/status/:status
 * Get packages by status
 */
router.get(
  '/packages/status/:status',
  requireAuth,
  [
    param('status')
      .isIn(['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed'])
      .withMessage('Invalid status'),
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
      const { status } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || config.pagination.defaultLimit;

      const result = await packageService.getPackagesByStatus(
        status,
        page,
        limit,
        req.requestId || 'get-packages-by-status'
      );

      const response: APIResponse = {
        success: true,
        data: result.packages,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-packages-by-status',
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
      logger.error('Error fetching packages by status', {
        error: error.message,
        status,
      });

      const response: APIResponse = {
        success: false,
        error: {
          code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to fetch packages',
          details: error.details,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-packages-by-status',
          version: '1.0.0',
        },
      };

      res.status(error.statusCode || 500).json(response);
    }
  }
);

/**
 * PUT /packages/:packageId
 * Update package information
 */
router.put(
  '/packages/:packageId',
  requireAuth,
  [
    param('packageId').isUUID().withMessage('Package ID must be a valid UUID'),
    body('sender_name').optional().isString().withMessage('Sender name must be a string'),
    body('sender_phone').optional().isString().withMessage('Sender phone must be a string'),
    body('sender_address').optional().isString().withMessage('Sender address must be a string'),
    body('recipient_name').optional().isString().withMessage('Recipient name must be a string'),
    body('recipient_phone').optional().isString().withMessage('Recipient phone must be a string'),
    body('recipient_address').optional().isString().withMessage('Recipient address must be a string'),
    body('package_description').optional().isString().withMessage('Package description must be a string'),
    body('package_weight').optional().isFloat({ min: 0 }).withMessage('Package weight must be positive'),
    body('delivery_fee').optional().isFloat({ min: 0 }).withMessage('Delivery fee must be positive'),
    body('priority')
      .optional()
      .isIn(['low', 'normal', 'high', 'urgent'])
      .withMessage('Invalid priority'),
    body('status')
      .optional()
      .isIn(['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed'])
      .withMessage('Invalid status'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { packageId } = req.params;

      const pkg = await packageService.updatePackage(
        packageId,
        req.body,
        req.requestId || 'update-package'
      );

      const response: APIResponse = {
        success: true,
        data: pkg,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'update-package',
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error: any) {
      logger.error('Error updating package', {
        error: error.message,
        package_id: req.params.packageId,
      });

      const response: APIResponse = {
        success: false,
        error: {
          code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to update package',
          details: error.details,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'update-package',
          version: '1.0.0',
        },
      };

      res.status(error.statusCode || 500).json(response);
    }
  }
);

/**
 * POST /packages/:packageId/cancel
 * Cancel a package
 */
router.post(
  '/packages/:packageId/cancel',
  requireAuth,
  [param('packageId').isUUID().withMessage('Package ID must be a valid UUID')],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { packageId } = req.params;

      const pkg = await packageService.cancelPackage(packageId, req.requestId || 'cancel-package');

      const response: APIResponse = {
        success: true,
        data: pkg,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'cancel-package',
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error: any) {
      logger.error('Error cancelling package', {
        error: error.message,
        package_id: req.params.packageId,
      });

      const response: APIResponse = {
        success: false,
        error: {
          code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to cancel package',
          details: error.details,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'cancel-package',
          version: '1.0.0',
        },
      };

      res.status(error.statusCode || 500).json(response);
    }
  }
);

/**
 * DELETE /packages/:packageId
 * Delete a package (soft delete)
 */
router.delete(
  '/packages/:packageId',
  requireAuth,
  [param('packageId').isUUID().withMessage('Package ID must be a valid UUID')],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { packageId } = req.params;

      await packageService.deletePackage(packageId, req.requestId || 'delete-package');

      const response: APIResponse = {
        success: true,
        data: { message: 'Package deleted successfully' },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'delete-package',
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error: any) {
      logger.error('Error deleting package', {
        error: error.message,
        package_id: req.params.packageId,
      });

      const response: APIResponse = {
        success: false,
        error: {
          code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to delete package',
          details: error.details,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'delete-package',
          version: '1.0.0',
        },
      };

      res.status(error.statusCode || 500).json(response);
    }
  }
);

export default router;
