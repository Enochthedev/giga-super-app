/**
 * Request ID Middleware
 * Generates unique request IDs for tracking
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Adds a unique request ID to each request
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Use existing request ID if provided, otherwise generate new one
  const requestId =
    (req.headers['x-request-id'] as string) || randomUUID();

  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
};
