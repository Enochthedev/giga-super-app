/**
 * Hotel search routes for Search Service
 */

import { Request, Response, Router } from 'express';
import { ZodError } from 'zod';

import { optionalAuth, rateLimitByUser } from '../middleware/auth.js';
import { CacheService } from '../utils/cache.js';
import { DatabaseService } from '../utils/database.js';
import { validateHotelSearch } from '../utils/validation.js';

const router = Router();

// Initialize services
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const databaseService = new DatabaseService(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const cacheService = new CacheService(REDIS_URL);

/**
 * @route POST /api/v1/search/hotels
 * @desc Search hotels with advanced filters
 * @access Public (with optional authentication)
 */
router.post(
  '/',
  optionalAuth,
  rateLimitByUser(100, 15 * 60 * 1000), // 100 requests per 15 minutes
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      // Validate request body
      const queryParams = validateHotelSearch(req.body);

      req.logger?.info('Hotel search initiated', {
        query: queryParams.q,
        location: queryParams.location,
        priceRange: {
          min: queryParams.min_price,
          max: queryParams.max_price,
        },
        filters: {
          star_rating: queryParams.star_rating,
          amenities: queryParams.amenities,
          check_in: queryParams.check_in,
          check_out: queryParams.check_out,
          guests: queryParams.guests,
        },
      });

      // Convert to SearchQuery format
      const searchQuery = {
        q: queryParams.q || '',
        category: 'hotels' as const,
        location: queryParams.location,
        min_price: queryParams.min_price,
        max_price: queryParams.max_price,
        page: queryParams.page,
        limit: queryParams.limit,
        sort: queryParams.sort,
        order: queryParams.order,
        filters: {
          star_rating: queryParams.star_rating,
          amenities: queryParams.amenities,
          start_date: queryParams.check_in,
          end_date: queryParams.check_out,
        },
      };

      // Check cache first
      const cachedResults = await cacheService.getSearchResults(searchQuery);
      if (cachedResults) {
        const executionTime = Date.now() - startTime;
        req.logger?.logSearchResults(cachedResults.data.total_results, true, executionTime);

        res.json(cachedResults);
        return;
      }

      // Perform hotel search
      const { results, total } = await databaseService.searchHotels(searchQuery);

      const executionTime = Date.now() - startTime;

      // Build response with hotel-specific data
      const response = {
        success: true,
        data: {
          query: queryParams.q || '',
          location: queryParams.location,
          total_results: total,
          results: results.map(result => ({
            ...result,
            // Add hotel-specific fields
            check_in_date: queryParams.check_in,
            check_out_date: queryParams.check_out,
            guests: queryParams.guests,
            rooms: queryParams.rooms,
            nights:
              queryParams.check_in && queryParams.check_out
                ? Math.ceil(
                    (new Date(queryParams.check_out).getTime() -
                      new Date(queryParams.check_in).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : undefined,
            total_price:
              queryParams.check_in && queryParams.check_out && result.price
                ? result.price *
                  Math.ceil(
                    (new Date(queryParams.check_out).getTime() -
                      new Date(queryParams.check_in).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : undefined,
            // Add availability information
            availability: {
              available: true,
              rooms_left: Math.floor(Math.random() * 10) + 1,
              room_types: [
                {
                  id: `room_${result.id}`,
                  name: 'Deluxe Room',
                  price: result.price,
                  available_rooms: Math.floor(Math.random() * 5) + 1,
                },
              ],
            },
            cancellation_policy: 'Free cancellation up to 24 hours',
            check_in_time: '15:00',
            check_out_time: '11:00',
          })),
          facets: {
            star_ratings: await getStarRatingFacets(),
            price_ranges: await getPriceRangeFacets(),
            locations: await getLocationFacets(),
            amenities: await getAmenitiesFacets(),
          },
        },
        pagination: {
          page: queryParams.page || 1,
          limit: queryParams.limit || 20,
          total,
          total_pages: Math.ceil(total / (queryParams.limit || 20)),
          has_previous: (queryParams.page || 1) > 1,
          has_next: (queryParams.page || 1) < Math.ceil(total / (queryParams.limit || 20)),
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          execution_time_ms: executionTime,
          cached: false,
        },
      };

      // Cache the results
      await cacheService.setSearchResults(searchQuery, response, 300); // 5 minutes

      req.logger?.logSearchResults(total, false, executionTime);

      res.json(response);
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (error instanceof ZodError) {
        req.logger?.warn('Hotel search validation error', {
          errors: error.errors,
          executionTime,
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid hotel search parameters',
            details: error.errors,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            request_id: requestId,
            version: '1.0.0',
            execution_time_ms: executionTime,
          },
        });
        return;
      }

      req.logger?.error('Hotel search failed', error as Error, { executionTime });

      res.status(500).json({
        success: false,
        error: {
          code: 'HOTEL_SEARCH_ERROR',
          message: 'Hotel search operation failed',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          version: '1.0.0',
          execution_time_ms: executionTime,
        },
      });
    }
  }
);

/**
 * @route GET /api/v1/search/hotels (legacy support)
 * @desc Search hotels with query parameters (legacy)
 * @access Public (with optional authentication)
 */
router.get(
  '/',
  optionalAuth,
  rateLimitByUser(100, 15 * 60 * 1000), // 100 requests per 15 minutes
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      // Validate query parameters
      const queryParams = validateHotelSearch(req.query);

      req.logger?.info('Hotel search initiated', {
        query: queryParams.q,
        location: queryParams.location,
        priceRange: {
          min: queryParams.min_price,
          max: queryParams.max_price,
        },
        filters: {
          star_rating: queryParams.star_rating,
          amenities: queryParams.amenities,
          check_in: queryParams.check_in,
          check_out: queryParams.check_out,
          guests: queryParams.guests,
        },
      });

      // Convert to SearchQuery format
      const searchQuery = {
        q: queryParams.q || '',
        category: 'hotels' as const,
        location: queryParams.location,
        min_price: queryParams.min_price,
        max_price: queryParams.max_price,
        page: queryParams.page,
        limit: queryParams.limit,
        sort: queryParams.sort,
        order: queryParams.order,
        filters: {
          star_rating: queryParams.star_rating,
          amenities: queryParams.amenities,
          start_date: queryParams.check_in,
          end_date: queryParams.check_out,
        },
      };

      // Check cache first
      const cachedResults = await cacheService.getSearchResults(searchQuery);
      if (cachedResults) {
        const executionTime = Date.now() - startTime;
        req.logger?.logSearchResults(cachedResults.data.total_results, true, executionTime);

        res.json(cachedResults);
        return;
      }

      // Perform hotel search
      const { results, total } = await databaseService.searchHotels(searchQuery);

      const executionTime = Date.now() - startTime;

      // Build response with hotel-specific data
      const response = {
        success: true,
        data: {
          query: queryParams.q || '',
          category: 'hotels' as const,
          total_results: total,
          results: results.map(result => ({
            ...result,
            // Add hotel-specific fields
            check_in_date: queryParams.check_in,
            check_out_date: queryParams.check_out,
            guests: queryParams.guests,
            nights:
              queryParams.check_in && queryParams.check_out
                ? Math.ceil(
                    (new Date(queryParams.check_out).getTime() -
                      new Date(queryParams.check_in).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : undefined,
            total_price:
              queryParams.check_in && queryParams.check_out && result.price
                ? result.price *
                  Math.ceil(
                    (new Date(queryParams.check_out).getTime() -
                      new Date(queryParams.check_in).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : undefined,
          })),
          facets: {
            categories: [],
            ratings: await getStarRatingFacets(),
            price_ranges: await getPriceRangeFacets(),
            locations: await getLocationFacets(),
            amenities: await getAmenitiesFacets(),
          },
        },
        pagination: {
          page: queryParams.page || 1,
          limit: queryParams.limit || 20,
          total,
          total_pages: Math.ceil(total / (queryParams.limit || 20)),
          has_previous: (queryParams.page || 1) > 1,
          has_next: (queryParams.page || 1) < Math.ceil(total / (queryParams.limit || 20)),
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          execution_time_ms: executionTime,
          cached: false,
        },
      };

      // Cache the results
      await cacheService.setSearchResults(searchQuery, response, 300); // 5 minutes

      req.logger?.logSearchResults(total, false, executionTime);

      res.json(response);
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (error instanceof ZodError) {
        req.logger?.warn('Hotel search validation error', {
          errors: error.errors,
          executionTime,
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid hotel search parameters',
            details: error.errors,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            request_id: requestId,
            version: '1.0.0',
            execution_time_ms: executionTime,
          },
        });
        return;
      }

      req.logger?.error('Hotel search failed', error as Error, { executionTime });

      res.status(500).json({
        success: false,
        error: {
          code: 'HOTEL_SEARCH_ERROR',
          message: 'Hotel search operation failed',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          version: '1.0.0',
          execution_time_ms: executionTime,
        },
      });
    }
  }
);

/**
 * @route GET /api/v1/search/hotels/popular
 * @desc Get popular hotels
 * @access Public
 */
router.get(
  '/popular',
  rateLimitByUser(50, 15 * 60 * 1000), // 50 requests per 15 minutes
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      const { location, limit = 10 } = req.query as {
        location?: string;
        limit?: number;
      };

      const searchQuery = {
        q: '',
        category: 'hotels' as const,
        location,
        page: 1,
        limit: Number(limit),
        sort: 'rating' as const,
        order: 'desc' as const,
      };

      // Check cache
      const cacheKey = `popular_hotels:${location || 'all'}:${limit}`;
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }

      const { results, total } = await databaseService.searchHotels(searchQuery);

      const executionTime = Date.now() - startTime;

      const response = {
        success: true,
        data: {
          hotels: results,
          total_count: total,
          location: location || 'all',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          execution_time_ms: executionTime,
          cached: false,
        },
      };

      // Cache for 1 hour
      await cacheService.set(cacheKey, JSON.stringify(response), 3600);

      res.json(response);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      req.logger?.error('Popular hotels fetch failed', error as Error, { executionTime });

      res.status(500).json({
        success: false,
        error: {
          code: 'POPULAR_HOTELS_ERROR',
          message: 'Failed to fetch popular hotels',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          version: '1.0.0',
          execution_time_ms: executionTime,
        },
      });
    }
  }
);

