import { NextFunction, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';

import { ERROR_CODES } from '../types';
import logger from '../utils/logger';

/**
 * Validation error handler middleware
 * Processes validation results and returns formatted error response
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
    }));

    logger.warn('Validation errors', {
      errors: formattedErrors,
      request_id: (req as any).requestId,
      url: req.url,
      method: req.method,
    });

    res.status(400).json({
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed for one or more fields',
        details: {
          fields: formattedErrors,
        },
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: (req as any).requestId || 'unknown',
        version: '1.0.0',
      },
    });
    return;
  }

  next();
};

/**
 * Common validation rules
 */
export const validationRules = {
  // UUID validation
  uuid: (field: string) => body(field).isUUID().withMessage(`${field} must be a valid UUID`),

  uuidParam: (field: string) => param(field).isUUID().withMessage(`${field} must be a valid UUID`),

  // String validation
  requiredString: (field: string, minLength: number = 1, maxLength: number = 255) =>
    body(field)
      .isString()
      .withMessage(`${field} must be a string`)
      .trim()
      .isLength({ min: minLength, max: maxLength })
      .withMessage(`${field} must be between ${minLength} and ${maxLength} characters`),

  optionalString: (field: string, maxLength: number = 255) =>
    body(field)
      .optional()
      .isString()
      .withMessage(`${field} must be a string`)
      .trim()
      .isLength({ max: maxLength })
      .withMessage(`${field} must not exceed ${maxLength} characters`),

  // Email validation
  email: (field: string = 'email') =>
    body(field).isEmail().withMessage(`${field} must be a valid email address`).normalizeEmail(),

  // Phone validation
  phone: (field: string = 'phone_number') =>
    body(field).isMobilePhone('any').withMessage(`${field} must be a valid phone number`),

  // Coordinates validation
  latitude: (field: string = 'latitude') =>
    body(field)
      .isFloat({ min: -90, max: 90 })
      .withMessage(`${field} must be a valid latitude between -90 and 90`),

  longitude: (field: string = 'longitude') =>
    body(field)
      .isFloat({ min: -180, max: 180 })
      .withMessage(`${field} must be a valid longitude between -180 and 180`),

  // Number validation
  positiveNumber: (field: string, max?: number) =>
    body(field)
      .isFloat({ min: 0, ...(max && { max }) })
      .withMessage(`${field} must be a positive number${max ? ` not exceeding ${max}` : ''}`),

  positiveInteger: (field: string, max?: number) =>
    body(field)
      .isInt({ min: 0, ...(max && { max }) })
      .withMessage(`${field} must be a positive integer${max ? ` not exceeding ${max}` : ''}`),

  // Date validation
  futureDate: (field: string) =>
    body(field)
      .isISO8601()
      .withMessage(`${field} must be a valid ISO 8601 date`)
      .custom(value => {
        if (new Date(value) <= new Date()) {
          throw new Error(`${field} must be a future date`);
        }
        return true;
      }),

  pastOrPresentDate: (field: string) =>
    body(field)
      .isISO8601()
      .withMessage(`${field} must be a valid ISO 8601 date`)
      .custom(value => {
        if (new Date(value) > new Date()) {
          throw new Error(`${field} cannot be a future date`);
        }
        return true;
      }),

  // Enum validation
  enum: (field: string, allowedValues: string[]) =>
    body(field)
      .isIn(allowedValues)
      .withMessage(`${field} must be one of: ${allowedValues.join(', ')}`),

  // Array validation
  arrayOfStrings: (field: string, minLength: number = 0, maxLength: number = 100) =>
    body(field)
      .isArray({ min: minLength, max: maxLength })
      .withMessage(`${field} must be an array with ${minLength}-${maxLength} items`)
      .custom((arr: string[]) => {
        if (!arr.every(item => typeof item === 'string')) {
          throw new Error(`${field} must contain only strings`);
        }
        return true;
      }),

  // Query parameter validation
  paginationQuery: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be between 1 and 100')
      .toInt(),
  ],

  statusQuery: (allowedStatuses: string[]) =>
    query('status')
      .optional()
      .isIn(['all', ...allowedStatuses])
      .withMessage(`status must be one of: all, ${allowedStatuses.join(', ')}`),
};

/**
 * Specific validation chains for delivery service endpoints
 */
