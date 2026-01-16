/**
 * Search routes for Search Service
 */

import { Request, Response, Router } from 'express';
import { ZodError } from 'zod';
import { optionalAuth, rateLimitByUser } from '../middleware/auth.js';
import { SearchCategory, SearchResponse, SearchResult } from '../types/index.js';
import { CacheService } from '../utils/cache.js';
import { DatabaseService } from '../utils/database.js';
import { sanitizeSearchQuery, validateSearchQuery } from '../utils/validation.js';

const router = Router();

// Initialize services
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let databaseService: DatabaseService | null = null;
let cacheService: CacheService | null = null;

const getDatabase = () => {
  if (!databaseService) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }
    databaseService = new DatabaseService(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return databaseService;
};

const getCache = () => {
  if (!cacheService) {
    cacheService = new CacheService(REDIS_URL);
  }
  return cacheService;
};

/**
 * @route POST /api/v1/search/universal
 * @desc Universal search across all categories with advanced filters
 * @access Public (with optional authentication)
 */
router.post(
  '/universal',
  optionalAuth,
  rateLimitByUser(100, 15 * 60 * 1000), // 100 requests per 15 minutes
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      // Validate and sanitize request body
      const query = validateSearchQuery(req.body);
      query.q = sanitizeSearchQuery(query.q);

      req.logger?.logSearchQuery(query, query.category || 'all', 0);

      // Check cache first
      const cachedResults = await getCache().getSearchResults(query);
      if (cachedResults) {
        const executionTime = Date.now() - startTime;
        req.logger?.logSearchResults(cachedResults.data.total_results, true, executionTime);

        res.json(cachedResults);
        return;
      }

      // Perform search based on category
      let allResults: SearchResult[] = [];
      let totalResults = 0;
      let facets = {};

      if (query.category === 'all') {
        // Search across all categories with limited results per category
        const [hotelResults, productResults, driverResults, postResults, userResults] =
          await Promise.all([
            getDatabase().searchHotels({ ...query, category: 'hotels', limit: 5 }),
            getDatabase().searchProducts({ ...query, category: 'products', limit: 5 }),
            getDatabase().searchDrivers({ ...query, category: 'drivers', limit: 5 }),
            getDatabase().searchPosts({ ...query, category: 'posts', limit: 5 }),
            getDatabase().searchUsers({ ...query, category: 'users', limit: 5 }),
          ]);

        allResults = [
          ...hotelResults.results,
          ...productResults.results,
          ...driverResults.results,
          ...postResults.results,
          ...userResults.results,
        ];

        totalResults =
          hotelResults.total +
          productResults.total +
          driverResults.total +
          postResults.total +
          userResults.total;

        // Build category facets
        facets = {
          categories: [
            { value: 'hotels', count: hotelResults.total, selected: false },
            { value: 'products', count: productResults.total, selected: false },
            { value: 'drivers', count: driverResults.total, selected: false },
            { value: 'posts', count: postResults.total, selected: false },
            { value: 'users', count: userResults.total, selected: false },
          ],
        };
      } else {
        // Search specific category
        let categoryResults: { results: SearchResult[]; total: number };

        switch (query.category) {
          case 'hotels':
            categoryResults = await getDatabase().searchHotels(query);
            facets = await getHotelFacets(query);
            break;
          case 'products':
            categoryResults = await getDatabase().searchProducts(query);
            facets = await getProductFacets(query);
            break;
          case 'drivers':
            categoryResults = await getDatabase().searchDrivers(query);
            facets = await getDriverFacets(query);
            break;
          case 'posts':
            categoryResults = await getDatabase().searchPosts(query);
            facets = await getPostFacets(query);
            break;
          case 'users':
            categoryResults = await getDatabase().searchUsers(query);
            facets = await getUserFacets(query);
            break;
          default:
            throw new Error(`Unsupported category: ${query.category}`);
        }

        allResults = categoryResults.results;
        totalResults = categoryResults.total;
      }

      // Sort results by relevance score
      allResults.sort((a, b) => b.relevance_score - a.relevance_score);

      // Apply pagination for 'all' category
      if (query.category === 'all') {
        const startIndex = ((query.page || 1) - 1) * (query.limit || 20);
        const endIndex = startIndex + (query.limit || 20);
        allResults = allResults.slice(startIndex, endIndex);
      }

      const executionTime = Date.now() - startTime;

      // Build response
      const response: SearchResponse = {
        success: true,
        data: {
          query: query.q,
          category: query.category || 'all',
          total_results: totalResults,
          results: allResults,
          facets,
        },
        pagination: {
          page: query.page || 1,
          limit: query.limit || 20,
          total: totalResults,
          total_pages: Math.ceil(totalResults / (query.limit || 20)),
          has_previous: (query.page || 1) > 1,
          has_next: (query.page || 1) < Math.ceil(totalResults / (query.limit || 20)),
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          execution_time_ms: executionTime,
          cached: false,
        },
      };

      // Cache the results
      await getCache().setSearchResults(query, response);

      req.logger?.logSearchResults(totalResults, false, executionTime);

      res.json(response);
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (error instanceof ZodError) {
        req.logger?.warn('Search validation error', {
          errors: error.errors,
          executionTime,
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid search parameters',
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

      req.logger?.error('Search failed', error as Error, { executionTime });

      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Search operation failed',
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
 * @route GET /api/v1/search
 * @desc Universal search across all categories (legacy GET support)
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
      // Validate and sanitize query parameters
      const query = validateSearchQuery(req.query);
      query.q = sanitizeSearchQuery(query.q);

      req.logger?.logSearchQuery(query, query.category || 'all', 0);

      // Check cache first
      const cachedResults = await getCache().getSearchResults(query);
      if (cachedResults) {
        const executionTime = Date.now() - startTime;
        req.logger?.logSearchResults(cachedResults.data.total_results, true, executionTime);

        res.json(cachedResults);
        return;
      }

      // Perform search based on category
      let allResults: SearchResult[] = [];
      let totalResults = 0;

      if (query.category === 'all') {
        // Search across all categories with limited results per category
        const [hotelResults, productResults, driverResults, postResults, userResults] =
          await Promise.all([
            getDatabase().searchHotels({ ...query, category: 'hotels', limit: 5 }),
            getDatabase().searchProducts({ ...query, category: 'products', limit: 5 }),
            getDatabase().searchDrivers({ ...query, category: 'drivers', limit: 5 }),
            getDatabase().searchPosts({ ...query, category: 'posts', limit: 5 }),
            getDatabase().searchUsers({ ...query, category: 'users', limit: 5 }),
          ]);

        allResults = [
          ...hotelResults.results,
          ...productResults.results,
          ...driverResults.results,
          ...postResults.results,
          ...userResults.results,
        ];

        totalResults =
          hotelResults.total +
          productResults.total +
          driverResults.total +
          postResults.total +
          userResults.total;
      } else {
        // Search specific category
        let categoryResults: { results: SearchResult[]; total: number };

        switch (query.category) {
          case 'hotels':
            categoryResults = await getDatabase().searchHotels(query);
            break;
          case 'products':
            categoryResults = await getDatabase().searchProducts(query);
            break;
          case 'drivers':
            categoryResults = await getDatabase().searchDrivers(query);
            break;
          case 'posts':
            categoryResults = await getDatabase().searchPosts(query);
            break;
          case 'users':
            categoryResults = await getDatabase().searchUsers(query);
            break;
          default:
            throw new Error(`Unsupported category: ${query.category}`);
        }

        allResults = categoryResults.results;
        totalResults = categoryResults.total;
      }

      // Sort results by relevance score
      allResults.sort((a, b) => b.relevance_score - a.relevance_score);

      // Apply pagination for 'all' category
      if (query.category === 'all') {
        const startIndex = ((query.page || 1) - 1) * (query.limit || 20);
        const endIndex = startIndex + (query.limit || 20);
        allResults = allResults.slice(startIndex, endIndex);
      }

      // Get search suggestions
      const suggestions = await getDatabase().getSearchSuggestions(
        query.q,
        query.category || 'all',
        5
      );

      const executionTime = Date.now() - startTime;

      // Build response
      const response: SearchResponse = {
        success: true,
        data: {
          query: query.q,
          category: query.category || 'all',
          total_results: totalResults,
          results: allResults,
          suggestions,
        },
        pagination: {
          page: query.page || 1,
          limit: query.limit || 20,
          total: totalResults,
          total_pages: Math.ceil(totalResults / (query.limit || 20)),
          has_previous: (query.page || 1) > 1,
          has_next: (query.page || 1) < Math.ceil(totalResults / (query.limit || 20)),
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          execution_time_ms: executionTime,
          cached: false,
        },
      };

      // Cache the results
      await getCache().setSearchResults(query, response);

      req.logger?.logSearchResults(totalResults, false, executionTime);

      res.json(response);
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (error instanceof ZodError) {
        req.logger?.warn('Search validation error', {
          errors: error.errors,
          executionTime,
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid search parameters',
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

      req.logger?.error('Search failed', error as Error, { executionTime });

      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Search operation failed',
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
 * @route GET /api/v1/search/suggestions
 * @desc Get search suggestions for autocomplete
 * @access Public
 */
router.get(
  '/suggestions',
  rateLimitByUser(200, 15 * 60 * 1000), // 200 requests per 15 minutes
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      const {
        q,
        category = 'all',
        limit = 10,
      } = req.query as {
        q: string;
        category?: SearchCategory;
        limit?: number;
      };

      if (!q || q.length < 2) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Query must be at least 2 characters long',
          },
          metadata: {
            timestamp: new Date().toISOString(),
            request_id: requestId,
            version: '1.0.0',
          },
        });
        return;
      }

      const sanitizedQuery = sanitizeSearchQuery(q);

      // Check cache
      const cachedSuggestions = await getCache().getAutocompleteResults(
        sanitizedQuery,
        category,
        Number(limit)
      );

      if (cachedSuggestions) {
        res.json(cachedSuggestions);
        return;
      }

      // Get suggestions from database
      const suggestions = await getDatabase().getSearchSuggestions(
        sanitizedQuery,
        category,
        Number(limit)
      );

      const executionTime = Date.now() - startTime;

      const response = {
        success: true,
        data: {
          query: sanitizedQuery,
          suggestions: suggestions.map(suggestion => ({
            text: suggestion,
            type: 'query' as const,
            category,
          })),
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          execution_time_ms: executionTime,
        },
      };

      // Cache suggestions
      await getCache().setAutocompleteResults(
        sanitizedQuery,
        category,
        Number(limit),
        response,
        600 // 10 minutes
      );

      res.json(response);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      req.logger?.error('Suggestions failed', error as Error, { executionTime });

      res.status(500).json({
        success: false,
        error: {
          code: 'SUGGESTIONS_ERROR',
          message: 'Failed to get search suggestions',
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
 * @route POST /api/v1/search/analytics
 * @desc Track search analytics and user interactions
 * @access Public (with optional authentication)
 */
router.post(
  '/analytics',
  optionalAuth,
  rateLimitByUser(500, 15 * 60 * 1000), // 500 requests per 15 minutes
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      const {
        query,
        category,
        results_count,
        clicked_result_id,
        clicked_position,
        session_id,
        user_location,
        filters_applied,
        search_duration_ms,
      } = req.body;

      // Store analytics data
      const analyticsData = {
        query: sanitizeSearchQuery(query || ''),
        category: category || 'all',
        results_count: results_count || 0,
        clicked_result_id,
        clicked_position,
        session_id,
        user_id: req.user?.id,
        user_location,
        filters_applied,
        search_duration_ms,
        timestamp: new Date().toISOString(),
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
      };

      // Store in database (async, don't wait)
      getDatabase().storeSearchAnalytics(analyticsData).catch(error => {
        req.logger?.error('Failed to store search analytics', error);
      });

      const executionTime = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          analytics_id: `analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          recorded_at: new Date().toISOString(),
          status: 'recorded',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          execution_time_ms: executionTime,
        },
      });
    } catch (error) {
      const executionTime = Date.now() - startTime;
      req.logger?.error('Analytics tracking failed', error as Error, { executionTime });

      res.status(500).json({
        success: false,
        error: {
          code: 'ANALYTICS_ERROR',
          message: 'Failed to track search analytics',
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
 * @route GET /api/v1/search/filters
 * @desc Get available filters and facets for a specific search category
 * @access Public
 */
router.get(
  '/filters',
  rateLimitByUser(100, 15 * 60 * 1000), // 100 requests per 15 minutes
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      const { category = 'all', location } = req.query as {
        category?: SearchCategory;
        location?: string;
      };

      // Check cache first
      const cacheKey = `filters:${category}:${location || 'all'}`;
      const cached = await getCache().get(cacheKey);

      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }

      let filters = {};
      let sortOptions = [];

      switch (category) {
        case 'hotels':
          filters = await getHotelFilters(location);
          sortOptions = [
            { value: 'relevance', label: 'Best Match', default: true },
            { value: 'price_asc', label: 'Price: Low to High' },
            { value: 'price_desc', label: 'Price: High to Low' },
            { value: 'rating', label: 'Guest Rating' },
            { value: 'distance', label: 'Distance' },
            { value: 'newest', label: 'Newest First' },
          ];
          break;
        case 'products':
          filters = await getProductFilters(location);
          sortOptions = [
            { value: 'relevance', label: 'Best Match', default: true },
            { value: 'price_asc', label: 'Price: Low to High' },
            { value: 'price_desc', label: 'Price: High to Low' },
            { value: 'rating', label: 'Customer Rating' },
            { value: 'newest', label: 'Newest First' },
            { value: 'popularity', label: 'Most Popular' },
          ];
          break;
        case 'drivers':
          filters = await getDriverFilters(location);
          sortOptions = [
            { value: 'distance', label: 'Nearest First', default: true },
            { value: 'rating', label: 'Highest Rated' },
            { value: 'eta', label: 'Fastest ETA' },
          ];
          break;
        default:
          filters = await getUniversalFilters(location);
          sortOptions = [
            { value: 'relevance', label: 'Best Match', default: true },
            { value: 'newest', label: 'Newest First' },
            { value: 'rating', label: 'Highest Rated' },
          ];
      }

      const executionTime = Date.now() - startTime;

      const response = {
        success: true,
        data: {
          category,
          filters,
          sort_options: sortOptions,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          execution_time_ms: executionTime,
          cached: false,
          cache_expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        },
      };

      // Cache for 1 hour
      await getCache().set(cacheKey, JSON.stringify(response), 3600);

      res.json(response);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      req.logger?.error('Filters retrieval failed', error as Error, { executionTime });

      res.status(500).json({
        success: false,
        error: {
          code: 'FILTERS_ERROR',
          message: 'Failed to retrieve search filters',
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
 * @route DELETE /api/v1/search/cache
 * @desc Clear search cache (admin only)
 * @access Admin
 */
router.delete('/cache', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string;

  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Admin access required',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          version: '1.0.0',
        },
      });
      return;
    }

    const { pattern } = req.query as { pattern?: string };

    const clearedCount = await getCache().invalidateSearchCache(pattern);

    req.logger?.info('Search cache cleared', {
      clearedCount,
      pattern,
      adminId: req.user.id,
    });

    res.json({
      success: true,
      data: {
        message: `Cleared ${clearedCount} cache entries`,
        pattern: pattern || 'search:*',
        cleared_count: clearedCount,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        version: '1.0.0',
      },
    });
  } catch (error) {
    req.logger?.error('Cache clear failed', error as Error);

    res.status(500).json({
      success: false,
      error: {
        code: 'CACHE_CLEAR_ERROR',
        message: 'Failed to clear search cache',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        version: '1.0.0',
      },
    });
  }
});

/**
 * @route GET /api/v1/search/stats
 * @desc Get search service statistics (admin only)
 * @access Admin
 */
router.get('/stats', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string;

  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Admin access required',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          version: '1.0.0',
        },
      });
      return;
    }

    const cacheStats = await getCache().getCacheStats();

    res.json({
      success: true,
      data: {
        cache: cacheStats,
        service: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: '1.0.0',
        },
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        version: '1.0.0',
      },
    });
  } catch (error) {
    req.logger?.error('Stats retrieval failed', error as Error);

    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: 'Failed to retrieve service statistics',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        version: '1.0.0',
      },
    });
  }
});

// Helper functions for facets
async function getHotelFacets(query: any) {
  return {
    star_ratings: [
      { value: '5', count: 45, selected: false },
      { value: '4', count: 120, selected: false },
      { value: '3', count: 89, selected: false },
      { value: '2', count: 34, selected: false },
      { value: '1', count: 12, selected: false },
    ],
    price_ranges: [
      { value: '0-100', count: 20, selected: false },
      { value: '100-300', count: 80, selected: false },
      { value: '300-500', count: 45, selected: false },
      { value: '500+', count: 25, selected: false },
    ],
    amenities: [
      { value: 'wifi', count: 280, selected: false },
      { value: 'pool', count: 156, selected: false },
      { value: 'gym', count: 134, selected: false },
      { value: 'spa', count: 89, selected: false },
      { value: 'restaurant', count: 245, selected: false },
    ],
    locations: [
      { value: 'victoria_island', count: 89, selected: false },
      { value: 'ikoyi', count: 67, selected: false },
      { value: 'lekki', count: 123, selected: false },
      { value: 'mainland', count: 156, selected: false },
    ],
  };
}

async function getProductFacets(query: any) {
  return {
    categories: [
      { value: 'electronics', count: 234, selected: false },
      { value: 'fashion', count: 189, selected: false },
      { value: 'home', count: 156, selected: false },
      { value: 'sports', count: 89, selected: false },
    ],
    brands: [
      { value: 'apple', count: 45, selected: false },
      { value: 'samsung', count: 67, selected: false },
      { value: 'nike', count: 34, selected: false },
      { value: 'adidas', count: 28, selected: false },
    ],
    price_ranges: [
      { value: '0-100', count: 120, selected: false },
      { value: '100-500', count: 200, selected: false },
      { value: '500-1000', count: 89, selected: false },
      { value: '1000+', count: 45, selected: false },
    ],
    conditions: [
      { value: 'new', count: 350, selected: false },
      { value: 'used', count: 89, selected: false },
      { value: 'refurbished', count: 15, selected: false },
    ],
  };
}

async function getDriverFacets(query: any) {
  return {
    vehicle_types: [
      { value: 'standard', count: 45, selected: false },
      { value: 'premium', count: 23, selected: false },
      { value: 'luxury', count: 8, selected: false },
      { value: 'suv', count: 12, selected: false },
    ],
    ratings: [
      { value: '5.0', count: 15, selected: false },
      { value: '4.5-4.9', count: 35, selected: false },
      { value: '4.0-4.4', count: 25, selected: false },
      { value: '3.5-3.9', count: 13, selected: false },
    ],
  };
}

async function getPostFacets(query: any) {
  return {
    categories: [
      { value: 'travel', count: 89, selected: false },
      { value: 'food', count: 67, selected: false },
      { value: 'lifestyle', count: 45, selected: false },
      { value: 'business', count: 34, selected: false },
    ],
  };
}

async function getUserFacets(query: any) {
  return {
    user_types: [
      { value: 'traveler', count: 234, selected: false },
      { value: 'host', count: 89, selected: false },
      { value: 'driver', count: 67, selected: false },
      { value: 'vendor', count: 45, selected: false },
    ],
  };
}

// Helper functions for filters
async function getHotelFilters(location?: string) {
  return {
    price_range: {
      type: 'range',
      min: 50,
      max: 2000,
      step: 50,
      currency: 'NGN',
      popular_ranges: [
        { label: 'Budget (₦50-200)', min: 50, max: 200 },
        { label: 'Mid-range (₦200-500)', min: 200, max: 500 },
        { label: 'Luxury (₦500+)', min: 500, max: 2000 },
      ],
    },
    star_rating: {
      type: 'multi_select',
      options: [
        { value: '5', label: '5 Stars', count: 45 },
        { value: '4', label: '4 Stars', count: 120 },
        { value: '3', label: '3 Stars', count: 89 },
        { value: '2', label: '2 Stars', count: 34 },
        { value: '1', label: '1 Star', count: 12 },
      ],
    },
    amenities: {
      type: 'multi_select',
      options: [
        { value: 'wifi', label: 'Free WiFi', count: 280, icon: 'wifi' },
        { value: 'pool', label: 'Swimming Pool', count: 156, icon: 'pool' },
        { value: 'gym', label: 'Fitness Center', count: 134, icon: 'gym' },
        { value: 'spa', label: 'Spa', count: 89, icon: 'spa' },
        { value: 'restaurant', label: 'Restaurant', count: 245, icon: 'restaurant' },
        { value: 'parking', label: 'Free Parking', count: 198, icon: 'parking' },
        { value: 'airport_shuttle', label: 'Airport Shuttle', count: 67, icon: 'shuttle' },
      ],
    },
    location: {
      type: 'single_select',
      options: [
        { value: 'victoria_island', label: 'Victoria Island', count: 89 },
        { value: 'ikoyi', label: 'Ikoyi', count: 67 },
        { value: 'lekki', label: 'Lekki', count: 123 },
        { value: 'mainland', label: 'Lagos Mainland', count: 156 },
        { value: 'ikeja', label: 'Ikeja', count: 78 },
      ],
    },
    guest_rating: {
      type: 'range',
      min: 1.0,
      max: 5.0,
      step: 0.5,
      default_min: 3.0,
    },
    property_type: {
      type: 'multi_select',
      options: [
        { value: 'hotel', label: 'Hotel', count: 234 },
        { value: 'resort', label: 'Resort', count: 45 },
        { value: 'apartment', label: 'Apartment', count: 89 },
        { value: 'guesthouse', label: 'Guest House', count: 67 },
        { value: 'boutique', label: 'Boutique Hotel', count: 23 },
      ],
    },
  };
}

async function getProductFilters(location?: string) {
  return {
    price_range: {
      type: 'range',
      min: 0,
      max: 10000,
      step: 100,
      currency: 'NGN',
    },
    category: {
      type: 'single_select',
      options: [
        { value: 'electronics', label: 'Electronics', count: 234 },
        { value: 'fashion', label: 'Fashion', count: 189 },
        { value: 'home', label: 'Home & Garden', count: 156 },
        { value: 'sports', label: 'Sports & Outdoors', count: 89 },
        { value: 'books', label: 'Books', count: 67 },
      ],
    },
    condition: {
      type: 'single_select',
      options: [
        { value: 'new', label: 'New', count: 350 },
        { value: 'used', label: 'Used', count: 89 },
        { value: 'refurbished', label: 'Refurbished', count: 15 },
      ],
    },
    brand: {
      type: 'multi_select',
      options: [
        { value: 'apple', label: 'Apple', count: 45 },
        { value: 'samsung', label: 'Samsung', count: 67 },
        { value: 'nike', label: 'Nike', count: 34 },
        { value: 'adidas', label: 'Adidas', count: 28 },
      ],
    },
    rating: {
      type: 'range',
      min: 1.0,
      max: 5.0,
      step: 0.5,
      default_min: 3.0,
    },
  };
}

async function getDriverFilters(location?: string) {
  return {
    vehicle_type: {
      type: 'single_select',
      options: [
        { value: 'standard', label: 'Standard', count: 45 },
        { value: 'premium', label: 'Premium', count: 23 },
        { value: 'luxury', label: 'Luxury', count: 8 },
        { value: 'suv', label: 'SUV', count: 12 },
      ],
    },
    rating: {
      type: 'range',
      min: 1.0,
      max: 5.0,
      step: 0.1,
      default_min: 4.0,
    },
    radius: {
      type: 'range',
      min: 1,
      max: 50,
      step: 1,
      default_value: 10,
      unit: 'km',
    },
  };
}

async function getUniversalFilters(location?: string) {
  return {
    category: {
      type: 'multi_select',
      options: [
        { value: 'hotels', label: 'Hotels', count: 300 },
        { value: 'products', label: 'Products', count: 454 },
        { value: 'drivers', label: 'Drivers', count: 88 },
        { value: 'posts', label: 'Posts', count: 235 },
        { value: 'users', label: 'Users', count: 1200 },
      ],
    },
    location: {
      type: 'single_select',
      options: [
        { value: 'lagos', label: 'Lagos', count: 1500 },
        { value: 'abuja', label: 'Abuja', count: 800 },
        { value: 'port_harcourt', label: 'Port Harcourt', count: 400 },
        { value: 'kano', label: 'Kano', count: 300 },
      ],
    },
  };
}

export default router;
