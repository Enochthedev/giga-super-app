/**
 * Response Formatting Utilities
 * Ensures consistent API response format
 */

import { Response } from 'express';
import { APIResponse, PaginationMetadata } from '../types';

/**
 * Send a success response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  requestId: string,
  statusCode: number = 200,
  pagination?: PaginationMetadata
): Response {
  const response: APIResponse<T> = {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: requestId,
      version: 'v1',
    },
    ...(pagination && { pagination }),
  };

  return res.status(statusCode).json(response);
}

/**
 * Send a created response (201)
 */
export function sendCreated<T>(
  res: Response,
  data: T,
  requestId: string
): Response {
  return sendSuccess(res, data, requestId, 201);
}

/**
 * Send a no content response (204)
 */
export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

/**
 * Send a paginated response
 */
export function sendPaginated<T>(
  res: Response,
  data: T,
  pagination: PaginationMetadata,
  requestId: string
): Response {
  return sendSuccess(res, data, requestId, 200, pagination);
}
