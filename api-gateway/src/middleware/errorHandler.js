import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.id,
  });

  // Default error response
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = err.message;
  } else if (err.name === 'UnauthorizedError' || err.message.includes('Unauthorized')) {
    statusCode = 401;
    errorCode = 'AUTHENTICATION_ERROR';
    message = 'Authentication required or invalid';
  } else if (err.name === 'ForbiddenError' || err.message.includes('Forbidden')) {
    statusCode = 403;
    errorCode = 'AUTHORIZATION_ERROR';
    message = 'Insufficient permissions';
  } else if (err.name === 'NotFoundError' || err.message.includes('Not Found')) {
    statusCode = 404;
    errorCode = 'RESOURCE_NOT_FOUND';
    message = 'The requested resource was not found';
  } else if (err.name === 'ConflictError' || err.message.includes('Conflict')) {
    statusCode = 409;
    errorCode = 'CONFLICT';
    message = 'Resource conflict occurred';
  } else if (err.name === 'TooManyRequestsError' || err.message.includes('Too Many Requests')) {
    statusCode = 429;
    errorCode = 'RATE_LIMIT_EXCEEDED';
    message = 'Too many requests. Please try again later.';
  } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    statusCode = 502;
    errorCode = 'SERVICE_UNAVAILABLE';
    message = 'Downstream service unavailable';
  } else if (err.code === 'ETIMEDOUT') {
    statusCode = 504;
    errorCode = 'GATEWAY_TIMEOUT';
    message = 'Request timeout';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err.details,
      }),
    },
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: req.id || 'unknown',
      version: '1.0.0',
    },
  });
};