export const deliveryValidations = {
  assignDelivery: [
    validationRules.uuid('order_id'),
    validationRules.requiredString('pickup_address.street_address', 5, 500),
    validationRules.requiredString('pickup_address.city', 2, 100),
    validationRules.requiredString('pickup_address.state', 2, 100),
    validationRules.requiredString('pickup_address.country', 2, 100),
    validationRules.requiredString('delivery_address.street_address', 5, 500),
    validationRules.requiredString('delivery_address.city', 2, 100),
    validationRules.requiredString('delivery_address.state', 2, 100),
    validationRules.requiredString('delivery_address.country', 2, 100),
    body('package_details.fragile')
      .isBoolean()
      .withMessage('package_details.fragile must be a boolean'),
    validationRules.enum('priority', ['low', 'normal', 'high', 'urgent']),
    validationRules.optionalString('special_instructions', 1000),
    handleValidationErrors,
  ],

  trackDelivery: [
    validationRules.uuidParam('assignmentId'),
    validationRules.latitude('latitude'),
    validationRules.longitude('longitude'),
    validationRules.enum('status', [
      'pending',
      'assigned',
      'courier_en_route_pickup',
      'arrived_at_pickup',
      'picked_up',
      'in_transit',
      'arrived_at_delivery',
      'out_for_delivery',
      'delivered',
      'failed',
      'cancelled',
      'returned',
    ]),
    validationRules.optionalString('notes', 1000),
    handleValidationErrors,
  ],

  updateDeliveryStatus: [
    validationRules.uuidParam('assignmentId'),
    validationRules.enum('status', [
      'assigned',
      'courier_en_route_pickup',
      'arrived_at_pickup',
      'picked_up',
      'in_transit',
      'arrived_at_delivery',
      'out_for_delivery',
      'delivered',
      'failed',
      'cancelled',
      'returned',
    ]),
    validationRules.optionalString('notes', 1000),
    body('photo_urls')
      .optional()
      .isArray({ max: 10 })
      .withMessage('photo_urls must be an array with maximum 10 items'),
    body('delivery_confirmation.recipient_name')
      .if(body('status').equals('delivered'))
      .notEmpty()
      .withMessage('recipient_name is required when status is delivered'),
    handleValidationErrors,
  ],

  optimizeRoutes: [
    validationRules.uuid('courier_id'),
    body('assignment_ids')
      .isArray({ min: 1, max: 20 })
      .withMessage('assignment_ids must be an array with 1-20 items')
      .custom((arr: string[]) => {
        if (
          !arr.every(
            id =>
              typeof id === 'string' &&
              id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
          )
        ) {
          throw new Error('assignment_ids must contain only valid UUIDs');
        }
        return true;
      }),
    body('start_location').optional().isObject().withMessage('start_location must be an object'),
    body('start_location.latitude')
      .if(body('start_location').exists())
      .isFloat({ min: -90, max: 90 })
      .withMessage('start_location.latitude must be between -90 and 90'),
    body('start_location.longitude')
      .if(body('start_location').exists())
      .isFloat({ min: -180, max: 180 })
      .withMessage('start_location.longitude must be between -180 and 180'),
    handleValidationErrors,
  ],

  getAssignments: [
    ...validationRules.paginationQuery(),
    validationRules.statusQuery([
      'pending',
      'assigned',
      'courier_en_route_pickup',
      'arrived_at_pickup',
      'picked_up',
      'in_transit',
      'arrived_at_delivery',
      'out_for_delivery',
      'delivered',
      'failed',
      'cancelled',
      'returned',
    ]),
    query('date')
      .optional()
      .isISO8601({ strict: true })
      .withMessage('date must be in YYYY-MM-DD format'),
    query('include_route')
      .optional()
      .isBoolean()
      .withMessage('include_route must be a boolean')
      .toBoolean(),
    handleValidationErrors,
  ],

  courierAvailability: [
    validationRules.enum('availability_status', ['available', 'busy', 'offline', 'on_break']),
    validationRules.latitude('latitude'),
    validationRules.longitude('longitude'),
    body('is_online').optional().isBoolean().withMessage('is_online must be a boolean'),
    body('shift_start_time')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('shift_start_time must be in HH:MM format'),
    body('shift_end_time')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('shift_end_time must be in HH:MM format'),
    handleValidationErrors,
  ],
};

/**
 * Custom validation middleware for complex business rules
 */
export const businessValidations = {
  /**
   * Validate delivery status transitions
   */
  validateStatusTransition: (req: Request, res: Response, next: NextFunction): void => {
    const { status } = req.body;
    const currentStatus = (req as any).currentAssignment?.status;

    if (!currentStatus) {
      next();
      return;
    }

    const validTransitions: Record<string, string[]> = {
      pending: ['assigned', 'cancelled'],
      assigned: ['courier_en_route_pickup', 'cancelled'],
      courier_en_route_pickup: ['arrived_at_pickup', 'cancelled'],
      arrived_at_pickup: ['picked_up', 'failed'],
      picked_up: ['in_transit', 'failed'],
      in_transit: ['arrived_at_delivery', 'failed'],
      arrived_at_delivery: ['out_for_delivery', 'failed'],
      out_for_delivery: ['delivered', 'failed', 'returned'],
      delivered: [], // Terminal state
      failed: ['assigned'], // Can be reassigned
      cancelled: [], // Terminal state
      returned: ['assigned'], // Can be reassigned
    };

    const allowedTransitions = validTransitions[currentStatus] || [];

    if (!allowedTransitions.includes(status)) {
      res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_STATUS_TRANSITION,
          message: `Invalid status transition from ${currentStatus} to ${status}`,
          details: {
            current_status: currentStatus,
            requested_status: status,
            allowed_transitions: allowedTransitions,
          },
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: (req as any).requestId || 'unknown',
          version: '1.0.0',
        },
      });
      return;
    }

    next();
  },

  /**
   * Validate delivery time constraints
   */
  validateDeliveryTime: (req: Request, res: Response, next: NextFunction): void => {
    const { scheduled_pickup_time } = req.body;

    if (scheduled_pickup_time) {
      const scheduledTime = new Date(scheduled_pickup_time);
      const now = new Date();
      const minScheduleTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now

      if (scheduledTime < minScheduleTime) {
        res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Scheduled pickup time must be at least 30 minutes from now',
            details: {
              scheduled_time: scheduled_pickup_time,
              minimum_time: minScheduleTime.toISOString(),
            },
          },
          metadata: {
            timestamp: new Date().toISOString(),
            request_id: (req as any).requestId || 'unknown',
            version: '1.0.0',
          },
        });
        return;
      }
    }

    next();
  },
};
