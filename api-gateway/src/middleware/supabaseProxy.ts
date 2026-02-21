import axios from 'axios';
import { NextFunction, Request, Response } from 'express';

import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Supabase Function Proxy Middleware
 * Routes requests to Supabase Edge Functions for endpoints not yet migrated to Railway
 */

const SUPABASE_URL = config.supabaseUrl;
const SUPABASE_ANON_KEY = config.supabaseAnonKey;

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  logger.error('Supabase proxy configuration missing', {
    hasUrl: !!SUPABASE_URL,
    hasKey: !!SUPABASE_ANON_KEY,
  });
}

// Map API Gateway routes to Supabase function names
// NOTE: Hotels, Bookings, Rooms, Favorites, Reviews, and Management routes
// are now handled by Railway hotels-service and should NOT be in this map
const ROUTE_TO_FUNCTION_MAP: Record<string, string> = {
  // User Profile
  '/api/v1/users/profile': 'get-user-profile',
  '/api/v1/users/profile/update': 'update-user-profile',
  '/api/v1/users/profile/picture': 'upload-profile-picture',
  '/api/v1/users/address': 'add-user-address',
  '/api/v1/users/search': 'search-users',
  '/api/v1/user/profile': 'get-user-profile',
  '/api/v1/user/addresses': 'add-user-address',
  '/api/v1/user/switch-role': 'switch-role',

  // Rides/Taxi - Passenger
  '/api/v1/rides/request': 'request-ride',
  '/api/v1/rides/estimate': 'get-ride-estimate',
  '/api/v1/rides/active': 'get-active-ride',
  '/api/v1/rides/history': 'get-ride-history',
  '/api/v1/rides/cancel': 'cancel-ride',
  '/api/v1/rides/rate': 'rate-driver',
  '/api/v1/rides/:id': 'get-ride-details',
  '/api/v1/rides/:id/accept': 'accept-ride',
  '/api/v1/rides/:id/start': 'start-ride',
  '/api/v1/rides/:id/complete': 'complete-ride',
  '/api/v1/rides/:id/cancel': 'cancel-ride',
  '/api/v1/drivers/nearby': 'get-nearby-drivers',

  // Rides/Taxi - Driver
  '/api/v1/driver/rides/requests': 'get-ride-requests',
  '/api/v1/driver/rides/accept': 'accept-ride',
  '/api/v1/driver/rides/reject': 'reject-ride',
  '/api/v1/driver/rides/start': 'start-ride',
  '/api/v1/driver/rides/complete': 'complete-ride',
  '/api/v1/driver/location': 'update-location',
  '/api/v1/driver/availability': 'toggle-availability',
  '/api/v1/driver/earnings': 'get-earnings',
  '/api/v1/driver/analytics': 'get-ride-analytics',

  // Payments
  '/api/v1/payments/initialize': 'Initialize-payment',
  '/api/v1/payments/verify': 'Verify-payment',
  '/api/v1/payments/:id/verify': 'Verify-payment',
  '/api/v1/payments/intent': 'create-payment-intent',

  // Wallet
  '/api/v1/wallet/topup': 'Topup-wallet',
  '/api/v1/wallet/pay': 'Pay-with-wallet',
  '/api/v1/wallet/balance': 'Get-vendor-balance',

  // Cart/E-commerce
  '/api/v1/cart': 'get-user-cart',
  '/api/v1/cart/add': 'add-to-cart',
  '/api/v1/cart/item': 'add-to-cart',
  '/api/v1/cart/checkout': 'checkout-cart',

  // Notifications
  '/api/v1/notifications/history': 'get-notification-history',
  '/api/v1/notifications/preferences': 'get-notification-preferences',
  '/api/v1/notifications/preferences/update': 'update-notification-preferences',
  '/api/v1/notifications/send': 'send-notification',

  // Ads
  '/api/v1/ads/campaigns': 'get-ad-campaigns',
  '/api/v1/ads/fetch': 'fetch-ads',
  '/api/v1/ads/my-campaigns': 'get-my-campaigns',

  // Calls
  '/api/v1/calls/initiate': 'initiate-call',
  '/api/v1/calls/answer': 'answer-call',
  '/api/v1/calls/decline': 'decline-call',
  '/api/v1/calls/end': 'end-call',
  '/api/v1/calls/leave': 'leave-call',

  // Roles
  '/api/v1/roles/switch': 'switch-role',
  '/api/v1/roles/apply': 'apply-for-role',
  '/api/v1/roles/review': 'review-role-application',

  // Media
  '/api/v1/media/upload': 'upload-file',
  '/api/v1/media/process-image': 'process-image',

  // Support
  '/api/v1/support/tickets': 'get-my-tickets',
  '/api/v1/support/tickets/create': 'create-support-ticket',
  '/api/v1/support/tickets/:id': 'get-ticket-details',

  // Admin
  '/api/v1/admin/create-user': 'admin-create-user',
  '/api/v1/admin/dashboard-stats': 'admin-dashboard-stats',
  '/api/v1/admin/manage-users': 'admin-manage-users',

  // Social
  '/api/v1/social/feed': 'get-social-feed',
  '/api/v1/social/posts': 'get-user-posts',
  '/api/v1/social/post/create': 'create-social-post',
  '/api/v1/social/stories': 'get-stories',
  '/api/v1/social/friends': 'get-friends',

  // Vendors
  '/api/v1/vendors/apply': 'apply-vendor',
  '/api/v1/vendors/balance': 'Get-vendor-balance',
};

