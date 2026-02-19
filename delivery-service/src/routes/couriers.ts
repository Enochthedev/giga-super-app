import { Router } from 'express';
import { body, param, query } from 'express-validator';

import config from '../config';
import { requireAuth, requireRole } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import { CourierService } from '../services/courier';
import { AuthenticatedRequest, CreateCourierRequest, ERROR_CODES } from '../types';
import { db } from '../utils/database';
import logger from '../utils/logger';

const router = Router();
const courierService = new CourierService(db);

// ============================================================================
// IMPORTANT: Route order matters in Express!
// - Specific routes (e.g., /couriers, /couriers/user/:userId) MUST come BEFORE
// - Parameterized routes (e.g., /couriers/:courierId)
// - Otherwise, /couriers would match /couriers/:courierId with courierId=""
// ============================================================================

/**
 * @swagger
 * /couriers:
 *   get:
 *     tags: [Couriers]
 *     summary: List all couriers
 *     description: Retrieves all couriers with optional filtering. Supports pagination and filtering by verification status, availability status, and vehicle type.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: verification_status
 *         schema:
 *           type: string
 *           enum: [pending, verified, rejected, suspended]
 *         description: Filter by verification status
 *       - in: query
 *         name: availability_status
 *         schema:
 *           type: string
 *           enum: [available, busy, offline, on_break]
 *         description: Filter by availability status
 *       - in: query
 *         name: vehicle_type
 *         schema:
 *           type: string
 *           enum: [bicycle, motorcycle, car, van, truck]
 *         description: Filter by vehicle type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Couriers list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Courier'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     total_pages:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  '/couriers',
  requireAuth,
  [
    query('verification_status').optional().isIn(['pending', 'verified', 'rejected', 'suspended']),
    query('availability_status').optional().isIn(['available', 'busy', 'offline', 'on_break']),
    query('vehicle_type').optional().isIn(['bicycle', 'motorcycle', 'car', 'van', 'truck']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: config.pagination.maxLimit }),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || config.pagination.defaultLimit;
      const filters: any = {};
      if (req.query.verification_status)
        filters.verification_status = req.query.verification_status;
      if (req.query.availability_status)
        filters.availability_status = req.query.availability_status;
      if (req.query.vehicle_type) filters.vehicle_type = req.query.vehicle_type;
      const result = await courierService.getCouriers(
        filters,
        page,
        limit,
        req.requestId || 'get-couriers'
      );
      res.json({
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
        },
      });
    } catch (error: any) {
      logger.error('Error fetching couriers', { error: error.message });
      res.status(error.statusCode || 500).json({
        success: false,
        error: { code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR, message: error.message },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-couriers',
          version: '1.0.0',
        },
      });
    }
  }
);

/**
 * @swagger
 * /couriers:
 *   post:
 *     tags: [Couriers]
 *     summary: Create courier profile
 *     description: Creates a new courier profile for delivery agent onboarding. The user must be authenticated.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [first_name, last_name, phone_number, vehicle_type]
 *             properties:
 *               first_name:
 *                 type: string
 *                 description: Courier's first name
 *                 example: John
 *               last_name:
 *                 type: string
 *                 description: Courier's last name
 *                 example: Doe
 *               phone_number:
 *                 type: string
 *                 description: Courier's phone number
 *                 example: "+2341234567890"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Courier's email (optional)
 *                 example: john.doe@example.com
 *               vehicle_type:
 *                 type: string
 *                 enum: [bicycle, motorcycle, car, van, truck]
 *                 description: Type of vehicle the courier uses
 *                 example: motorcycle
 *     responses:
 *       201:
 *         description: Courier profile created successfully
 *       400:
 *         description: Validation error - missing or invalid fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/couriers',
  requireAuth,
  [
    body('first_name').isString().notEmpty().withMessage('First name is required'),
    body('last_name').isString().notEmpty().withMessage('Last name is required'),
    body('phone_number').isString().notEmpty().withMessage('Phone number is required'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('vehicle_type')
      .isIn(['bicycle', 'motorcycle', 'car', 'van', 'truck'])
      .withMessage('Vehicle type must be one of: bicycle, motorcycle, car, van, truck'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const courierData: CreateCourierRequest = { ...req.body, user_id: req.user!.id };
      const courier = await courierService.createCourier(
        courierData,
        req.requestId || 'create-courier'
      );
      res.status(201).json({
        success: true,
        data: courier,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'create-courier',
          version: '1.0.0',
        },
      });
    } catch (error: any) {
      logger.error('Error creating courier', { error: error.message });
      res.status(error.statusCode || 500).json({
        success: false,
        error: { code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR, message: error.message },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'create-courier',
          version: '1.0.0',
        },
      });
    }
  }
);

/**
 * @swagger
 * /couriers/user/{userId}:
 *   get:
 *     tags: [Couriers]
 *     summary: Get courier by user ID
 *     description: Retrieves courier profile by the associated user ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The user ID associated with the courier profile
 *     responses:
 *       200:
 *         description: Courier details retrieved successfully
 *       404:
 *         description: Courier not found for the given user ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  '/couriers/user/:userId',
  requireAuth,
  [param('userId').isUUID().withMessage('User ID must be a valid UUID')],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;
      const courier = await courierService.getCourierByUserId(
        userId,
        req.requestId || 'get-courier-by-user'
      );
      res.json({
        success: true,
        data: courier,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-courier-by-user',
          version: '1.0.0',
        },
      });
    } catch (error: any) {
      logger.error('Error fetching courier by user', { error: error.message });
      res.status(error.statusCode || 500).json({
        success: false,
        error: { code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR, message: error.message },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-courier-by-user',
          version: '1.0.0',
        },
      });
    }
  }
);

// ============================================================================
// Parameterized routes below - these MUST come AFTER specific routes
// ============================================================================

/**
 * @swagger
 * /couriers/{courierId}:
 *   get:
 *     tags: [Couriers]
 *     summary: Get courier by ID
 *     description: Retrieves courier profile details including current location
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courierId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique courier ID
 *     responses:
 *       200:
 *         description: Courier details retrieved successfully
 *       404:
 *         description: Courier not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  '/couriers/:courierId',
  requireAuth,
  [param('courierId').isUUID().withMessage('Courier ID must be a valid UUID')],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { courierId } = req.params;
      const courier = await courierService.getCourierById(
        courierId,
        req.requestId || 'get-courier'
      );
      res.json({
        success: true,
        data: courier,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-courier',
          version: '1.0.0',
        },
      });
    } catch (error: any) {
      logger.error('Error fetching courier', { error: error.message });
      res.status(error.statusCode || 500).json({
        success: false,
        error: { code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR, message: error.message },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-courier',
          version: '1.0.0',
        },
      });
    }
  }
);

/**
 * @swagger
 * /couriers/{courierId}:
 *   put:
 *     tags: [Couriers]
 *     summary: Update courier profile
 *     description: Updates an existing courier profile
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courierId
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
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Courier updated successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put(
  '/couriers/:courierId',
  requireAuth,
  [
    param('courierId').isUUID().withMessage('Courier ID must be a valid UUID'),
    body('first_name').optional().isString(),
    body('last_name').optional().isString(),
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
      res.json({
        success: true,
        data: courier,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'update-courier',
          version: '1.0.0',
        },
      });
    } catch (error: any) {
      logger.error('Error updating courier', { error: error.message });
      res.status(error.statusCode || 500).json({
        success: false,
        error: { code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR, message: error.message },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'update-courier',
          version: '1.0.0',
        },
      });
    }
  }
);

/**
 * @swagger
 * /couriers/{courierId}/location:
 *   post:
 *     tags: [Couriers]
 *     summary: Update courier location
 *     description: Updates the current GPS coordinates of a courier. Used for real-time tracking.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courierId
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
 *             required: [latitude, longitude]
 *             properties:
 *               latitude:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *                 description: Latitude coordinate
 *                 example: 6.5244
 *               longitude:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *                 description: Longitude coordinate
 *                 example: 3.3792
 *     responses:
 *       200:
 *         description: Location updated successfully
 *       400:
 *         description: Invalid coordinates
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
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
        req.requestId || 'update-location'
      );
      res.json({
        success: true,
        data: { message: 'Location updated successfully' },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'update-location',
          version: '1.0.0',
        },
      });
    } catch (error: any) {
      logger.error('Error updating courier location', { error: error.message });
      res.status(error.statusCode || 500).json({
        success: false,
        error: { code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR, message: error.message },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'update-location',
          version: '1.0.0',
        },
      });
    }
  }
);

/**
 * @swagger
 * /couriers/{courierId}/availability:
 *   post:
 *     tags: [Couriers]
 *     summary: Update courier availability
 *     description: Updates the availability status of a courier
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courierId
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [available, busy, offline, on_break]
 *                 description: New availability status
 *                 example: available
 *     responses:
 *       200:
 *         description: Availability updated successfully
 *       400:
 *         description: Invalid status value
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/couriers/:courierId/availability',
  requireAuth,
  [
    param('courierId').isUUID().withMessage('Courier ID must be a valid UUID'),
    body('status')
      .isIn(['available', 'busy', 'offline', 'on_break'])
      .withMessage('Status must be one of: available, busy, offline, on_break'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { courierId } = req.params;
      const { status } = req.body;
      const courier = await courierService.updateAvailabilityStatus(
        courierId,
        status,
        req.requestId || 'update-availability'
      );
      res.json({
        success: true,
        data: courier,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'update-availability',
          version: '1.0.0',
        },
      });
    } catch (error: any) {
      logger.error('Error updating availability', { error: error.message });
      res.status(error.statusCode || 500).json({
        success: false,
        error: { code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR, message: error.message },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'update-availability',
          version: '1.0.0',
        },
      });
    }
  }
);

/**
 * @swagger
 * /couriers/{courierId}/verification:
 *   post:
 *     tags: [Couriers]
 *     summary: Update courier verification status
 *     description: Updates the verification status of a courier. Admin/Moderator only.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courierId
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, verified, rejected, suspended]
 *                 description: New verification status
 *                 example: verified
 *     responses:
 *       200:
 *         description: Verification status updated successfully
 *       403:
 *         description: Forbidden - requires admin or moderator role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/couriers/:courierId/verification',
  requireAuth,
  requireRole(['admin', 'moderator']),
  [
    param('courierId').isUUID().withMessage('Courier ID must be a valid UUID'),
    body('status')
      .isIn(['pending', 'verified', 'rejected', 'suspended'])
      .withMessage('Status must be one of: pending, verified, rejected, suspended'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { courierId } = req.params;
      const { status } = req.body;
      const courier = await courierService.updateVerificationStatus(
        courierId,
        status,
        req.requestId || 'update-verification'
      );
      res.json({
        success: true,
        data: courier,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'update-verification',
          version: '1.0.0',
        },
      });
    } catch (error: any) {
      logger.error('Error updating verification', { error: error.message });
      res.status(error.statusCode || 500).json({
        success: false,
        error: { code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR, message: error.message },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'update-verification',
          version: '1.0.0',
        },
      });
    }
  }
);

/**
 * @swagger
 * /couriers/{courierId}/stats:
 *   get:
 *     tags: [Couriers]
 *     summary: Get courier statistics
 *     description: Retrieves performance statistics for a courier including deliveries completed, ratings, etc.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courierId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Courier statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_deliveries:
 *                       type: integer
 *                     completed_deliveries:
 *                       type: integer
 *                     average_rating:
 *                       type: number
 *                     total_earnings:
 *                       type: number
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  '/couriers/:courierId/stats',
  requireAuth,
  [param('courierId').isUUID().withMessage('Courier ID must be a valid UUID')],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { courierId } = req.params;
      const stats = await courierService.getCourierStats(
        courierId,
        req.requestId || 'get-courier-stats'
      );
      res.json({
        success: true,
        data: stats,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-courier-stats',
          version: '1.0.0',
        },
      });
    } catch (error: any) {
      logger.error('Error fetching courier stats', { error: error.message });
      res.status(error.statusCode || 500).json({
        success: false,
        error: { code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR, message: error.message },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId || 'get-courier-stats',
          version: '1.0.0',
        },
      });
    }
  }
);

export default router;