/**
 * @route GET /api/v1/search/hotels/nearby
 * @desc Find hotels near a location
 * @access Public
 */
router.get(
  '/nearby',
  rateLimitByUser(100, 15 * 60 * 1000),
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      const { latitude, longitude, radius = 10, limit = 20 } = req.query as Record<string, string>;

      if (!latitude || !longitude) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Latitude and longitude are required',
          },
          metadata: {
            timestamp: new Date().toISOString(),
            request_id: requestId,
            version: '1.0.0',
          },
        });
        return;
      }

      const searchQuery = {
        q: '',
        category: 'hotels' as const,
        page: 1,
        limit: Number(limit),
        sort: 'distance' as const,
        order: 'asc' as const,
        filters: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radius: Number(radius),
        },
      };

      const { results, total } = await databaseService.searchHotels(searchQuery);

      const executionTime = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          hotels: results,
          total_count: total,
          search_center: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
          },
          radius_km: Number(radius),
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          execution_time_ms: executionTime,
          cached: false,
        },
      });
    } catch (error) {
      const executionTime = Date.now() - startTime;
      req.logger?.error('Nearby hotels search failed', error as Error, { executionTime });

      res.status(500).json({
        success: false,
        error: {
          code: 'NEARBY_HOTELS_ERROR',
          message: 'Failed to find nearby hotels',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          version: '1.0.0',
          execution_time_ms: executionTime,
        },
      });
    }
  }
);

// Helper functions for facets
async function getPriceRangeFacets() {
  // Implementation would query database for price distribution
  return [
    { value: '0-100', count: 0, selected: false },
    { value: '100-200', count: 0, selected: false },
    { value: '200-500', count: 0, selected: false },
    { value: '500+', count: 0, selected: false },
  ];
}

async function getStarRatingFacets() {
  return [
    { value: '5', count: 0, selected: false },
    { value: '4', count: 0, selected: false },
    { value: '3', count: 0, selected: false },
    { value: '2', count: 0, selected: false },
    { value: '1', count: 0, selected: false },
  ];
}

async function getAmenitiesFacets() {
  return [
    { value: 'WiFi', count: 0, selected: false },
    { value: 'Pool', count: 0, selected: false },
    { value: 'Gym', count: 0, selected: false },
    { value: 'Spa', count: 0, selected: false },
    { value: 'Restaurant', count: 0, selected: false },
  ];
}

async function getLocationFacets() {
  return [
    { value: 'Lagos', count: 0, selected: false },
    { value: 'Abuja', count: 0, selected: false },
    { value: 'Port Harcourt', count: 0, selected: false },
    { value: 'Kano', count: 0, selected: false },
  ];
}

export default router;
