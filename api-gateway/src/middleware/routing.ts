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
            // NOTE: Hotels, bookings, rooms, favorites, reviews, and management routes
            // are now handled by Railway hotels-service
            const functionMappings: Record<string, string> = {
              // User management
              '/api/v1/users/search': '/functions/v1/search-users',
              '/api/v1/users/profile': '/functions/v1/get-user-profile',
              '/api/v1/user/profile': '/functions/v1/get-user-profile',
              '/api/v1/user/addresses': '/functions/v1/add-user-address',
              '/api/v1/user/switch-role': '/functions/v1/switch-role',

              // E-commerce - Customer facing (public for browsing)
              '/api/v1/cart': '/functions/v1/get-user-cart',
              '/api/v1/cart/add': '/functions/v1/add-to-cart/add',
              '/api/v1/cart/item': '/functions/v1/add-to-cart/item',
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

              // Ads - User-facing operations (Supabase edge functions)
              '/api/v1/ads/campaigns': '/functions/v1/get-ad-campaigns',
              '/api/v1/ads/campaigns/create': '/functions/v1/create-ad-campaign',
              '/api/v1/ads/fetch': '/functions/v1/fetch-ads',
              '/api/v1/ads/my-campaigns': '/functions/v1/get-my-campaigns',
              '/api/v1/ads/analytics': '/functions/v1/get-ad-analytics',
              '/api/v1/ads/track': '/functions/v1/track-ad-event',
              '/api/v1/advertiser/profile': '/functions/v1/get-advertiser-profile',
              '/api/v1/advertiser/profile/create': '/functions/v1/create-advertiser-profile',

              // Rides/Taxi - ALL endpoints now handled by Railway taxi-realtime-service
              // The service implements all ride and driver endpoints
              // Removed all hardcoded Supabase mappings to allow service registry routing

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

            // Handle ride details with ride_id
            // /api/v1/rides/:ride_id -> /functions/v1/get-ride-details?ride_id=:ride_id
            const rideDetailMatch = path.match(/^\/api\/v1\/rides\/([a-f0-9-]{36})$/i);
            if (rideDetailMatch) {
              return `/functions/v1/get-ride-details?ride_id=${rideDetailMatch[1]}`;
            }

            // Handle ride accept with ride_id
            // /api/v1/rides/:ride_id/accept -> /functions/v1/accept-ride?ride_id=:ride_id
            const rideAcceptMatch = path.match(/^\/api\/v1\/rides\/([a-f0-9-]{36})\/accept$/i);
            if (rideAcceptMatch) {
              return `/functions/v1/accept-ride?ride_id=${rideAcceptMatch[1]}`;
            }

            // Handle ride start with ride_id
            // /api/v1/rides/:ride_id/start -> /functions/v1/start-ride?ride_id=:ride_id
            const rideStartMatch = path.match(/^\/api\/v1\/rides\/([a-f0-9-]{36})\/start$/i);
            if (rideStartMatch) {
              return `/functions/v1/start-ride?ride_id=${rideStartMatch[1]}`;
            }

            // Handle ride complete with ride_id
            // /api/v1/rides/:ride_id/complete -> /functions/v1/complete-ride?ride_id=:ride_id
            const rideCompleteMatch = path.match(/^\/api\/v1\/rides\/([a-f0-9-]{36})\/complete$/i);
            if (rideCompleteMatch) {
              return `/functions/v1/complete-ride?ride_id=${rideCompleteMatch[1]}`;
            }

            // Handle ride cancel with ride_id
            // /api/v1/rides/:ride_id/cancel -> /functions/v1/cancel-ride?ride_id=:ride_id
            const rideCancelMatch = path.match(/^\/api\/v1\/rides\/([a-f0-9-]{36})\/cancel$/i);
            if (rideCancelMatch) {
              return `/functions/v1/cancel-ride?ride_id=${rideCancelMatch[1]}`;
            }

            // Handle payment verification with transaction_id
            // /api/v1/payments/:transaction_id/verify -> /functions/v1/Verify-payment?transactionId=:transaction_id
            const paymentVerifyMatch = path.match(
              /^\/api\/v1\/payments\/([a-zA-Z0-9_-]+)\/verify$/i
            );
            if (paymentVerifyMatch) {
              return `/functions/v1/Verify-payment?transactionId=${paymentVerifyMatch[1]}`;
            }

            // Handle user profile with user_id
            // /api/v1/users/:user_id -> /functions/v1/get-user-profile?userId=:user_id
            const userProfileMatch = path.match(/^\/api\/v1\/users\/([a-f0-9-]{36})$/i);
            if (userProfileMatch) {
              return `/functions/v1/get-user-profile?userId=${userProfileMatch[1]}`;
            }

            // Handle support ticket details with ticket_id
            // /api/v1/support/tickets/:ticket_id -> /functions/v1/get-ticket-details?ticketId=:ticket_id
            const ticketDetailMatch = path.match(/^\/api\/v1\/support\/tickets\/([a-f0-9-]{36})$/i);
            if (ticketDetailMatch) {
              return `/functions/v1/get-ticket-details?ticketId=${ticketDetailMatch[1]}`;
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
              // E5b: legacy "friends" alias -> the real connections router
              if (path === '/api/v1/social/friends') {
                return '/api/v1/connections';
              }
              return path.replace('/api/v1/social', '/api/v1');
            }
            // Admin service: legacy edge-fn paths -> their admin-service equivalents
            if (path === '/api/v1/admin/dashboard-stats') {
              return '/api/dashboard/stats';
            }
            if (path === '/api/v1/roles/review') {
              return '/api/roles/review';
            }
            if (path === '/api/v1/admin/create-user' || path === '/api/v1/admin/manage-users') {
              return '/api/admin/users';
            }
            // V6: payment-queue-service mounts these at /api/v1/admin/payments, so the
            // generic '/api/v1/admin' -> '/api' rewrite below must not rewrite them
            // (it produced /api/payments/... and the service answered 404 Route not found).
            if (path.startsWith('/api/v1/admin/payments')) {
              return path;
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
              path.startsWith('/api/postal/') ||
              path.startsWith('/api/delivery/') ||
              path.startsWith('/api/ads/') ||
              path.startsWith('/api/admin/') ||
              path.startsWith('/api/ecommerce/') ||
              path.startsWith('/api/taxi/') ||
              path.startsWith('/api/hotel/') ||
              path.startsWith('/api/media/') ||
              path.startsWith('/api/operations/') ||
              path.startsWith('/api/managers/') ||
              path.startsWith('/api/nipost-admin/') ||
              path.startsWith('/api/pending-entries/')
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
            // Payment queue service: /api/v1/payments, /api/v1/wallet -> keep as-is
            if (path.startsWith('/api/v1/payments/') || path.startsWith('/api/v1/wallet/')) {
              return path; // Service expects these paths
            }
            // Legacy payment-queue prefix: /api/v1/payment-queue -> /api/v1
            if (path.startsWith('/api/v1/payment-queue/')) {
              return path.replace('/api/v1/payment-queue', '/api/v1');
            }
            // Delivery service: /api/v1/delivery -> /api/v1 (assuming it expects /api/v1)
            if (path.startsWith('/api/v1/delivery/')) {
              return path.replace('/api/v1/delivery', '/api/v1');
            }
            // Notifications service mounts /api/v1/notifications, /api/v1/preferences,
            // /api/v1/templates directly — forward unchanged (do NOT strip the prefix).
            if (
              path.startsWith('/api/v1/notifications/') ||
              path.startsWith('/api/v1/preferences/') ||
              path.startsWith('/api/v1/templates/')
            ) {
              return path;
            }
            // Taxi realtime service: /api/v1/taxi-realtime -> /api (service expects /api)
            if (path.startsWith('/api/v1/taxi-realtime/')) {
              return path.replace('/api/v1/taxi-realtime', '/api');
            }
            // Taxi/Rides routes -> Taxi realtime service
            // Support both /api/v1/rides and /api/rides paths
            if (path.startsWith('/api/v1/rides/')) {
              return path.replace('/api/v1/rides', '/api/rides');
            }
            if (path.startsWith('/api/v1/ride/')) {
              return path.replace('/api/v1/ride', '/api/rides');
            }
            if (path.startsWith('/api/v1/drivers/')) {
              return path.replace('/api/v1/drivers', '/api/drivers');
            }
            if (path.startsWith('/api/v1/driver/')) {
              return path.replace('/api/v1/driver', '/api/drivers');
            }
            // Direct /api/rides and /api/drivers paths (no v1) - keep as-is
            if (path.startsWith('/api/rides/') || path.startsWith('/api/drivers/')) {
              return path; // Already in correct format for taxi-realtime-service
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
        // V7: a user's admin rights often live in the roles array (or in the service's own
        // permission tables), not in the single `role` claim. Forward both so downstream
        // services can authorize correctly instead of seeing the default 'user'.
        if (Array.isArray(authReq.user.roles) && authReq.user.roles.length > 0) {
          proxyReq.setHeader('X-User-Roles', authReq.user.roles.join(','));
        }
      }

      // Add request ID for tracing
      if (authReq.id) {
        proxyReq.setHeader('X-Request-ID', authReq.id);
      }

      // Re-stream the body for POST/PUT/PATCH requests.
      // This is needed because express.json() has already consumed the stream.
      //
      // The condition must NOT test for a non-empty body. A request sent with
      // `Content-Type: application/json` and a body of `{}` (or `[]`) parses to an
      // empty object, and skipping the write left the upstream waiting forever for
      // the bytes the forwarded Content-Length header still promised — the request
      // hung with no response and no timeout. Only skip when express.json() never
      // parsed anything (no JSON content-type: multipart, urlencoded, bodyless),
      // in which case the original stream is still intact and pipes through normally.
      const contentType = String(authReq.headers['content-type'] ?? '');
      const parsedJsonBody =
        ['POST', 'PUT', 'PATCH'].includes(authReq.method || '') &&
        contentType.includes('json') &&
        authReq.body !== undefined &&
        authReq.body !== null;

      if (parsedJsonBody) {
        const bodyData = JSON.stringify(authReq.body);
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
