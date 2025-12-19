import { createProxyMiddleware } from 'http-proxy-middleware';
import { serviceRegistry } from '../services/serviceRegistry.js';
import { logger } from '../utils/logger.js';

export const routingMiddleware = (req, res, next) => {
  // Find the appropriate service for this request
  const service = serviceRegistry.findServiceForPath(req.path);

  if (!service) {
    logger.warn('No service found for path', {
      requestId: req.id,
      path: req.path,
      method: req.method,
    });

    return res.status(404).json({
      success: false,
      error: {
        code: 'SERVICE_NOT_FOUND',
        message: 'No service available for this endpoint',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.id,
        version: '1.0.0',
      },
    });
  }

  // Check if service is healthy
  if (!service.healthy) {
    logger.warn('Service unhealthy', {
      requestId: req.id,
      serviceId: service.id,
      serviceName: service.name,
    });

    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: `${service.name} is currently unavailable`,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.id,
        version: '1.0.0',
      },
    });
  }

  // Log routing decision
  logger.info('Routing request', {
    requestId: req.id,
    path: req.path,
    method: req.method,
    serviceId: service.id,
    serviceName: service.name,
    platform: service.platform,
  });

  // Create proxy based on service platform
  if (service.platform === 'supabase') {
    // Route to Supabase Edge Functions
    const proxy = createProxyMiddleware({
      target: service.baseUrl,
      changeOrigin: true,
      pathRewrite: path => {
        // Convert /api/v1/hotels/123 to /functions/v1/get-hotel-details
        // This is a simplified example - you'll need to implement proper path mapping
        return `/functions/v1${path.replace('/api/v1', '')}`;
      },
      onProxyReq: (proxyReq, req) => {
        // Add Supabase headers
        if (service.headers) {
          Object.entries(service.headers).forEach(([key, value]) => {
            proxyReq.setHeader(key, value);
          });
        }

        // Forward authentication token
        if (req.authToken) {
          proxyReq.setHeader('Authorization', `Bearer ${req.authToken}`);
        }

        // Add request ID for tracing
        proxyReq.setHeader('X-Request-ID', req.id);
      },
      onProxyRes: (proxyRes, req, res) => {
        // Add response headers
        res.set('X-Service-ID', service.id);
        res.set('X-Service-Platform', service.platform);
      },
      onError: (err, req, res) => {
        logger.error('Proxy error', {
          requestId: req.id,
          serviceId: service.id,
          error: err.message,
        });

        if (!res.headersSent) {
          res.status(502).json({
            success: false,
            error: {
              code: 'PROXY_ERROR',
              message: 'Error communicating with service',
            },
            metadata: {
              timestamp: new Date().toISOString(),
              request_id: req.id,
              version: '1.0.0',
            },
          });
        }
      },
    });

    return proxy(req, res, next);
  } else {
    // Route to Railway services
    const proxy = createProxyMiddleware({
      target: service.baseUrl,
      changeOrigin: true,
      pathRewrite: {
        '^/api/v1': '', // Remove /api/v1 prefix for Railway services
      },
      onProxyReq: (proxyReq, req) => {
        // Forward authentication token
        if (req.authToken) {
          proxyReq.setHeader('Authorization', `Bearer ${req.authToken}`);
        }

        // Forward user context
        if (req.user) {
          proxyReq.setHeader('X-User-ID', req.user.id);
          proxyReq.setHeader('X-User-Email', req.user.email);
          proxyReq.setHeader('X-User-Role', req.user.role);
        }

        // Add request ID for tracing
        proxyReq.setHeader('X-Request-ID', req.id);

        // Add service headers if configured
        if (service.headers) {
          Object.entries(service.headers).forEach(([key, value]) => {
            proxyReq.setHeader(key, value);
          });
        }
      },
      onProxyRes: (proxyRes, req, res) => {
        // Add response headers
        res.set('X-Service-ID', service.id);
        res.set('X-Service-Platform', service.platform);

        // Ensure consistent response format
        if (proxyRes.headers['content-type']?.includes('application/json')) {
          // Note: Response transformation would require buffering the response
          // For now, we rely on Railway services to return consistent format
        }
      },
      onError: (err, req, res) => {
        logger.error('Proxy error', {
          requestId: req.id,
          serviceId: service.id,
          error: err.message,
        });

        if (!res.headersSent) {
          res.status(502).json({
            success: false,
            error: {
              code: 'PROXY_ERROR',
              message: 'Error communicating with service',
            },
            metadata: {
              timestamp: new Date().toISOString(),
              request_id: req.id,
              version: '1.0.0',
            },
          });
        }
      },
    });

    return proxy(req, res, next);
  }
};
