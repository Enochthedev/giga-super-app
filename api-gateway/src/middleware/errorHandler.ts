import type { NextFunction, Response } from 'express';

import type { ApiResponse, AuthenticatedRequest, ErrorMiddleware } from '../types/index.js';
import { logger } from '../utils/logger.js';

const createErrorResponse = (code: string, message: string, requestId?: string): ApiResponse => ({
  success: false,
  error: { code, message },
  metadata: {
    timestamp: new Date().toISOString(),
    request_id: requestId,
    version: '1.0.0',
  },
});

export const errorHandler: ErrorMiddleware = (
  error: Error,
  req: AuthenticatedRequest,
  res: Response,
  _next: NextFunction
): void => {
  // Handle JSON parsing errors from body-parser
  const parseError = error as Error & { status?: number; body?: string };
  if (error instanceof SyntaxError && parseError.status === 400 && parseError.body !== undefined) {
    logger.error('Invalid JSON payload', {
      requestId: req.id,
      error: error.message,
      path: req.path,
      method: req.method,
    });

    res
      .status(400)
      .json(createErrorResponse('INVALID_JSON', 'Invalid JSON payload received', req.id));
    return;
  }

  logger.error('Unhandled error', {
    requestId: req.id,
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Don't expose internal errors in production
  const message =
    process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message;

  res.status(500).json(createErrorResponse('INTERNAL_SERVER_ERROR', message, req.id));
};

export const notFoundHandler = (req: AuthenticatedRequest, res: Response): void => {
  res
    .status(404)
    .json(
      createErrorResponse('ENDPOINT_NOT_FOUND', 'The requested endpoint was not found.', req.id)
    );
};
