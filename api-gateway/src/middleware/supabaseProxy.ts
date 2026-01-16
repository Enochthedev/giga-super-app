import axios from 'axios';
import { NextFunction, Request, Response } from 'express';

import { logger } from '../utils/logger.js';

/**
 * Supabase Function Proxy Middleware
 * Routes requests to Supabase Edge Functions for endpoints not yet migrated to Railway
 */

const { SUPABASE_URL } = process.env;
const { SUPABASE_ANON_KEY } = process.env;

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  logger.error('Supabase proxy configuration missing', {
    hasUrl: !!SUPABASE_URL,
    hasKey: !!SUPABASE_ANON_KEY,
  });
}

// Map API Gateway routes to Supabase function names
const ROUTE_TO_FUNCTION_MAP: Record<string, string> = {
  // Hotel Management
  '/api/v1/hotels/search': 'Search-hotels',
  '/api/v1/hotels/:id': 'Get-hotel-details',
  '/api/v1/hotels/:id/reviews': 'get-hotel-reviews',
  '/api/v1/hotels/:id/availability': 'check-room-availability',
  '/api/v1/hotels/:id/price': 'Calculate-booking-price',

  // User Profile
  '/api/v1/users/profile': 'get-user-profile',
  '/api/v1/users/profile/update': 'update-user-profile',
  '/api/v1/users/profile/picture': 'upload-profile-picture',
  '/api/v1/users/address': 'add-user-address',

  // Rides/Taxi
  '/api/v1/rides/request': 'request-ride',
  '/api/v1/rides/accept': 'accept-ride',
  '/api/v1/rides/start': 'start-ride',
  '/api/v1/rides/complete': 'complete-ride',
  '/api/v1/rides/cancel': 'cancel-ride',
  '/api/v1/rides/estimate': 'get-ride-estimate',
  '/api/v1/rides/nearby-drivers': 'get-nearby-drivers',
  '/api/v1/rides/history': 'get-ride-history',

  // Cart/E-commerce
  '/api/v1/cart': 'get-user-cart',
  '/api/v1/cart/add': 'add-to-cart',
  '/api/v1/cart/checkout': 'checkout-cart',

  // Calls
  '/api/v1/calls/initiate': 'initiate-call',
  '/api/v1/calls/answer': 'answer-call',
  '/api/v1/calls/decline': 'decline-call',
  '/api/v1/calls/end': 'end-call',

  // Roles
  '/api/v1/roles/switch': 'switch-role',
  '/api/v1/roles/apply': 'apply-for-role',
  '/api/v1/roles/review': 'review-role-application',

  // Media
  '/api/v1/media/upload': 'upload-file',
  '/api/v1/media/process-image': 'process-image',

  // Support
  '/api/v1/support/tickets': 'get-my-tickets',
};

// Deprecated endpoints with migration info
const DEPRECATED_ENDPOINTS: Record<string, { newEndpoint: string; deprecationDate: string }> = {
  '/api/v1/hotels/search': {
    newEndpoint: '/api/v1/search/hotels',
    deprecationDate: '2026-02-01',
  },
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
      params: req.query,
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
function getFunctionNameFromRoute(path: string, method: string): string | null {
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
 * Check if a route should be proxied to Supabase
 */
export function shouldProxyToSupabase(path: string): boolean {
  const supabaseRoutes = [
    '/api/v1/hotels',
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
