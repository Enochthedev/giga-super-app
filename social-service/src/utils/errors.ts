/**
 * Error Handling Utilities
 * Custom error classes and error response formatting
 */

import { Response } from 'express';
import { APIError, APIResponse } from '../types';
import logger from './logger';

// ============================================================================
// Error Codes
// ============================================================================

export const ERROR_CODES = {
  // Validation Errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  CONTENT_TOO_LONG: 'CONTENT_TOO_LONG',

  // Authentication Errors (401)
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Authorization Errors (403)
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ACCESS_DENIED: 'ACCESS_DENIED',
  BLOCKED_USER: 'BLOCKED_USER',
  PRIVATE_CONTENT: 'PRIVATE_CONTENT',

  // Not Found Errors (404)
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  POST_NOT_FOUND: 'POST_NOT_FOUND',
  COMMENT_NOT_FOUND: 'COMMENT_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  STORY_NOT_FOUND: 'STORY_NOT_FOUND',

  // Conflict Errors (409)
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  ALREADY_LIKED: 'ALREADY_LIKED',
  ALREADY_FOLLOWING: 'ALREADY_FOLLOWING',
  ALREADY_BLOCKED: 'ALREADY_BLOCKED',

  // Rate Limiting (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // Server Errors (500)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Service Unavailable (503)
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE',
} as const;

// ============================================================================
// Base Error Class
// ============================================================================

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    code: string,
    statusCode: number,
    message: string,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================================================
// Specific Error Classes
// ============================================================================

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(ERROR_CODES.VALIDATION_ERROR, 400, message, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', code?: string) {
    super(code || ERROR_CODES.AUTHENTICATION_REQUIRED, 401, message);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', code?: string) {
    super(code || ERROR_CODES.INSUFFICIENT_PERMISSIONS, 403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', code: string = ERROR_CODES.RESOURCE_NOT_FOUND) {
    super(code, 404, `${resource} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists', code?: string) {
    super(code || ERROR_CODES.RESOURCE_ALREADY_EXISTS, 409, message);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests, please try again later') {
    super(ERROR_CODES.RATE_LIMIT_EXCEEDED, 429, message);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', details?: any) {
    super(
      ERROR_CODES.DATABASE_ERROR,
      500,
      message,
      details,
      false // Not operational - indicates system issue
    );
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string = 'External service error', details?: any) {
    super(ERROR_CODES.EXTERNAL_SERVICE_ERROR, 500, `${service}: ${message}`, details, false);
  }
}

// ============================================================================
// Error Response Formatter
// ============================================================================

/**
 * Formats an error into a standardized API response
 */
export function formatErrorResponse(
  error: Error | AppError,
  requestId: string = 'unknown'
): APIResponse {
  let statusCode = 500;
  let errorCode: string = ERROR_CODES.INTERNAL_SERVER_ERROR;
  let message = 'An unexpected error occurred';
  let details: any = undefined;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    message = error.message;
    details = error.details;
  } else {
    // Log unexpected errors
    logger.error('Unexpected error', {
      error: error.message,
      stack: error.stack,
      requestId,
    });
  }

  const apiError: APIError = {
    code: errorCode,
    message,
    ...(details && { details }),
  };

  return {
    success: false,
    error: apiError,
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: requestId,
      version: 'v1',
    },
  };
}

/**
 * Sends an error response
 */
export function sendErrorResponse(
  res: Response,
  error: Error | AppError,
  requestId?: string
): Response {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const response = formatErrorResponse(error, requestId);

  return res.status(statusCode).json(response);
}

// ============================================================================
// Error Handler Middleware
// ============================================================================

/**
 * Express error handling middleware
 * Should be registered last in the middleware chain
 */
export function errorHandler(
  error: Error | AppError,
  req: any,
  res: Response,
  next: any
): Response {
  const requestId = req.requestId || 'unknown';

  // Log operational errors at info level, system errors at error level
  if (error instanceof AppError && error.isOperational) {
    logger.info('Operational error', {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      requestId,
      userId: req.user?.id,
      path: req.path,
    });
  } else {
    logger.error('System error', {
      error: error.message,
      stack: error.stack,
      requestId,
      userId: req.user?.id,
      path: req.path,
    });
  }

  return sendErrorResponse(res, error, requestId);
}

// ============================================================================
// Async Handler Wrapper
// ============================================================================

/**
 * Wraps async route handlers to catch errors and pass to error middleware
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn: Function) {
  return (req: any, res: Response, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// Error Assertion Helpers
// ============================================================================

/**
 * Asserts that a value is truthy, throws error otherwise
 */
export function assert(condition: any, error: AppError): asserts condition {
  if (!condition) {
    throw error;
  }
}

/**
 * Asserts that a resource exists, throws NotFoundError otherwise
 */
export function assertExists<T>(
  resource: T | null | undefined,
  resourceName: string,
  code?: string
): asserts resource is T {
  if (!resource) {
    throw new NotFoundError(resourceName, code);
  }
}

/**
 * Asserts that user has access to resource, throws AuthorizationError otherwise
 */
export function assertAccess(
  hasAccess: boolean,
  message: string = 'Access denied'
): asserts hasAccess {
  if (!hasAccess) {
    throw new AuthorizationError(message, ERROR_CODES.ACCESS_DENIED);
  }
}

/**
 * Asserts that user is authenticated
 */
export function assertAuthenticated(
  user: any,
  message: string = 'Authentication required'
): asserts user {
  if (!user) {
    throw new AuthenticationError(message);
  }
}
