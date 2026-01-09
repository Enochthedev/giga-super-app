/**
 * Custom error classes for the delivery service
 */

export class ServiceError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, code: string, statusCode: number, details?: any) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServiceError);
    }
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ServiceError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ServiceError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ServiceError {
  constructor(message: string, resourceType?: string) {
    super(message, 'NOT_FOUND', 404, { resourceType });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ServiceError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', 409, details);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends ServiceError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}

export class DatabaseError extends ServiceError {
  constructor(message: string, originalError?: Error) {
    super(message, 'DATABASE_ERROR', 500, { originalError: originalError?.message });
    this.name = 'DatabaseError';
  }
}

export class ExternalServiceError extends ServiceError {
  constructor(message: string, serviceName: string, originalError?: Error) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, {
      serviceName,
      originalError: originalError?.message,
    });
    this.name = 'ExternalServiceError';
  }
}

/**
 * Error code constants
 */
export const ERROR_CODES = {
  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_COORDINATES: 'INVALID_COORDINATES',
  INVALID_COORDINATE_VALUES: 'INVALID_COORDINATE_VALUES',

  // Authentication errors (401)
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Authorization errors (403)
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  UNAUTHORIZED_ASSIGNMENT: 'UNAUTHORIZED_ASSIGNMENT',

  // Resource errors (404)
  NOT_FOUND: 'NOT_FOUND',
  ASSIGNMENT_NOT_FOUND: 'ASSIGNMENT_NOT_FOUND',
  COURIER_NOT_FOUND: 'COURIER_NOT_FOUND',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  NO_AVAILABLE_COURIERS: 'NO_AVAILABLE_COURIERS',
  COURIER_NOT_AVAILABLE: 'COURIER_NOT_AVAILABLE',

  // Conflict errors (409)
  CONFLICT: 'CONFLICT',
  ASSIGNMENT_EXISTS: 'ASSIGNMENT_EXISTS',
  COURIER_OVERLOADED: 'COURIER_OVERLOADED',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server errors (500)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  COURIER_SEARCH_FAILED: 'COURIER_SEARCH_FAILED',
  ASSIGNMENT_CREATION_FAILED: 'ASSIGNMENT_CREATION_FAILED',

  // External service errors (502)
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  GOOGLE_MAPS_ERROR: 'GOOGLE_MAPS_ERROR',
  NOTIFICATION_SERVICE_ERROR: 'NOTIFICATION_SERVICE_ERROR',
} as const;

/**
 * Format database errors for API responses
 */
export function formatDatabaseError(error: any): { code: string; message: string; details?: any } {
  // PostgreSQL error codes
  const pgErrorCodes: Record<string, { code: string; message: string }> = {
    '23505': { code: 'DUPLICATE_ENTRY', message: 'Resource already exists' },
    '23503': { code: 'FOREIGN_KEY_VIOLATION', message: 'Referenced resource not found' },
    '23502': { code: 'NOT_NULL_VIOLATION', message: 'Required field is missing' },
    '23514': { code: 'CHECK_VIOLATION', message: 'Data validation failed' },
    '42P01': { code: 'TABLE_NOT_FOUND', message: 'Database table not found' },
    '42703': { code: 'COLUMN_NOT_FOUND', message: 'Database column not found' },
  };

  if (error?.code && pgErrorCodes[error.code]) {
    const errorInfo = pgErrorCodes[error.code];
    if (errorInfo) {
      return {
        code: errorInfo.code,
        message: errorInfo.message,
        details: {
          constraint: error.constraint,
          table: error.table,
          column: error.column,
        },
      };
    }
  }

  // Supabase specific errors
  if (error?.message?.includes('JWT')) {
    return {
      code: ERROR_CODES.AUTHENTICATION_ERROR,
      message: 'Authentication token is invalid or expired',
    };
  }

  if (error?.message?.includes('RLS')) {
    return {
      code: ERROR_CODES.AUTHORIZATION_ERROR,
      message: 'Access denied by security policy',
    };
  }

  // Generic database error
  return {
    code: ERROR_CODES.DATABASE_ERROR,
    message: 'Database operation failed',
    details: {
      originalMessage: error?.message,
    },
  };
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: ServiceError | Error): boolean {
  if (error instanceof ServiceError) {
    // Don't retry client errors (4xx) except for rate limiting
    if (error.statusCode >= 400 && error.statusCode < 500) {
      return error.code === ERROR_CODES.RATE_LIMIT_EXCEEDED;
    }

    // Retry server errors (5xx)
    return error.statusCode >= 500;
  }

  // Retry unknown errors
  return true;
}

/**
 * Get retry delay in milliseconds with exponential backoff
 */
export function getRetryDelay(attemptNumber: number, baseDelayMs: number = 1000): number {
  const maxDelay = 30000; // 30 seconds max
  const delay = baseDelayMs * Math.pow(2, attemptNumber - 1);
  return Math.min(delay, maxDelay);
}

/**
 * Create error response object for API
 */
export function createErrorResponse(
  error: ServiceError | Error,
  requestId: string
): {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: string;
    request_id: string;
    version: string;
  };
} {
  if (error instanceof ServiceError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        version: '1.0.0',
      },
    };
  }

  return {
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      details:
        process.env['NODE_ENV'] === 'development' ? { originalMessage: error.message } : undefined,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: requestId,
      version: '1.0.0',
    },
  };
}

/**
 * Helper functions to create specific error types
 */
export function createAuthenticationError(message?: string): AuthenticationError {
  return new AuthenticationError(message);
}

export function createAuthorizationError(message?: string): AuthorizationError {
  return new AuthorizationError(message);
}

export function createValidationError(message: string, details?: any): ValidationError {
  return new ValidationError(message, details);
}

export function createNotFoundError(message: string, resourceType?: string): NotFoundError {
  return new NotFoundError(message, resourceType);
}

export function createConflictError(message: string, details?: any): ConflictError {
  return new ConflictError(message, details);
}

export function createExternalServiceError(
  serviceName: string,
  message: string,
  details?: any
): ExternalServiceError {
  return new ExternalServiceError(message, serviceName, details);
}
