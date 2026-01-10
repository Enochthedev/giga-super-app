import type { NextFunction, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import type { AuthenticatedRequest } from '../types/index.js';
import { logger } from '../utils/logger.js';

export const requestLogger = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  // Generate request ID
  req.id = (req.headers['x-request-id'] as string) ?? uuidv4();
  req.startTime = Date.now();

  // Log incoming request
  logger.info('Incoming request', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    query: req.query,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime ?? Date.now());

    logger.info('Request completed', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
    });
  });

  next();
};
