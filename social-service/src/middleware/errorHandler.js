import logger from '../utils/logger.js';

/**
 * Global error handler middleware
 */
export const errorHandler = (error, req, res, next) => {
  // Log the error
  logger.error('Unhandled error', {
    requestId: req.requestId,
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Default error response
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details = null;

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    details = isDevelopment ? error.details : null;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    message = 'Authentication required';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
    message = 'Access denied';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = 'Resource not found';
  } else if (error.name === 'ConflictError') {
    statusCode = 409;
    errorCode = 'CONFLICT';
    message = 'Resource conflict';
  } else if (error.name === 'RateLimitError') {
    statusCode = 429;
    errorCode = 'RATE_LIMIT_EXCEEDED';
    message = 'Too many requests';
  }

  // Supabase specific errors
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique violation
        statusCode = 409;
        errorCode = 'DUPLICATE_RESOURCE';
        message = 'Resource already exists';
        break;
      case '23503': // Foreign key violation
        statusCode = 400;
        errorCode = 'INVALID_REFERENCE';
        message = 'Invalid resource reference';
        break;
      case '23514': // Check violation
        statusCode = 400;
        errorCode = 'CONSTRAINT_VIOLATION';
        message = 'Data constraint violation';
        break;
      case 'PGRST116': // Row not found
        statusCode = 404;
        errorCode = 'NOT_FOUND';
        message = 'Resource not found';
        break;
    }
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details && { details }),
      ...(isDevelopment && { stack: error.stack }),
    },
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: req.requestId,
      service: 'social-service',
    },
  });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res) => {
  logger.warn('Route not found', {
    requestId: req.requestId,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  res.status(404).json({
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: `Cannot ${req.method} ${req.url}`,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: req.requestId,
      service: 'social-service',
    },
  });
};

/**
 * Custom error classes
 */
export class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error {
  constructor(message = 'Too many requests') {
    super(message);
    this.name = 'RateLimitError';
  }
}
