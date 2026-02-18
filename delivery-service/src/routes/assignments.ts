import { Response, Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';

import { DeliveryAssignmentService } from '../services/deliveryAssignment';
import { AuthenticatedRequest } from '../types';
import { database } from '../utils/database';
import { createErrorResponse, createNotFoundError, createValidationError } from '../utils/errors';
import logger from '../utils/logger';

const router = Router();
const deliveryService = new DeliveryAssignmentService(database.getClient());

/**
 * @swagger
 * /assignments:
 *   post:
 *     tags: [Assignments]
 *     summary: Create delivery assignment
 *     description: Creates a new delivery assignment linking a package to a courier
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [order_id, pickup_location, delivery_location, recipient_name, recipient_phone]
 *             properties:
 *               order_id:
 *                 type: string
 *                 format: uuid
 *               pickup_location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               delivery_location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               recipient_name:
 *                 type: string
 *               recipient_phone:
 *                 type: string
 *               package_weight_kg:
 *                 type: number
 *               priority:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               specific_courier_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Assignment created successfully
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/',
  [
    body('order_id').isUUID(),
    body('pickup_location.latitude').isFloat({ min: -90, max: 90 }),
    body('pickup_location.longitude').isFloat({ min: -180, max: 180 }),
    body('delivery_location.latitude').isFloat({ min: -90, max: 90 }),
    body('delivery_location.longitude').isFloat({ min: -180, max: 180 }),
    body('recipient_name').notEmpty(),
    body('recipient_phone').notEmpty(),
    body('package_weight_kg').optional().isFloat({ min: 0 }),
    body('priority').optional().isInt({ min: 1, max: 5 }),
    body('specific_courier_id').optional().isUUID(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const requestId = req.requestId || uuidv4();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createValidationError('Validation failed', { errors: errors.array() });
      }
      const assignmentRequest = {
        orderId: req.body.order_id,
        pickupLocation: req.body.pickup_location,
        deliveryLocation: req.body.delivery_location,
        packageWeightKg: req.body.package_weight_kg,
        packageDimensions: req.body.package_dimensions,
        specialInstructions: req.body.special_instructions,
        pickupInstructions: req.body.pickup_instructions,
        deliveryInstructions: req.body.delivery_instructions,
        recipientName: req.body.recipient_name,
        recipientPhone: req.body.recipient_phone,
        senderName: req.body.sender_name,
        senderPhone: req.body.sender_phone,
        priority: req.body.priority || 3,
        deliveryScheduledAt: req.body.delivery_scheduled_at,
        deliveryFee: req.body.delivery_fee,
        courierCommission: req.body.courier_commission,
        specificCourierId: req.body.specific_courier_id,
      };
      const assignment = await deliveryService.assignDelivery(assignmentRequest, requestId);
      res.status(201).json({
        success: true,
        data: assignment,
        metadata: { timestamp: new Date().toISOString(), request_id: requestId, version: '1.0.0' },
      });
    } catch (error) {
      logger.error('Failed to create assignment', { requestId, error: (error as Error).message });
      const errorResponse = createErrorResponse(error as Error, requestId);
      res.status((error as any).statusCode || 500).json(errorResponse);
    }
  }
);

/**
 * @swagger
 * /assignments/{id}:
 *   get:
 *     tags: [Assignments]
 *     summary: Get assignment by ID
 *     description: Retrieves delivery assignment details including courier and order info
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Assignment details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/:id', [param('id').isUUID()], async (req: AuthenticatedRequest, res: Response) => {
  const requestId = req.requestId || uuidv4();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError('Validation failed', { errors: errors.array() });
    }
    const { id } = req.params;
    const { data: assignment, error } = await database
      .getClient()
      .from('delivery_assignments')
      .select(
        `*, courier:courier_profiles(id, first_name, last_name, phone_number, vehicle_type, rating), order:ecommerce_orders(id, order_number, status, total_amount)`
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
      metadata: { timestamp: new Date().toISOString(), request_id: requestId, version: '1.0.0' },
    });
  } catch (error) {
    logger.error('Failed to fetch assignment', { requestId, error: (error as Error).message });
    const errorResponse = createErrorResponse(error as Error, requestId);
    res.status((error as any).statusCode || 500).json(errorResponse);
  }
});

/**
 * @swagger
 * /assignments/find-couriers:
 *   post:
 *     tags: [Assignments]
 *     summary: Find available couriers
 *     description: Finds available couriers near a location for delivery assignment
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [location]
 *             properties:
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               radius_km:
 *                 type: number
 *                 default: 10
 *               package_weight_kg:
 *                 type: number
 *               priority:
 *                 type: integer
 *               required_vehicle_type:
 *                 type: string
 *               min_rating:
 *                 type: number
 *     responses:
 *       200:
 *         description: Available couriers found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 couriers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/NearbyCourer'
 *                 total_found:
 *                   type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/find-couriers',
  [
    body('location.latitude').isFloat({ min: -90, max: 90 }),
    body('location.longitude').isFloat({ min: -180, max: 180 }),
    body('radius_km').optional().isFloat({ min: 1, max: 100 }),
    body('package_weight_kg').optional().isFloat({ min: 0 }),
    body('priority').optional().isInt({ min: 1, max: 5 }),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const requestId = req.requestId || uuidv4();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createValidationError('Validation failed', { errors: errors.array() });
      }
      const criteria = {
        location: req.body.location,
        maxRadiusKm: req.body.radius_km,
        packageWeightKg: req.body.package_weight_kg,
        priority: req.body.priority,
        requiredVehicleType: req.body.required_vehicle_type,
        minRating: req.body.min_rating,
      };
      const availableCouriers = await deliveryService.findAvailableCouriers(criteria, requestId);
      res.json({
        success: true,
        data: {
          couriers: availableCouriers,
          total_found: availableCouriers.length,
          search_criteria: criteria,
        },
        metadata: { timestamp: new Date().toISOString(), request_id: requestId, version: '1.0.0' },
      });
    } catch (error) {
      logger.error('Failed to find couriers', { requestId, error: (error as Error).message });
      const errorResponse = createErrorResponse(error as Error, requestId);
      res.status((error as any).statusCode || 500).json(errorResponse);
    }
  }
);

export default router;
