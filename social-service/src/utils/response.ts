import { Response } from 'express';

// Error codes enum
export const ErrorCodes = {
  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Authentication errors (401)
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_ACCESS_DENIED: 'RESOURCE_ACCESS_DENIED',

  // Resource errors (404)
  NOT_FOUND: 'NOT_FOUND',
  POST_NOT_FOUND: 'POST_NOT_FOUND',
  COMMENT_NOT_FOUND: 'COMMENT_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  STORY_NOT_FOUND: 'STORY_NOT_FOUND',
  CONNECTION_NOT_FOUND: 'CONNECTION_NOT_FOUND',

  // Conflict errors (409)
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  ALREADY_LIKED: 'ALREADY_LIKED',
  CONNECTION_EXISTS: 'CONNECTION_EXISTS',

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

interface ResponseMetadata {
  timestamp: string;
  service: string;
  requestId?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface SuccessResponseOptions<T> {
  data: T;
  message?: string;
  pagination?: PaginationInfo;
  requestId?: string;
}

interface ErrorResponseOptions {
  code: ErrorCode;
  message: string;
  details?: unknown;
  requestId?: string;
}

const SERVICE_NAME = 'social-service';

function createMetadata(requestId?: string): ResponseMetadata {
  return {
    timestamp: new Date().toISOString(),
    service: SERVICE_NAME,
    ...(requestId && { requestId }),
  };
}

/**
 * Send a successful response
 */
export function sendSuccess<T>(
  res: Response,
  options: SuccessResponseOptions<T>,
  statusCode = 200
): void {
  const response = {
    success: true,
    data: options.data,
    ...(options.message && { message: options.message }),
    metadata: createMetadata(options.requestId),
    ...(options.pagination && { pagination: options.pagination }),
  };

  res.status(statusCode).json(response);
}

/**
 * Send a created response (201)
 */
export function sendCreated<T>(res: Response, options: SuccessResponseOptions<T>): void {
  sendSuccess(res, options, 201);
}

/**
 * Send an error response
 */
export function sendError(res: Response, options: ErrorResponseOptions, statusCode = 500): void {
  const response = {
    success: false,
    error: {
      code: options.code,
      message: options.message,
      ...(options.details && { details: options.details }),
    },
    metadata: createMetadata(options.requestId),
  };

  res.status(statusCode).json(response);
}

/**
 * Send a validation error (400)
 */
export function sendValidationError(
  res: Response,
  message: string,
  details?: unknown,
  requestId?: string
): void {
  sendError(res, { code: ErrorCodes.VALIDATION_ERROR, message, details, requestId }, 400);
}

/**
 * Send an authentication error (401)
 */
export function sendAuthError(
  res: Response,
  message = 'Authentication required',
  requestId?: string
): void {
  sendError(res, { code: ErrorCodes.AUTHENTICATION_REQUIRED, message, requestId }, 401);
}

/**
 * Send a forbidden error (403)
 */
export function sendForbidden(
  res: Response,
  message = 'You do not have permission to perform this action',
  requestId?: string
): void {
  sendError(res, { code: ErrorCodes.FORBIDDEN, message, requestId }, 403);
}

/**
 * Send a not found error (404)
 */
export function sendNotFound(
  res: Response,
  code: ErrorCode = ErrorCodes.NOT_FOUND,
  message = 'Resource not found',
  requestId?: string
): void {
  sendError(res, { code, message, requestId }, 404);
}

/**
 * Send a conflict error (409)
 */
export function sendConflict(
  res: Response,
  code: ErrorCode = ErrorCodes.ALREADY_EXISTS,
  message = 'Resource already exists',
  requestId?: string
): void {
  sendError(res, { code, message, requestId }, 409);
}

/**
 * Send a rate limit error (429)
 */
export function sendRateLimitError(res: Response, requestId?: string): void {
  sendError(
    res,
    {
      code: ErrorCodes.RATE_LIMIT_EXCEEDED,
      message: 'Too many requests, please try again later',
      requestId,
    },
    429
  );
}

/**
 * Send an internal server error (500)
 */
export function sendInternalError(
  res: Response,
  message = 'An unexpected error occurred',
  requestId?: string
): void {
  sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message, requestId }, 500);
}

/**
 * Calculate pagination info
 */
export function calculatePagination(page: number, limit: number, total: number): PaginationInfo {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
  };
}
