import type { NextFunction, Response } from 'express';
import { Options, createProxyMiddleware } from 'http-proxy-middleware';

import { serviceRegistry } from '../services/serviceRegistry.js';
import type { ApiResponse, AuthenticatedRequest } from '../types/index.js';
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

export const routingMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const service = serviceRegistry.findServiceForPath(req.path);

  if (!service) {
    logger.warn('No service found for path', {
      requestId: req.id,
      path: req.path,
      method: req.method,
    });

    res
      .status(404)
      .json(
        createErrorResponse('SERVICE_NOT_FOUND', 'No service available for this endpoint', req.id)
      );
    return;
  }

  if (!service.healthy) {
    logger.warn('Service unhealthy', {
      requestId: req.id,
      serviceId: service.id,
      serviceName: service.name,
    });

    res
      .status(503)
      .json(
        createErrorResponse(
          'SERVICE_UNAVAILABLE',
          `${service.name} is currently unavailable`,
          req.id
        )
      );
    return;
  }

  logger.info('Routing request', {
    requestId: req.id,
    path: req.path,
    method: req.method,
    serviceId: service.id,
    serviceName: service.name,
    platform: service.platform,
  });

  const proxyOptions: Options = {
    target: service.baseUrl,
    changeOrigin: true,
    pathRewrite:
      service.platform === 'supabase'
        ? path => `/functions/v1${path.replace('/api/v1', '')}`
        : path => {
            // For Railway services, strip the service-specific prefix
            // e.g., /api/v1/social/api-docs -> /api-docs
            // e.g., /api/v1/posts/123 -> /api/v1/posts/123
            if (path.startsWith('/api/v1/social/')) {
              return path.replace('/api/v1/social', '');
            }
            if (path.startsWith('/api/v1/admin/')) {
              return path.replace('/api/v1/admin', '');
            }
            if (path.startsWith('/api/v1/search/')) {
              return path.replace('/api/v1/search', '');
            }
            if (path.startsWith('/api/v1/payment-queue/')) {
              return path.replace('/api/v1/payment-queue', '');
            }
            if (path.startsWith('/api/v1/delivery/')) {
              return path.replace('/api/v1/delivery', '');
            }
            if (path.startsWith('/api/v1/notifications/')) {
              return path.replace('/api/v1/notifications', '');
            }
            if (path.startsWith('/api/v1/taxi-realtime/')) {
              return path.replace('/api/v1/taxi-realtime', '');
            }
            // Default: keep the path as-is
            return path;
          },
    onProxyReq: (proxyReq, clientReq) => {
      const authReq = clientReq as AuthenticatedRequest;

      // Add service headers
      if (service.headers) {
        Object.entries(service.headers).forEach(([key, value]) => {
          proxyReq.setHeader(key, value);
        });
      }

      // Forward authentication token
      if (authReq.authToken) {
        proxyReq.setHeader('Authorization', `Bearer ${authReq.authToken}`);
      }

      // Forward user context for Railway services
      if (service.platform === 'railway' && authReq.user) {
        proxyReq.setHeader('X-User-ID', authReq.user.id);
        proxyReq.setHeader('X-User-Email', authReq.user.email);
        proxyReq.setHeader('X-User-Role', authReq.user.role);
      }

      // Add request ID for tracing
      if (authReq.id) {
        proxyReq.setHeader('X-Request-ID', authReq.id);
      }
    },
    onProxyRes: (_proxyRes, _clientReq, clientRes) => {
      (clientRes as Response).setHeader('X-Service-ID', service.id);
      (clientRes as Response).setHeader('X-Service-Platform', service.platform);
    },
    onError: (err, clientReq, clientRes) => {
      const authReq = clientReq as AuthenticatedRequest;
      logger.error('Proxy error', {
        requestId: authReq.id,
        serviceId: service.id,
        error: (err as Error).message,
      });

      if (clientRes && 'headersSent' in clientRes && !(clientRes as Response).headersSent) {
        (clientRes as Response)
          .status(502)
          .json(
            createErrorResponse(
              'PROXY_ERROR',
              `Error communicating with service: ${(err as Error).message}`,
              authReq.id
            )
          );
      }
    },
  };

  const proxy = createProxyMiddleware(proxyOptions);
  proxy(req, res, next);
};
