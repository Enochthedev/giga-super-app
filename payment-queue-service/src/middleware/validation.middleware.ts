import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { BadRequestError } from '../utils/errors';
import { Validator } from '../utils/validator';

/**
 * Handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    throw new BadRequestError(`Validation failed: ${errorMessages}`);
  }
  
  next();
};

/**
 * Validation rules for payment request
 */
export const validatePaymentRequest = [
  body('module')
    .notEmpty().withMessage('Module is required')
    .isIn(['hotel', 'taxi', 'ecommerce']).withMessage('Invalid module'),
  
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0')
    .custom((value) => {
      if (!Validator.isValidAmount(value)) {
        throw new Error('Invalid amount format');
      }
      return true;
    }),
  
  body('currency')
    .notEmpty().withMessage('Currency is required')
    .isIn(['NGN', 'USD', 'EUR', 'GBP']).withMessage('Invalid currency'),
  
  body('userId')
    .notEmpty().withMessage('User ID is required')
    .isUUID().withMessage('Invalid user ID format'),
  
  body('branchId')
    .notEmpty().withMessage('Branch ID is required')
    .isUUID().withMessage('Invalid branch ID format'),
  
  body('stateId')
    .notEmpty().withMessage('State ID is required')
    .isUUID().withMessage('Invalid state ID format'),
  
  body('metadata')
    .notEmpty().withMessage('Metadata is required')
    .isObject().withMessage('Metadata must be an object'),
  
  body('metadata.moduleTransactionId')
    .notEmpty().withMessage('Module transaction ID is required'),
  
  body('metadata.customerEmail')
    .optional()
    .isEmail().withMessage('Invalid email format'),
  
  body('metadata.customerPhone')
    .optional()
    .custom((value) => {
      if (value && !Validator.isValidPhone(value)) {
        throw new Error('Invalid phone format');
      }
      return true;
    }),
  
  body('paymentMethod')
    .optional()
    .isIn(['paystack', 'stripe']).withMessage('Invalid payment method'),
  
  handleValidationErrors,
];

/**
 * Validation rules for refund request
 */
export const validateRefundRequest = [
  param('paymentId')
    .notEmpty().withMessage('Payment ID is required')
    .isUUID().withMessage('Invalid payment ID format'),
  
  body('reason')
    .notEmpty().withMessage('Reason is required')
    .isLength({ min: 10 }).withMessage('Reason must be at least 10 characters'),
  
  body('amount')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  
  handleValidationErrors,
];

/**
 * Validation rules for payment status
 */
export const validatePaymentStatus = [
  param('paymentId')
    .notEmpty().withMessage('Payment ID is required')
    .isUUID().withMessage('Invalid payment ID format'),
  
  handleValidationErrors,
];

/**
 * Validation rules for admin reports
 */
export const validateAdminReport = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),
  
  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format'),
  
  query('module')
    .optional()
    .isIn(['hotel', 'taxi', 'ecommerce']).withMessage('Invalid module'),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors,
];

/**
 * Validation rules for branch report
 */
export const validateBranchReport = [
  query('branchId')
    .optional()
    .isUUID().withMessage('Invalid branch ID format'),
  
  ...validateAdminReport,
];

/**
 * Validation rules for state report
 */
export const validateStateReport = [
  query('stateId')
    .optional()
    .isUUID().withMessage('Invalid state ID format'),
  
  ...validateAdminReport,
];

/**
 * Validation rules for webhook
 */
export const validateWebhook = [
  body('event')
    .notEmpty().withMessage('Event is required')
    .isString().withMessage('Event must be a string'),
  
  body('data')
    .notEmpty().withMessage('Data is required')
    .isObject().withMessage('Data must be an object'),
  
  handleValidationErrors,
];

/**
 * Custom validator to check date range
 */
export const validateDateRange = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.query.startDate && req.query.endDate) {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      
      Validator.validateDateRange(startDate, endDate);
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Sanitize request body
 */
export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = Validator.sanitizeString(req.body[key]);
      }
    });
  }
  
  next();
};
