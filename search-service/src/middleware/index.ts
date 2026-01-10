/**
 * Middleware exports for Search Service
 */

import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PerformanceMonitor, createRequestLogger } from '../utils/logger.js';

// Request ID middleware
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// Logger middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.id;

  req.logger = createRequestLogger(requestId, userId);

  req.logger.http('Request started', {
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });

  next();
};

// Performance monitoring middleware
export const performanceMonitor = (req: Request, res: Response, next: NextFunction): void => {
  const monitor = PerformanceMonitor.start(req.logger!);

  res.on('finish', () => {
    const executionTime = monitor.end('Request completed');

    req.logger?.logPerformanceMetrics({
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime: executionTime,
      memoryUsage: process.memoryUsage().heapUsed,
    });
  });

  next();
};

// Error handling middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  req.logger?.logApiError(req.path, 500, error);

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isDevelopment ? error.message : 'An internal server error occurred',
      ...(isDevelopment && { stack: error.stack }),
    },
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: (req.headers['x-request-id'] as string) || 'unknown',
      version: '1.0.0',
    },
  });
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response): void => {
  req.logger?.warn('Endpoint not found', {
    method: req.method,
    url: req.url,
  });

  res.status(404).json({
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.path} not found`,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: (req.headers['x-request-id'] as string) || 'unknown',
      version: '1.0.0',
    },
  });
};

// CORS headers
export const corsHeaders = (req: Request, res: Response, next: NextFunction): void => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key, X-Request-ID'
  );
  res.header(
    'Access-Control-Expose-Headers',
    'X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset'
  );

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
};

// Security headers
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.header('Content-Security-Policy', "default-src 'self'");
  next();
};

// Request validation middleware
export const validateContentType = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.headers['content-type'];

    if (!contentType || !contentType.includes('application/json')) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CONTENT_TYPE',
          message: 'Content-Type must be application/json',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: (req.headers['x-request-id'] as string) || 'unknown',
          version: '1.0.0',
        },
      });
      return;
    }
  }

  next();
};

// Request size limit
export const requestSizeLimit = (maxSize: number = 1024 * 1024) => {
  // 1MB default
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);

    if (contentLength > maxSize) {
      req.logger?.logSecurityEvent('Request size limit exceeded', 'medium', {
        contentLength,
        maxSize,
      });

      res.status(413).json({
        success: false,
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: `Request size exceeds limit of ${maxSize} bytes`,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: (req.headers['x-request-id'] as string) || 'unknown',
          version: '1.0.0',
        },
      });
      return;
    }

    next();
  };
};

// Health check middleware
export const healthCheck = (req: Request, res: Response, next: NextFunction): void => {
  if (req.path === '/health' || req.path === '/health/') {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        service: 'search-service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: (req.headers['x-request-id'] as string) || 'unknown',
        version: '1.0.0',
      },
    });
    return;
  }

  next();
};

export * from './auth.js';
