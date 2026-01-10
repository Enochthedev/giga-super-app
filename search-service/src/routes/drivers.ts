/**
 * Driver search routes for Search Service
 */

import { Request, Response, Router } from 'express';
import { ZodError } from 'zod';
import { optionalAuth, rateLimitByUser } from '../middleware/auth.js';
import { CacheService } from '../utils/cache.js';
import { DatabaseService } from '../utils/database.js';
import { validateDriverSearch } from '../utils/validation.js';

const router = Router();

// Initialize services
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const databaseService = new DatabaseService(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const cacheService = new CacheService(REDIS_URL);

/**
 * @route POST /api/v1/search/drivers
 * @desc Search taxi drivers with location-based filtering
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
      const queryParams = validateDriverSearch(req.body);

      req.logger?.info('Driver search initiated', {
        pickup_location:
          queryParams.pickup_latitude && queryParams.pickup_longitude
            ? {
                latitude: queryParams.pickup_latitude,
                longitude: queryParams.pickup_longitude,
                radius: queryParams.radius_km,
              }
            : null,
        destination_location:
          queryParams.destination_latitude && queryParams.destination_longitude
            ? {
                latitude: queryParams.destination_latitude,
                longitude: queryParams.destination_longitude,
              }
            : null,
        filters: {
          vehicle_type: queryParams.vehicle_type,
          min_rating: queryParams.filters?.min_rating,
          verified_only: queryParams.filters?.verified_only,
          available_only: queryParams.filters?.available_only,
        },
      });

      // Convert to SearchQuery format
      const searchQuery = {
        q: '',
        category: 'drivers' as const,
        page: 1,
        limit: queryParams.max_drivers || 5,
        sort: queryParams.sort || 'distance',
        order: 'asc' as const,
        filters: {
          pickup_latitude: queryParams.pickup_latitude,
          pickup_longitude: queryParams.pickup_longitude,
          destination_latitude: queryParams.destination_latitude,
          destination_longitude: queryParams.destination_longitude,
          radius: queryParams.radius_km,
          vehicle_type: queryParams.vehicle_type,
          min_rating: queryParams.filters?.min_rating,
          verified_only: queryParams.filters?.verified_only,
          available_only: queryParams.filters?.available_only,
        },
      };

      // Don't cache real-time location searches
      const { results, total } = await databaseService.searchDrivers(searchQuery);

      const executionTime = Date.now() - startTime;

      // Build response with driver-specific data
      const response = {
        success: true,
        data: {
          pickup_location: {
            latitude: queryParams.pickup_latitude,
            longitude: queryParams.pickup_longitude,
          },
          total_results: total,
          results: results.map(result => ({
            id: result.id,
            name: result.title,
            phone: result.data.phone,
            rating: result.rating || 0,
            total_trips: result.data.total_trips || 0,
            profile_image: result.image_url,
            vehicle: {
              type: result.data.vehicle_type || queryParams.vehicle_type,
              make: result.data.vehicle_make || 'Toyota',
              model: result.data.vehicle_model || 'Camry',
              year: result.data.vehicle_year || 2020,
              color: result.data.vehicle_color || 'Silver',
              plate_number: result.data.license_plate || 'ABC-123-XY',
              image: result.data.vehicle_image,
            },
            location: {
              latitude: result.data.current_latitude || queryParams.pickup_latitude,
              longitude: result.data.current_longitude || queryParams.pickup_longitude,
              address: result.data.current_address || 'Lagos, Nigeria',
              last_updated: new Date().toISOString(),
            },
            distance_km: result.distance || Math.random() * 5,
            eta_minutes: Math.ceil((result.distance || Math.random() * 5) * 2),
            status: result.data.is_available ? 'available' : 'busy',
            verified: result.data.verified || false,
            fare_estimate: {
              base_fare: 500,
              estimated_total: Math.round(500 + (result.distance || 5) * 100),
              currency: 'NGN',
              surge_multiplier: 1.0,
            },
            trip_estimate:
              queryParams.destination_latitude && queryParams.destination_longitude
                ? {
                    distance_km: calculateDistance(
                      queryParams.pickup_latitude,
                      queryParams.pickup_longitude,
                      queryParams.destination_latitude,
                      queryParams.destination_longitude
                    ),
                    duration_minutes: Math.ceil(
                      calculateDistance(
                        queryParams.pickup_latitude,
                        queryParams.pickup_longitude,
                        queryParams.destination_latitude,
                        queryParams.destination_longitude
                      ) * 2
                    ),
                    route_preview: 'Via main roads',
                  }
                : undefined,
          })),
          facets: {
            vehicle_types: await getVehicleTypeFacets(searchQuery),
            ratings: await getRatingFacets(searchQuery),
          },
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          execution_time_ms: executionTime,
          cached: false,
          surge_active: false,
          surge_areas: [],
        },
      };

      req.logger?.logSearchResults(total, false, executionTime);

      res.json(response);
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (error instanceof ZodError) {
        req.logger?.warn('Driver search validation error', {
          errors: error.errors,
          executionTime,
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid driver search parameters',
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

      req.logger?.error('Driver search failed', error as Error, { executionTime });

      res.status(500).json({
        success: false,
        error: {
          code: 'DRIVER_SEARCH_ERROR',
          message: 'Driver search operation failed',
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
 * @route GET /api/v1/search/drivers (legacy support)
 * @desc Search taxi drivers with query parameters (legacy)
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
      const queryParams = validateDriverSearch(req.query);

      req.logger?.info('Driver search initiated', {
        query: queryParams.q,
        location:
          queryParams.latitude && queryParams.longitude
            ? {
                latitude: queryParams.latitude,
                longitude: queryParams.longitude,
                radius: queryParams.radius,
              }
            : null,
        filters: {
          vehicle_type: queryParams.vehicle_type,
          rating_min: queryParams.rating_min,
          available_only: queryParams.available_only,
        },
      });

      // Convert to SearchQuery format
      const searchQuery = {
        q: queryParams.q || '',
        category: 'drivers' as const,
        page: queryParams.page,
        limit: queryParams.limit,
        sort: queryParams.sort,
        order: queryParams.order,
        filters: {
          latitude: queryParams.latitude,
          longitude: queryParams.longitude,
          radius: queryParams.radius,
          vehicle_type: queryParams.vehicle_type,
          rating_min: queryParams.rating_min,
          available_only: queryParams.available_only,
        },
      };

      // For location-based searches, use shorter cache time
      const cacheTime = queryParams.latitude && queryParams.longitude ? 30 : 300; // 30 seconds vs 5 minutes

      // Check cache first (but skip for real-time location searches)
      let cachedResults = null;
      if (!queryParams.latitude || !queryParams.longitude) {
        cachedResults = await cacheService.getSearchResults(searchQuery);
      }

      if (cachedResults) {
        const executionTime = Date.now() - startTime;
        req.logger?.logSearchResults(cachedResults.data.total_results, true, executionTime);

        res.json(cachedResults);
        return;
      }

      // Perform driver search
      const { results, total } = await databaseService.searchDrivers(searchQuery);

      const executionTime = Date.now() - startTime;

      // Build response with driver-specific data
      const response = {
        success: true,
        data: {
          query: queryParams.q || '',
          category: 'drivers' as const,
          total_results: total,
          results: results.map(result => ({
            ...result,
            // Add driver-specific fields
            vehicle_info: {
              type: result.data.vehicle_type,
              model: result.data.vehicle_model,
              license_plate: result.data.license_plate,
            },
            contact: {
              phone: result.data.phone,
            },
            availability: {
              is_available: result.data.is_available,
              current_location:
                result.data.current_latitude && result.data.current_longitude
                  ? {
                      latitude: result.data.current_latitude,
                      longitude: result.data.current_longitude,
                    }
                  : null,
            },
            estimated_arrival: result.distance ? Math.ceil(result.distance * 2) : null, // Rough estimate: 2 minutes per km
          })),
          search_location:
            queryParams.latitude && queryParams.longitude
              ? {
                  latitude: queryParams.latitude,
                  longitude: queryParams.longitude,
                  radius_km: queryParams.radius,
                }
              : null,
          facets: {
            vehicle_types: await getVehicleTypeFacets(searchQuery),
            ratings: await getRatingFacets(searchQuery),
            availability: await getAvailabilityFacets(searchQuery),
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

      // Cache the results with appropriate TTL
      await cacheService.setSearchResults(searchQuery, response, cacheTime);

      req.logger?.logSearchResults(total, false, executionTime);

      res.json(response);
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (error instanceof ZodError) {
        req.logger?.warn('Driver search validation error', {
          errors: error.errors,
          executionTime,
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid driver search parameters',
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

      req.logger?.error('Driver search failed', error as Error, { executionTime });

      res.status(500).json({
        success: false,
        error: {
          code: 'DRIVER_SEARCH_ERROR',
          message: 'Driver search operation failed',
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
 * @route GET /api/v1/search/drivers/nearby
 * @desc Find drivers near a specific location
 * @access Public
 */
router.get(
  '/nearby',
  rateLimitByUser(200, 15 * 60 * 1000), // Higher limit for real-time requests
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      const {
        latitude,
        longitude,
        radius = 5,
        limit = 10,
      } = req.query as {
        latitude: string;
        longitude: string;
        radius?: number;
        limit?: number;
      };

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
        category: 'drivers' as const,
        page: 1,
        limit: Number(limit),
        sort: 'distance' as const,
        order: 'asc' as const,
        filters: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radius: Number(radius),
          available_only: true,
        },
      };

      // Don't cache real-time location searches
      const { results, total } = await databaseService.searchDrivers(searchQuery);

      const executionTime = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          drivers: results.map(result => ({
            ...result,
            estimated_arrival_minutes: result.distance ? Math.ceil(result.distance * 2) : null,
            vehicle_info: {
              type: result.data.vehicle_type,
              model: result.data.vehicle_model,
              license_plate: result.data.license_plate,
            },
          })),
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
      req.logger?.error('Nearby drivers search failed', error as Error, { executionTime });

      res.status(500).json({
        success: false,
        error: {
          code: 'NEARBY_DRIVERS_ERROR',
          message: 'Failed to find nearby drivers',
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
 * @route GET /api/v1/search/drivers/vehicle-types
 * @desc Get available vehicle types
 * @access Public
 */
router.get(
  '/vehicle-types',
  rateLimitByUser(50, 15 * 60 * 1000),
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      // Check cache
      const cacheKey = 'vehicle_types';
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }

      // This would typically query the database for distinct vehicle types
      const vehicleTypes = [
        {
          type: 'sedan',
          name: 'Sedan',
          capacity: 4,
          description: 'Comfortable 4-seater car',
          base_fare: 500,
          per_km_rate: 100,
        },
        {
          type: 'suv',
          name: 'SUV',
          capacity: 6,
          description: 'Spacious 6-seater SUV',
          base_fare: 800,
          per_km_rate: 150,
        },
        {
          type: 'hatchback',
          name: 'Hatchback',
          capacity: 4,
          description: 'Compact and economical',
          base_fare: 400,
          per_km_rate: 80,
        },
        {
          type: 'luxury',
          name: 'Luxury',
          capacity: 4,
          description: 'Premium luxury vehicle',
          base_fare: 1500,
          per_km_rate: 300,
        },
        {
          type: 'motorcycle',
          name: 'Motorcycle',
          capacity: 2,
          description: 'Quick motorcycle ride',
          base_fare: 200,
          per_km_rate: 50,
        },
      ];

      const executionTime = Date.now() - startTime;

      const response = {
        success: true,
        data: {
          vehicle_types: vehicleTypes,
          total_count: vehicleTypes.length,
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
      req.logger?.error('Vehicle types fetch failed', error as Error, { executionTime });

      res.status(500).json({
        success: false,
        error: {
          code: 'VEHICLE_TYPES_ERROR',
          message: 'Failed to fetch vehicle types',
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
 * @route POST /api/v1/search/drivers/estimate-fare
 * @desc Estimate fare for a trip
 * @access Public
 */
router.post(
  '/estimate-fare',
  rateLimitByUser(100, 15 * 60 * 1000),
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      const {
        pickup_latitude,
        pickup_longitude,
        destination_latitude,
        destination_longitude,
        vehicle_type = 'sedan',
      } = req.body;

      if (
        !pickup_latitude ||
        !pickup_longitude ||
        !destination_latitude ||
        !destination_longitude
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Pickup and destination coordinates are required',
          },
          metadata: {
            timestamp: new Date().toISOString(),
            request_id: requestId,
            version: '1.0.0',
          },
        });
        return;
      }

      // Calculate distance (simplified - would use Google Maps API in production)
      const distance = calculateDistance(
        pickup_latitude,
        pickup_longitude,
        destination_latitude,
        destination_longitude
      );

      // Get vehicle type rates
      const vehicleRates = {
        sedan: { base_fare: 500, per_km_rate: 100 },
        suv: { base_fare: 800, per_km_rate: 150 },
        hatchback: { base_fare: 400, per_km_rate: 80 },
        luxury: { base_fare: 1500, per_km_rate: 300 },
        motorcycle: { base_fare: 200, per_km_rate: 50 },
      };

      const rates = vehicleRates[vehicle_type as keyof typeof vehicleRates] || vehicleRates.sedan;
      const estimatedFare = rates.base_fare + distance * rates.per_km_rate;
      const estimatedTime = Math.ceil(distance * 2); // 2 minutes per km

      const executionTime = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          pickup: {
            latitude: pickup_latitude,
            longitude: pickup_longitude,
          },
          destination: {
            latitude: destination_latitude,
            longitude: destination_longitude,
          },
          distance_km: Math.round(distance * 100) / 100,
          estimated_time_minutes: estimatedTime,
          vehicle_type,
          fare_estimate: {
            base_fare: rates.base_fare,
            distance_fare: distance * rates.per_km_rate,
            total_fare: Math.round(estimatedFare),
            currency: 'NGN',
          },
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          execution_time_ms: executionTime,
        },
      });
    } catch (error) {
      const executionTime = Date.now() - startTime;
      req.logger?.error('Fare estimation failed', error as Error, { executionTime });

      res.status(500).json({
        success: false,
        error: {
          code: 'FARE_ESTIMATION_ERROR',
          message: 'Failed to estimate fare',
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
async function getVehicleTypeFacets(query: any) {
  return [
    { value: 'sedan', count: 0, selected: false },
    { value: 'suv', count: 0, selected: false },
    { value: 'hatchback', count: 0, selected: false },
    { value: 'luxury', count: 0, selected: false },
    { value: 'motorcycle', count: 0, selected: false },
  ];
}

async function getRatingFacets(query: any) {
  return [
    { value: '5', count: 0, selected: false },
    { value: '4+', count: 0, selected: false },
    { value: '3+', count: 0, selected: false },
    { value: '2+', count: 0, selected: false },
  ];
}

async function getAvailabilityFacets(query: any) {
  return [
    { value: 'available', count: 0, selected: false },
    { value: 'busy', count: 0, selected: false },
  ];
}

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export default router;
