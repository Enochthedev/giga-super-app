import { createClient } from '@supabase/supabase-js';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import Redis from 'ioredis';
import winston from 'winston';

dotenv.config();

const PORT = parseInt(process.env.PORT ?? process.env.SEARCH_SERVICE_PORT ?? '3007', 10);
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

// Supabase clients for different databases
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Redis for caching
const redis = new Redis(REDIS_URL);

const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Rate limiting
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'search-service', timestamp: new Date().toISOString() });
});

// Search interface
interface SearchQuery {
  q: string;
  category?: 'all' | 'hotels' | 'products' | 'drivers' | 'posts';
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

// Unified search endpoint
app.get('/api/search', async (req: Request, res: Response) => {
  try {
    const {
      q,
      category = 'all',
      location,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20,
    } = req.query as any;

    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    // Check cache
    const cacheKey = `search:${category}:${q}:${page}:${limit}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info('Search cache hit', { query: q, category });
      return res.json({ success: true, data: JSON.parse(cached), cached: true });
    }

    const results: any = {
      query: q,
      category,
      hotels: [],
      products: [],
      drivers: [],
      posts: [],
    };

    // Search hotels
    if (category === 'all' || category === 'hotels') {
      const { data: hotels } = await supabase
        .from('hotels')
        .select('*')
        .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(category === 'all' ? 5 : +limit);
      results.hotels = hotels || [];
    }

    // Search ecommerce products
    if (category === 'all' || category === 'products') {
      const { data: products } = await supabase
        .from('ecommerce_products')
        .select('*')
        .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(category === 'all' ? 5 : +limit);
      results.products = products || [];
    }

    // Search taxi drivers
    if (category === 'all' || category === 'drivers') {
      const { data: drivers } = await supabase
        .from('taxi_drivers')
        .select('*')
        .or(`name.ilike.%${q}%,vehicle_type.ilike.%${q}%`)
        .eq('is_available', true)
        .limit(category === 'all' ? 5 : +limit);
      results.drivers = drivers || [];
    }

    // Search social posts
    if (category === 'all' || category === 'posts') {
      const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .or(`content.ilike.%${q}%`)
        .limit(category === 'all' ? 5 : +limit);
      results.posts = posts || [];
    }

    // Calculate relevance scores (simplified)
    const scoredResults = {
      ...results,
      totalResults:
        results.hotels.length +
        results.products.length +
        results.drivers.length +
        results.posts.length,
    };

    // Cache results for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(scoredResults));

    logger.info('Search completed', {
      query: q,
      category,
      totalResults: scoredResults.totalResults,
    });

    res.json({ success: true, data: scoredResults });
  } catch (error: any) {
    logger.error('Search failed', { error: error.message });
    res.status(500).json({ error: 'Search failed' });
  }
});

// Search hotels with filters
app.get('/api/search/hotels', async (req: Request, res: Response) => {
  try {
    const { q, location, minPrice, maxPrice, amenities, page = 1, limit = 20 } = req.query as any;

    let query = supabase.from('hotels').select('*', { count: 'exact' });

    if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
    if (location) query = query.ilike('location', `%${location}%`);
    if (minPrice) query = query.gte('price_per_night', minPrice);
    if (maxPrice) query = query.lte('price_per_night', maxPrice);

    const { data, count, error } = await query
      .range((+page - 1) * +limit, +page * +limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data,
      pagination: {
        page: +page,
        limit: +limit,
        total: count,
        pages: Math.ceil((count || 0) / +limit),
      },
    });
  } catch (error: any) {
    logger.error('Hotel search failed', { error: error.message });
    res.status(500).json({ error: 'Hotel search failed' });
  }
});

// Search products with filters
app.get('/api/search/products', async (req: Request, res: Response) => {
  try {
    const { q, category, minPrice, maxPrice, page = 1, limit = 20 } = req.query as any;

    let query = supabase.from('ecommerce_products').select('*', { count: 'exact' });

    if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
    if (category) query = query.eq('category', category);
    if (minPrice) query = query.gte('price', minPrice);
    if (maxPrice) query = query.lte('price', maxPrice);

    const { data, count, error } = await query
      .range((+page - 1) * +limit, +page * +limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data,
      pagination: {
        page: +page,
        limit: +limit,
        total: count,
        pages: Math.ceil((count || 0) / +limit),
      },
    });
  } catch (error: any) {
    logger.error('Product search failed', { error: error.message });
    res.status(500).json({ error: 'Product search failed' });
  }
});

// Search drivers with location
app.get('/api/search/drivers', async (req: Request, res: Response) => {
  try {
    const { q, lat, lng, radius = 10, page = 1, limit = 20 } = req.query as any;

    let query = supabase
      .from('taxi_drivers')
      .select('*', { count: 'exact' })
      .eq('is_available', true);

    if (q) query = query.or(`name.ilike.%${q}%,vehicle_type.ilike.%${q}%`);

    // TODO: Add geospatial query for lat/lng/radius using PostGIS

    const { data, count, error } = await query
      .range((+page - 1) * +limit, +page * +limit - 1)
      .order('rating', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data,
      pagination: {
        page: +page,
        limit: +limit,
        total: count,
        pages: Math.ceil((count || 0) / +limit),
      },
    });
  } catch (error: any) {
    logger.error('Driver search failed', { error: error.message });
    res.status(500).json({ error: 'Driver search failed' });
  }
});

// Clear search cache
app.delete('/api/search/cache', async (req: Request, res: Response) => {
  try {
    const keys = await redis.keys('search:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    res.json({ success: true, message: `Cleared ${keys.length} cache entries` });
  } catch (error: any) {
    logger.error('Failed to clear cache', { error: error.message });
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`Search Service started`, { port: PORT });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await redis.quit();
  process.exit(0);
});

export default app;