// Deprecated endpoints with migration info
// NOTE: Hotels endpoints are now handled by Railway hotels-service
const DEPRECATED_ENDPOINTS: Record<string, { newEndpoint: string; deprecationDate: string }> = {
  // Hotels search is now handled by hotels-service, not deprecated
};

/**
 * Proxy requests to Supabase Edge Functions
 */
export const supabaseProxy = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  try {
    // Check if this route should be proxied to Supabase
    const functionName = getFunctionNameFromRoute(req.path, req.method);

    if (!functionName) {
      // Not a Supabase route, continue to next middleware
      return next();
    }

    // Validate Supabase configuration
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      logger.error('Supabase configuration missing');
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Supabase proxy not configured',
        },
      });
    }

    // Check if endpoint is deprecated
    const deprecationInfo = DEPRECATED_ENDPOINTS[req.path];
    if (deprecationInfo) {
      res.setHeader('X-Deprecated', 'true');
      res.setHeader('X-New-Endpoint', deprecationInfo.newEndpoint);
      res.setHeader('X-Deprecation-Date', deprecationInfo.deprecationDate);

      logger.warn('Deprecated endpoint used', {
        path: req.path,
        newEndpoint: deprecationInfo.newEndpoint,
        user: (req as any).user?.id,
      });
    }

    logger.info('Proxying request to Supabase', {
      path: req.path,
      method: req.method,
      function: functionName,
      requestId: (req as any).id,
    });

    // Build Supabase function URL
    const supabaseFunctionUrl = `${SUPABASE_URL}/functions/v1/${functionName}`;

    // Extract path parameters (e.g., hotelId from /api/v1/hotels/:id/reviews)
    const pathParams = extractPathParams(req.path);

    // Merge path params with query params (path params take precedence)
    const mergedParams = { ...req.query, ...pathParams };

    // Forward request to Supabase
    const response = await axios({
      method: req.method,
      url: supabaseFunctionUrl,
      headers: {
        Authorization: req.headers.authorization || `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        'X-Request-ID': (req as any).id || '',
      },
      data: req.body,
      params: mergedParams,
      timeout: 30000, // 30 second timeout
      validateStatus: () => true, // Don't throw on any status code
    });

    const duration = Date.now() - startTime;

    // Log successful proxy
    logger.info('Supabase proxy completed', {
      path: req.path,
      function: functionName,
      status: response.status,
      duration,
      requestId: (req as any).id,
    });

    // Add proxy headers
    res.setHeader('X-Proxied-To', 'Supabase');
    res.setHeader('X-Proxy-Duration', duration.toString());

    // Forward response from Supabase
    res.status(response.status).json(response.data);
  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('Supabase proxy error', {
      error: error.message,
      path: req.path,
      status: error.response?.status,
      duration,
      requestId: (req as any).id,
      stack: error.stack,
    });

    // Forward error response from Supabase
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    // Handle timeout
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        success: false,
        error: {
          code: 'GATEWAY_TIMEOUT',
          message: 'Supabase function timed out',
        },
      });
    }

    // Generic error
    res.status(502).json({
      success: false,
      error: {
        code: 'BAD_GATEWAY',
        message: 'Failed to proxy request to Supabase',
      },
    });
  }
};

/**
 * Get Supabase function name from API Gateway route
 */
function getFunctionNameFromRoute(path: string, _method: string): string | null {
  // Direct mapping
  if (ROUTE_TO_FUNCTION_MAP[path]) {
    return ROUTE_TO_FUNCTION_MAP[path];
  }

  // Pattern matching for dynamic routes
  for (const [pattern, functionName] of Object.entries(ROUTE_TO_FUNCTION_MAP)) {
    const regex = new RegExp(`^${pattern.replace(/:[^/]+/g, '[^/]+')}$`);
    if (regex.test(path)) {
      return functionName;
    }
  }

  return null;
}

/**
 * Extract path parameters from a route pattern
 * NOTE: Hotel and booking path params removed - now handled by hotels-service
 */
export function extractPathParams(path: string): Record<string, string> {
  const params: Record<string, string> = {};

  // Extract ride ID from /api/v1/rides/:id patterns
  const rideIdMatch = path.match(/^\/api\/v1\/rides\/([a-f0-9-]{36})(\/.*)?$/i);
  if (rideIdMatch && rideIdMatch[1]) {
    params.rideId = rideIdMatch[1];
    params.ride_id = rideIdMatch[1]; // Some functions use ride_id
  }

  // Extract user ID from /api/v1/users/:id patterns
  const userIdMatch = path.match(/^\/api\/v1\/users\/([a-f0-9-]{36})(\/.*)?$/i);
  if (userIdMatch && userIdMatch[1]) {
    params.userId = userIdMatch[1];
  }

  // Extract order ID from /api/v1/orders/:id patterns
  const orderIdMatch = path.match(/^\/api\/v1\/orders\/([a-f0-9-]{36})(\/.*)?$/i);
  if (orderIdMatch && orderIdMatch[1]) {
    params.orderId = orderIdMatch[1];
  }

  // Extract product ID from /api/v1/products/:id patterns
  const productIdMatch = path.match(/^\/api\/v1\/products\/([a-f0-9-]{36})(\/.*)?$/i);
  if (productIdMatch && productIdMatch[1]) {
    params.productId = productIdMatch[1];
  }

  // Extract payment ID from /api/v1/payments/:id patterns
  const paymentIdMatch = path.match(/^\/api\/v1\/payments\/([a-f0-9-]{36})(\/.*)?$/i);
  if (paymentIdMatch && paymentIdMatch[1]) {
    params.paymentId = paymentIdMatch[1];
  }

  // Extract transaction ID from /api/v1/transactions/:id patterns
  const transactionIdMatch = path.match(/^\/api\/v1\/transactions\/([a-f0-9-]{36})(\/.*)?$/i);
  if (transactionIdMatch && transactionIdMatch[1]) {
    params.transactionId = transactionIdMatch[1];
  }

  // Extract call ID from /api/v1/calls/:id patterns
  const callIdMatch = path.match(/^\/api\/v1\/calls\/([a-f0-9-]{36})(\/.*)?$/i);
  if (callIdMatch && callIdMatch[1]) {
    params.callId = callIdMatch[1];
  }

  // Extract ticket ID from /api/v1/support/tickets/:id patterns
  const ticketIdMatch = path.match(/^\/api\/v1\/support\/tickets\/([a-f0-9-]{36})(\/.*)?$/i);
  if (ticketIdMatch && ticketIdMatch[1]) {
    params.ticketId = ticketIdMatch[1];
  }

  // Extract post ID from /api/v1/social/posts/:id patterns
  const postIdMatch = path.match(/^\/api\/v1\/social\/posts\/([a-f0-9-]{36})(\/.*)?$/i);
  if (postIdMatch && postIdMatch[1]) {
    params.postId = postIdMatch[1];
  }

  // Extract driver ID from /api/v1/drivers/:id patterns
  const driverIdMatch = path.match(/^\/api\/v1\/drivers\/([a-f0-9-]{36})(\/.*)?$/i);
  if (driverIdMatch && driverIdMatch[1]) {
    params.driverId = driverIdMatch[1];
  }

  // Extract vendor ID from /api/v1/vendors/:id patterns
  const vendorIdMatch = path.match(/^\/api\/v1\/vendors\/([a-f0-9-]{36})(\/.*)?$/i);
  if (vendorIdMatch && vendorIdMatch[1]) {
    params.vendorId = vendorIdMatch[1];
  }

  // Extract campaign ID from /api/v1/ads/campaigns/:id patterns
  const campaignIdMatch = path.match(/^\/api\/v1\/ads\/campaigns\/([a-f0-9-]{36})(\/.*)?$/i);
  if (campaignIdMatch && campaignIdMatch[1]) {
    params.campaignId = campaignIdMatch[1];
  }

  return params;
}

/**
 * Check if a route should be proxied to Supabase
 * NOTE: Hotels, bookings, rooms, favorites, reviews, and management routes
 * are now handled by Railway hotels-service
 */
export function shouldProxyToSupabase(path: string): boolean {
  const supabaseRoutes = [
    '/api/v1/rides',
    '/api/v1/users',
    '/api/v1/cart',
    '/api/v1/calls',
    '/api/v1/roles',
    '/api/v1/media',
    '/api/v1/support',
  ];

  return supabaseRoutes.some(route => path.startsWith(route));
}
