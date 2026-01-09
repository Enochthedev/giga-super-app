import { AuthenticatedRequest } from '@/types';
import { database } from '@/utils/database';
import { createErrorResponse, createNotFoundError, createValidationError } from '@/utils/errors';
import logger from '@/utils/logger';
import { Response, Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { DeliveryAssignmentService } from '../services/deliveryAssignment';

const router = Router();

// Initialize delivery assignment service
const deliveryService = new DeliveryAssignmentService(database.getClient());

/**
 * Create a new delivery assignment
 * POST /assignments
 */
router.post(
  '/',
  [
    body('order_id').isUUID().withMessage('Valid order ID is required'),
    body('pickup_location.latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Valid pickup latitude is required'),
    body('pickup_location.longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Valid pickup longitude is required'),
    body('delivery_location.latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Valid delivery latitude is required'),
    body('delivery_location.longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Valid delivery longitude is required'),
    body('recipient_name').notEmpty().withMessage('Recipient name is required'),
    body('recipient_phone').notEmpty().withMessage('Recipient phone is required'),
    body('package_weight_kg')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Package weight must be positive'),
    body('priority')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Priority must be between 1-5'),
    body('specific_courier_id').optional().isUUID().withMessage('Courier ID must be valid UUID'),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const requestId = req.requestId || uuidv4();

    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createValidationError('Validation failed', { errors: errors.array() });
      }

      const {
        order_id,
        pickup_location,
        delivery_location,
        package_weight_kg,
        package_dimensions,
        special_instructions,
        pickup_instructions,
        delivery_instructions,
        recipient_name,
        recipient_phone,
        sender_name,
        sender_phone,
        priority,
        delivery_scheduled_at,
        delivery_fee,
        courier_commission,
        specific_courier_id,
      } = req.body;

      logger.info('Creating delivery assignment', {
        requestId,
        orderId: order_id,
        userId: req.user?.id,
        specificCourier: !!specific_courier_id,
      });

      // Create assignment request
      const assignmentRequest = {
        orderId: order_id,
        pickupLocation: pickup_location,
        deliveryLocation: delivery_location,
        packageWeightKg: package_weight_kg,
        packageDimensions: package_dimensions,
        specialInstructions: special_instructions,
        pickupInstructions: pickup_instructions,
        deliveryInstructions: delivery_instructions,
        recipientName: recipient_name,
        recipientPhone: recipient_phone,
        senderName: sender_name,
        senderPhone: sender_phone,
        priority: priority || 3,
        deliveryScheduledAt: delivery_scheduled_at,
        deliveryFee: delivery_fee,
        courierCommission: courier_commission,
        specificCourierId: specific_courier_id,
      };

      // Create the assignment
      const assignment = await deliveryService.assignDelivery(assignmentRequest, requestId);

      res.status(201).json({
        success: true,
        data: assignment,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          version: '1.0.0',
        },
      });
    } catch (error) {
      logger.error('Failed to create delivery assignment', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });

      const errorResponse = createErrorResponse(error as Error, requestId);
      const statusCode = (error as any).statusCode || 500;
      res.status(statusCode).json(errorResponse);
    }
  }
);

/**
 * Get delivery assignment by ID
 * GET /assignments/:id
 */
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Valid assignment ID is required')],
  async (req: AuthenticatedRequest, res: Response) => {
    const requestId = req.requestId || uuidv4();

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createValidationError('Validation failed', { errors: errors.array() });
      }

      const { id } = req.params;

      logger.debug('Fetching delivery assignment', {
        requestId,
        assignmentId: id,
        userId: req.user?.id,
      });

      const { data: assignment, error } = await database
        .getClient()
        .from('delivery_assignments')
        .select(
          `
          *,
          courier:courier_profiles(id, first_name, last_name, phone_number, vehicle_type, rating),
          order:ecommerce_orders(id, order_number, status, total_amount)
        `
        )
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error || !assignment) {
        throw createNotFoundError('Delivery assignment not found');
      }

      res.json({
        success: true,
        data: assignment,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          version: '1.0.0',
        },
      });
    } catch (error) {
      logger.error('Failed to fetch delivery assignment', {
        requestId,
        assignmentId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      const errorResponse = createErrorResponse(error as Error, requestId);
      const statusCode = (error as any).statusCode || 500;
      res.status(statusCode).json(errorResponse);
    }
  }
);

/**
 * Find available couriers for a location
 * POST /assignments/find-couriers
 */
router.post(
  '/find-couriers',
  [
    body('location.latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Valid latitude is required'),
    body('location.longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Valid longitude is required'),
    body('radius_km')
      .optional()
      .isFloat({ min: 1, max: 100 })
      .withMessage('Radius must be between 1-100 km'),
    body('package_weight_kg')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Package weight must be positive'),
    body('priority')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Priority must be between 1-5'),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const requestId = req.requestId || uuidv4();

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createValidationError('Validation failed', { errors: errors.array() });
      }

      const {
        location,
        radius_km,
        package_weight_kg,
        priority,
        required_vehicle_type,
        min_rating,
      } = req.body;

      logger.debug('Finding available couriers', {
        requestId,
        location,
        radius_km,
        userId: req.user?.id,
      });

      const criteria = {
        location,
        maxRadiusKm: radius_km,
        packageWeightKg: package_weight_kg,
        priority,
        requiredVehicleType: required_vehicle_type,
        minRating: min_rating,
      };

      const availableCouriers = await deliveryService.findAvailableCouriers(criteria, requestId);

      res.json({
        success: true,
        data: {
          couriers: availableCouriers,
          total_found: availableCouriers.length,
          search_criteria: criteria,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          version: '1.0.0',
        },
      });
    } catch (error) {
      logger.error('Failed to find available couriers', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });

      const errorResponse = createErrorResponse(error as Error, requestId);
      const statusCode = (error as any).statusCode || 500;
      res.status(statusCode).json(errorResponse);
    }
  }
);

export default router;
