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
    timeout: 60000, // 60 second timeout for backend requests
    proxyTimeout: 60000, // 60 second timeout for proxy
    pathRewrite:
      service.platform === 'supabase'
        ? path => {
            // Map API paths to Supabase function names
            const functionMappings: Record<string, string> = {
              // User management
              '/api/v1/users/search': '/functions/v1/search-users',
              '/api/v1/users/profile': '/functions/v1/get-user-profile',
              '/api/v1/user/profile': '/functions/v1/get-user-profile',
              '/api/v1/user/addresses': '/functions/v1/add-user-address',
              '/api/v1/user/switch-role': '/functions/v1/switch-role',

              // Hotels - Customer facing (public)
              '/api/v1/hotels/search': '/functions/v1/Search-hotels',
              '/api/v1/hotels/recommended': '/functions/v1/get-recommended-hotels',
              '/api/v1/hotels/details': '/functions/v1/Get-hotel-details',
              '/api/v1/hotels/reviews': '/functions/v1/get-hotel-reviews',
              '/api/v1/hotels/favorites': '/functions/v1/get-user-favorites',
              '/api/v1/hotels/favorites/add': '/functions/v1/add-hotel-to-favorites',
              '/api/v1/hotels/favorites/remove': '/functions/v1/remove-hotel-from-favorites',

              // Hotel bookings
              '/api/v1/bookings': '/functions/v1/Get-user-bookings',
              '/api/v1/bookings/create': '/functions/v1/Create-booking',
              '/api/v1/bookings/cancel': '/functions/v1/cancel-booking',
              '/api/v1/bookings/modify': '/functions/v1/modify-booking',
              '/api/v1/bookings/details': '/functions/v1/get-booking-details',
              '/api/v1/bookings/price': '/functions/v1/Calculate-booking-price',

              // Room availability
              '/api/v1/rooms/availability': '/functions/v1/check-room-availability',
              '/api/v1/rooms/types': '/functions/v1/get-room-types',

              // E-commerce - Customer facing (public for browsing)
              '/api/v1/cart': '/functions/v1/get-user-cart',
              '/api/v1/cart/add': '/functions/v1/add-to-cart',
              '/api/v1/cart/checkout': '/functions/v1/checkout-cart',

              // Payments
              '/api/v1/payments/initialize': '/functions/v1/Initialize-payment',
              '/api/v1/payments/verify': '/functions/v1/Verify-payment',
              '/api/v1/payments/intent': '/functions/v1/create-payment-intent',
              '/api/v1/wallet/topup': '/functions/v1/Topup-wallet',
              '/api/v1/wallet/pay': '/functions/v1/Pay-with-wallet',

              // Notifications
              '/api/v1/notifications/history': '/functions/v1/get-notification-history',
              '/api/v1/notifications/preferences': '/functions/v1/get-notification-preferences',
              '/api/v1/notifications/preferences/update':
                '/functions/v1/update-notification-preferences',
              '/api/v1/notifications/send': '/functions/v1/send-notification',

              // Ads
              '/api/v1/ads/campaigns': '/functions/v1/get-ad-campaigns',
              '/api/v1/ads/fetch': '/functions/v1/fetch-ads',
              '/api/v1/ads/my-campaigns': '/functions/v1/get-my-campaigns',

              // Rides/Taxi
              '/api/v1/rides/request': '/functions/v1/request-ride',
              '/api/v1/rides/estimate': '/functions/v1/get-ride-estimate',
              '/api/v1/rides/active': '/functions/v1/get-active-ride',
              '/api/v1/rides/history': '/functions/v1/get-ride-history',
              '/api/v1/rides/cancel': '/functions/v1/cancel-ride',
              '/api/v1/drivers/nearby': '/functions/v1/get-nearby-drivers',

              // Social
              '/api/v1/social/feed': '/functions/v1/get-social-feed',
              '/api/v1/social/posts': '/functions/v1/get-user-posts',
              '/api/v1/social/post/create': '/functions/v1/create-social-post',
              '/api/v1/social/stories': '/functions/v1/get-stories',
              '/api/v1/social/friends': '/functions/v1/get-friends',

              // Support
              '/api/v1/support/tickets': '/functions/v1/get-my-tickets',
              '/api/v1/support/tickets/create': '/functions/v1/create-support-ticket',
            };

            // Check for exact match first
            if (functionMappings[path]) {
              return functionMappings[path];
            }

            // Check for prefix matches
            for (const [apiPath, functionPath] of Object.entries(functionMappings)) {
              if (path.startsWith(apiPath)) {
                return path.replace(apiPath, functionPath);
              }
            }

            // Default: convert /api/v1/xxx to /functions/v1/xxx
            return `/functions/v1${path.replace('/api/v1', '')}`;
          }
        : path => {
            // For Railway services, strip the service-specific prefix
            // Social service: /api/v1/social/posts -> /api/v1/posts
            if (path.startsWith('/api/v1/social/')) {
              return path.replace('/api/v1/social', '/api/v1');
            }
            // Admin service: /api/v1/admin/postal-monitoring -> /api/postal-monitoring
            if (path.startsWith('/api/v1/admin/')) {
              return path.replace('/api/v1/admin', '/api');
            }
            // Admin service direct routes (GIGA Dashboard API)
            // These routes are already in the correct format for the admin service
            if (
              path.startsWith('/api/dashboard/') ||
              path.startsWith('/api/postal-monitoring/') ||
              path.startsWith('/api/ads/') ||
              path.startsWith('/api/admin/') ||
              path.startsWith('/api/ecommerce/') ||
              path.startsWith('/api/taxi/') ||
              path.startsWith('/api/hotel/') ||
              path.startsWith('/api/media/') ||
              path.startsWith('/api/operations/') ||
              path.startsWith('/api/managers/')
            ) {
              return path; // Keep as-is - admin service expects these paths
            }
            // Search service: /api/v1/search/hotels -> /api/v1/search/hotels (no change)
            if (path.startsWith('/api/v1/search/')) {
              return path; // Keep as-is
            }
            // Products routes -> Search service: /api/v1/products/* -> /api/v1/search/products/*
            if (path.startsWith('/api/v1/products/')) {
              return path.replace('/api/v1/products', '/api/v1/search/products');
            }
            // Payment queue service: /api/v1/payment-queue -> /api/v1 (assuming it expects /api/v1)
            if (path.startsWith('/api/v1/payment-queue/')) {
              return path.replace('/api/v1/payment-queue', '/api/v1');
            }
            // Delivery service: /api/v1/delivery -> /api/v1 (assuming it expects /api/v1)
            if (path.startsWith('/api/v1/delivery/')) {
              return path.replace('/api/v1/delivery', '/api/v1');
            }
            // Notifications service: /api/v1/notifications -> /api/v1 (assuming it expects /api/v1)
            if (path.startsWith('/api/v1/notifications/')) {
              return path.replace('/api/v1/notifications', '/api/v1');
            }
            // Taxi realtime service: /api/v1/taxi-realtime -> /api/v1 (assuming it expects /api/v1)
            if (path.startsWith('/api/v1/taxi-realtime/')) {
              return path.replace('/api/v1/taxi-realtime', '/api/v1');
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

      // Re-stream the body for POST/PUT/PATCH requests
      // This is needed because express.json() consumes the body
      if (['POST', 'PUT', 'PATCH'].includes(authReq.method || '')) {
        const bodyData = JSON.stringify(authReq.body || {});
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onProxyRes: (_proxyRes, _clientReq, clientRes) => {
      (clientRes as Response).setHeader('X-Service-ID', service.id);
      (clientRes as Response).setHeader('X-Service-Platform', service.platform);
    },
    onError: (err, clientReq, clientRes) => {
      const authReq = clientReq as AuthenticatedRequest;
      const errorMessage = (err as Error).message;
      const errorCode = (err as NodeJS.ErrnoException).code;

      // Log the error with details
      logger.error('Proxy error', {
        requestId: authReq.id,
        serviceId: service.id,
        serviceName: service.name,
        error: errorMessage,
        errorCode,
        targetUrl: service.baseUrl,
      });

      // Determine appropriate error response based on error type
      let statusCode = 502;
      let responseCode = 'PROXY_ERROR';
      let responseMessage = `Error communicating with ${service.name}`;

      if (errorCode === 'ECONNRESET' || errorCode === 'ECONNREFUSED' || errorCode === 'ETIMEDOUT') {
        statusCode = 503;
        responseCode = 'SERVICE_UNAVAILABLE';
        responseMessage = `${service.name} is temporarily unavailable. Please try again in a moment.`;

        // Mark service as potentially unhealthy for circuit breaker
        logger.warn('Service connection failed - may be restarting', {
          serviceId: service.id,
          errorCode,
        });
      } else if (errorCode === 'ENOTFOUND') {
        statusCode = 503;
        responseCode = 'SERVICE_NOT_REACHABLE';
        responseMessage = `${service.name} could not be reached. Service may be deploying.`;
      }

      if (clientRes && 'headersSent' in clientRes && !(clientRes as Response).headersSent) {
        (clientRes as Response)
          .status(statusCode)
          .json(createErrorResponse(responseCode, responseMessage, authReq.id));
      }
    },
  };

  const proxy = createProxyMiddleware(proxyOptions);
  proxy(req, res, next);
};
