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
 * @swagger
 * /packages:
 *   post:
 *     tags: [Packages]
 *     summary: Create a new delivery package
 *     description: Creates a new package for delivery with sender and recipient details
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePackageRequest'
 *     responses:
 *       201:
 *         description: Package created successfully
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/packages',
  requireAuth,
  [
    body('sender_name').isString().notEmpty().withMessage('Sender name is required'),
    body('sender_phone').isString().notEmpty().withMessage('Sender phone is required'),
    body('sender_address').isString().notEmpty().withMessage('Sender address is required'),
    body('sender_lat').optional().isFloat({ min: -90, max: 90 }),
    body('sender_lng').optional().isFloat({ min: -180, max: 180 }),
    body('recipient_name').isString().notEmpty().withMessage('Recipient name is required'),
    body('recipient_phone').isString().notEmpty().withMessage('Recipient phone is required'),
    body('recipient_address').isString().notEmpty().withMessage('Recipient address is required'),
    body('recipient_lat').optional().isFloat({ min: -90, max: 90 }),
    body('recipient_lng').optional().isFloat({ min: -180, max: 180 }),
    body('package_description').optional().isString(),
    body('package_weight').optional().isFloat({ min: 0 }),
    body('package_dimensions').optional().isObject(),
    body('delivery_fee').isFloat({ min: 0 }).withMessage('Delivery fee must be positive'),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
    body('delivery_instructions').optional().isString(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const packageData: CreatePackageRequest = { ...req.body, sender_id: req.user!.id };
      const pkg = await packageService.createPackage(
        packageData,
        req.requestId || 'create-package'
      );
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
      logger.error('Error creating package', { error: error.message, user_id: req.user?.id });
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
 * @swagger
 * /packages/{packageId}:
 *   get:
 *     tags: [Packages]
 *     summary: Get package by ID
 *     description: Retrieves detailed information about a specific package
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Package details retrieved
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
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
 * @swagger
 * /packages/sender/{senderId}:
 *   get:
 *     tags: [Packages]
 *     summary: Get packages by sender
 *     description: Retrieves all packages sent by a specific user with pagination
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: senderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Packages retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  '/packages/sender/:senderId',
  requireAuth,
  [
    param('senderId').isUUID().withMessage('Sender ID must be a valid UUID'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: config.pagination.maxLimit }),
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
 * @swagger
 * /packages/status/{status}:
 *   get:
 *     tags: [Packages]
 *     summary: Get packages by status
 *     description: Retrieves all packages with a specific delivery status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [pending, assigned, picked_up, in_transit, delivered, cancelled, failed]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Packages retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  '/packages/status/:status',
  requireAuth,
  [
    param('status').isIn([
      'pending',
      'assigned',
      'picked_up',
      'in_transit',
      'delivered',
      'cancelled',
      'failed',
    ]),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: config.pagination.maxLimit }),
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
        },
      };
      res.json(response);
    } catch (error: any) {
      logger.error('Error fetching packages by status', {
        error: error.message,
        status: req.params.status,
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
 * @swagger
 * /packages/{packageId}:
 *   put:
 *     tags: [Packages]
 *     summary: Update package information
 *     description: Updates package details (sender, recipient, status, etc.)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Package updated successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put(
  '/packages/:packageId',
  requireAuth,
  [
    param('packageId').isUUID().withMessage('Package ID must be a valid UUID'),
    body('sender_name').optional().isString(),
    body('sender_phone').optional().isString(),
    body('sender_address').optional().isString(),
    body('recipient_name').optional().isString(),
    body('recipient_phone').optional().isString(),
    body('recipient_address').optional().isString(),
    body('package_description').optional().isString(),
    body('package_weight').optional().isFloat({ min: 0 }),
    body('delivery_fee').optional().isFloat({ min: 0 }),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
    body('status')
      .optional()
      .isIn(['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed']),
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
 * @swagger
 * /packages/{packageId}/cancel:
 *   post:
 *     tags: [Packages]
 *     summary: Cancel a package
 *     description: Cancels a package delivery (only if not yet picked up)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Package cancelled successfully
 *       400:
 *         description: Package cannot be cancelled
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
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
 * @swagger
 * /packages/{packageId}:
 *   delete:
 *     tags: [Packages]
 *     summary: Delete a package
 *     description: Soft deletes a package from the system
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Package deleted successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
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
