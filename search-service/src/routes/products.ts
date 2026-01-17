/**
 * Product search routes for Search Service
 */

import { Request, Response, Router } from 'express';
import { ZodError } from 'zod';
import { optionalAuth, rateLimitByUser } from '../middleware/auth.js';
import { CacheService } from '../utils/cache.js';
import { DatabaseService } from '../utils/database.js';
import { validateProductSearch } from '../utils/validation.js';

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
 * @route POST /api/v1/search/products
 * @desc Search products with advanced filters
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
      const queryParams = validateProductSearch(req.body);

      req.logger?.info('Product search initiated', {
        query: queryParams.q,
        category: queryParams.category,
        brand: queryParams.brand,
        condition: queryParams.condition,
        priceRange: {
          min: queryParams.min_price,
          max: queryParams.max_price,
        },
        inStock: queryParams.in_stock,
      });

      // Convert to SearchQuery format
      const searchQuery = {
        q: queryParams.q || '',
        category: 'products' as const,
        min_price: queryParams.min_price,
        max_price: queryParams.max_price,
        page: queryParams.page,
        limit: queryParams.limit,
        sort: queryParams.sort,
        order: queryParams.order,
        filters: {
          brand: queryParams.brand,
          condition: queryParams.condition,
          category: queryParams.category,
          location: (queryParams as any).location,
          ...(queryParams as any).filters,
        },
      };

      // Check cache first
      const cachedResults = await getCache().getSearchResults(searchQuery);
      if (cachedResults) {
        const executionTime = Date.now() - startTime;
        req.logger?.logSearchResults(cachedResults.data.total_results, true, executionTime);

        res.json(cachedResults);
        return;
      }

      // Perform product search
      const { results, total } = await getDatabase().searchProducts(searchQuery);

      const executionTime = Date.now() - startTime;

      // Build response with product-specific data
      const response = {
        success: true,
        data: {
          query: queryParams.q || '',
          category: queryParams.category || 'all',
          total_results: total,
          results: results.map(result => ({
            ...result,
            // Add product-specific fields
            specifications: result.data.specifications || {},
            seller: {
              id: result.data.seller_id,
              name: result.data.seller_name || 'Unknown Seller',
              rating: result.data.seller_rating || 0,
              location: result.data.seller_location,
              verified: result.data.seller_verified || false,
            },
            shipping: {
              free_shipping: result.data.free_shipping || false,
              estimated_delivery: result.data.estimated_delivery || '3-5 days',
              shipping_cost: result.data.shipping_cost || 0,
            },
            stock: {
              available: result.data.stock_quantity > 0,
              quantity: result.data.stock_quantity,
              low_stock: result.data.stock_quantity < 5,
            },
            original_price: result.data.original_price,
            discount_percentage: result.data.discount_percentage || 0,
            condition: result.data.condition || 'new',
            brand: result.data.brand,
          })),
          facets: {
            categories: await getCategoryFacets(searchQuery),
            brands: await getBrandFacets(searchQuery),
            price_ranges: await getPriceRangeFacets(searchQuery),
            conditions: await getConditionFacets(searchQuery),
            ratings: [
              { value: '5', count: 30, selected: false },
              { value: '4', count: 40, selected: false },
              { value: '3', count: 15, selected: false },
              { value: '2', count: 8, selected: false },
              { value: '1', count: 3, selected: false },
            ],
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
      await getCache().setSearchResults(searchQuery, response as any, 300); // 5 minutes

      req.logger?.logSearchResults(total, false, executionTime);

      res.json(response);
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (error instanceof ZodError) {
        req.logger?.warn('Product search validation error', {
          errors: error.errors,
          executionTime,
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid product search parameters',
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

      req.logger?.error('Product search failed', error as Error, { executionTime });

      res.status(500).json({
        success: false,
        error: {
          code: 'PRODUCT_SEARCH_ERROR',
          message: 'Product search operation failed',
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
 * @route GET /api/v1/search/products (legacy support)
 * @desc Search products with query parameters (legacy)
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
      const queryParams = validateProductSearch(req.query);

      req.logger?.info('Product search initiated', {
        query: queryParams.q,
        category: queryParams.category,
        brand: queryParams.brand,
        condition: queryParams.condition,
        priceRange: {
          min: queryParams.min_price,
          max: queryParams.max_price,
        },
        inStock: queryParams.in_stock,
      });

      // Convert to SearchQuery format
      const searchQuery = {
        q: queryParams.q || '',
        category: 'products' as const,
        min_price: queryParams.min_price,
        max_price: queryParams.max_price,
        page: queryParams.page,
        limit: queryParams.limit,
        sort: queryParams.sort,
        order: queryParams.order,
        filters: {
          brand: queryParams.brand,
          condition: queryParams.condition,
        },
      };

      // Check cache first
      const cachedResults = await getCache().getSearchResults(searchQuery);
      if (cachedResults) {
        const executionTime = Date.now() - startTime;
        req.logger?.logSearchResults(cachedResults.data.total_results, true, executionTime);

        res.json(cachedResults);
        return;
      }

      // Perform product search
      const { results, total } = await getDatabase().searchProducts(searchQuery);

      const executionTime = Date.now() - startTime;

      // Build response with product-specific data
      const response = {
        success: true,
        data: {
          query: queryParams.q || '',
          category: 'products' as const,
          total_results: total,
          results: results.map(result => ({
            ...result,
            // Add product-specific fields
            in_stock: result.data.stock_quantity > 0,
            stock_quantity: result.data.stock_quantity,
            vendor_id: result.data.vendor_id,
            condition: result.data.condition,
            brand: result.data.brand,
          })),
          facets: {
            categories: await getCategoryFacets(searchQuery),
            brands: await getBrandFacets(searchQuery),
            price_ranges: await getPriceRangeFacets(searchQuery),
            conditions: await getConditionFacets(searchQuery),
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
      await getCache().setSearchResults(searchQuery, response as any, 300); // 5 minutes

      req.logger?.logSearchResults(total, false, executionTime);

      res.json(response);
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (error instanceof ZodError) {
        req.logger?.warn('Product search validation error', {
          errors: error.errors,
          executionTime,
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid product search parameters',
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

      req.logger?.error('Product search failed', error as Error, { executionTime });

      res.status(500).json({
        success: false,
        error: {
          code: 'PRODUCT_SEARCH_ERROR',
          message: 'Product search operation failed',
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
 * @route GET /api/v1/search/products/categories
 * @desc Get product categories
 * @access Public
 */
router.get(
  '/categories',
  rateLimitByUser(50, 15 * 60 * 1000), // 50 requests per 15 minutes
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      // Check cache
      const cacheKey = 'product_categories';
      const cached = await getCache().get(cacheKey);

      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }

      // This would typically query the database for distinct categories
      const categories = [
        { name: 'Electronics', count: 0, slug: 'electronics' },
        { name: 'Fashion', count: 0, slug: 'fashion' },
        { name: 'Home & Garden', count: 0, slug: 'home-garden' },
        { name: 'Sports & Outdoors', count: 0, slug: 'sports-outdoors' },
        { name: 'Books', count: 0, slug: 'books' },
        { name: 'Health & Beauty', count: 0, slug: 'health-beauty' },
        { name: 'Automotive', count: 0, slug: 'automotive' },
        { name: 'Toys & Games', count: 0, slug: 'toys-games' },
      ];

      const executionTime = Date.now() - startTime;

      const response = {
        success: true,
        data: {
          categories,
          total_count: categories.length,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          execution_time_ms: executionTime,
          cached: false,
        },
      };

      // Cache for 1 hour
      await getCache().set(cacheKey, JSON.stringify(response), 3600);

      res.json(response);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      req.logger?.error('Product categories fetch failed', error as Error, { executionTime });

      res.status(500).json({
        success: false,
        error: {
          code: 'CATEGORIES_ERROR',
          message: 'Failed to fetch product categories',
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
 * @route GET /api/v1/search/products/trending
 * @desc Get trending products
 * @access Public
 */
router.get(
  '/trending',
  rateLimitByUser(50, 15 * 60 * 1000), // 50 requests per 15 minutes
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      const { category, limit = 10 } = req.query as {
        category?: string;
        limit?: number;
      };

      const searchQuery = {
        q: '',
        category: 'products' as const,
        page: 1,
        limit: Number(limit),
        sort: 'created_at' as const,
        order: 'desc' as const,
        filters: category ? { brand: category } : undefined,
      };

      // Check cache
      const cacheKey = `trending_products:${category || 'all'}:${limit}`;
      const cached = await getCache().get(cacheKey);

      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }

      const { results, total } = await getDatabase().searchProducts(searchQuery);

      const executionTime = Date.now() - startTime;

      const response = {
        success: true,
        data: {
          products: results,
          total_count: total,
          category: category || 'all',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          execution_time_ms: executionTime,
          cached: false,
        },
      };

      // Cache for 30 minutes
      await getCache().set(cacheKey, JSON.stringify(response), 1800);

      res.json(response);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      req.logger?.error('Trending products fetch failed', error as Error, { executionTime });

      res.status(500).json({
        success: false,
        error: {
          code: 'TRENDING_PRODUCTS_ERROR',
          message: 'Failed to fetch trending products',
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
 * @route GET /api/v1/search/products/brands
 * @desc Get product brands
 * @access Public
 */
router.get(
  '/brands',
  rateLimitByUser(50, 15 * 60 * 1000),
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      const { category, limit = 50 } = req.query as {
        category?: string;
        limit?: number;
      };

      // Check cache
      const cacheKey = `product_brands:${category || 'all'}:${limit}`;
      const cached = await getCache().get(cacheKey);

      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }

      // This would typically query the database for distinct brands
      const brands = [
        { name: 'Apple', count: 0, category: 'Electronics' },
        { name: 'Samsung', count: 0, category: 'Electronics' },
        { name: 'Nike', count: 0, category: 'Fashion' },
        { name: 'Adidas', count: 0, category: 'Fashion' },
        { name: 'Sony', count: 0, category: 'Electronics' },
      ]
        .filter(brand => !category || brand.category.toLowerCase() === category.toLowerCase())
        .slice(0, Number(limit));

      const executionTime = Date.now() - startTime;

      const response = {
        success: true,
        data: {
          brands,
          total_count: brands.length,
          category: category || 'all',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          execution_time_ms: executionTime,
          cached: false,
        },
      };

      // Cache for 1 hour
      await getCache().set(cacheKey, JSON.stringify(response), 3600);

      res.json(response);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      req.logger?.error('Product brands fetch failed', error as Error, { executionTime });

      res.status(500).json({
        success: false,
        error: {
          code: 'BRANDS_ERROR',
          message: 'Failed to fetch product brands',
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
async function getCategoryFacets(query: any) {
  return [
    { value: 'Electronics', count: 0, selected: false },
    { value: 'Fashion', count: 0, selected: false },
    { value: 'Home & Garden', count: 0, selected: false },
    { value: 'Sports & Outdoors', count: 0, selected: false },
  ];
}

async function getBrandFacets(query: any) {
  return [
    { value: 'Apple', count: 0, selected: false },
    { value: 'Samsung', count: 0, selected: false },
    { value: 'Nike', count: 0, selected: false },
    { value: 'Sony', count: 0, selected: false },
  ];
}

async function getPriceRangeFacets(query: any) {
  return [
    { value: '0-50', count: 0, selected: false },
    { value: '50-100', count: 0, selected: false },
    { value: '100-500', count: 0, selected: false },
    { value: '500+', count: 0, selected: false },
  ];
}

async function getConditionFacets(query: any) {
  return [
    { value: 'new', count: 0, selected: false },
    { value: 'used', count: 0, selected: false },
    { value: 'refurbished', count: 0, selected: false },
  ];
}

export default router;
