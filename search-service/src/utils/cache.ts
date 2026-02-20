/**
 * Caching utilities for Search Service
 * Supports both Redis (production) and NodeCache (development) backends
 */

import Redis from 'ioredis';
import NodeCache from 'node-cache';
import { AutocompleteResponse, SearchQuery, SearchResponse } from '../types/index.js';

/**
 * Check if Redis should be used
 * Disable for free tiers to avoid eviction policy issues
 */
const shouldUseRedis = (): boolean => {
  const redisUrl = process.env.REDIS_URL;
  const forceDisable = process.env.DISABLE_REDIS === 'true';
  const forceEnable = process.env.FORCE_REDIS === 'true';

  // Force enable overrides everything
  if (forceEnable && redisUrl) {
    return true;
  }

  // Disable if explicitly disabled, no URL, or local dev URL
  if (forceDisable || !redisUrl || redisUrl === 'redis://localhost:6379') {
    return false;
  }

  // Auto-disable for known free tier Redis providers
  const freeRedisPatterns = ['redis-cloud.com', 'redis.cloud', 'upstash.io', 'redislabs.com'];

  const isFreeTier = freeRedisPatterns.some(pattern => redisUrl.includes(pattern));

  if (isFreeTier && !forceEnable) {
    console.log('Free Redis tier detected - using NodeCache instead');
    return false;
  }

  return true;
};

export class CacheService {
  private redis: Redis | null = null;
  private nodeCache: NodeCache;
  private defaultTTL: number = 300; // 5 minutes
  private isConnected: boolean = false;
  private useRedis: boolean;

  constructor(redisUrl?: string) {
    this.useRedis = shouldUseRedis();

    // Always create NodeCache as fallback
    this.nodeCache = new NodeCache({
      stdTTL: this.defaultTTL,
      checkperiod: 60,
      useClones: false, // Better performance
    });

    if (this.useRedis && redisUrl) {
      this.initRedis(redisUrl);
    } else {
      console.log('Cache service using NodeCache (in-memory) - Redis disabled');
      this.isConnected = true; // NodeCache is always "connected"
    }
  }

  private initRedis(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true, // Don't connect until first command
      enableReadyCheck: false, // Save commands
      enableOfflineQueue: false, // Don't queue when offline
      connectTimeout: 10000,
      retryStrategy: (times: number) => {
        if (times > 5) {
          console.error('Redis connection failed after 5 retries, falling back to NodeCache');
          this.useRedis = false;
          return null;
        }
        const delay = Math.min(times * 500, 3000);
        console.log(`Redis retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      },
    });

    this.redis.on('error', error => {
      console.error('Redis connection error:', error.message);
      this.isConnected = false;
      // Fall back to NodeCache on error
      this.useRedis = false;
    });

    this.redis.on('connect', () => {
      console.log('Redis connected');
    });

    this.redis.on('ready', () => {
      console.log('Redis ready');
      this.isConnected = true;
      this.useRedis = true;
    });

    this.redis.on('close', () => {
      console.warn('Redis connection closed, using NodeCache fallback');
      this.isConnected = false;
    });
  }

  /**
   * Generate cache key for search query
   */
  private generateSearchCacheKey(query: SearchQuery): string {
    const keyParts = [
      'search',
      query.category || 'all',
      query.q || '',
      query.location || '',
      query.min_price || '',
      query.max_price || '',
      query.page || 1,
      query.limit || 20,
      query.sort || 'relevance',
      query.order || 'desc',
      JSON.stringify(query.filters || {}),
    ];

    return keyParts.join(':').replace(/[^a-zA-Z0-9:_-]/g, '_');
  }

  /**
   * Generate cache key for autocomplete query
   */
  private generateAutocompleteCacheKey(query: string, category: string, limit: number): string {
    return `autocomplete:${category}:${query.replace(/[^a-zA-Z0-9]/g, '_')}:${limit}`;
  }

  /**
   * Get cached search results
   */
  async getSearchResults(query: SearchQuery): Promise<SearchResponse | null> {
    try {
      const cacheKey = this.generateSearchCacheKey(query);

      if (this.useRedis && this.redis) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          const result = JSON.parse(cached) as SearchResponse;
          result.metadata.cached = true;
          return result;
        }
      } else {
        const cached = this.nodeCache.get<SearchResponse>(cacheKey);
        if (cached) {
          cached.metadata.cached = true;
          return cached;
        }
      }

      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Cache search results
   */
  async setSearchResults(query: SearchQuery, results: SearchResponse, ttl?: number): Promise<void> {
    try {
      const cacheKey = this.generateSearchCacheKey(query);
      const cacheTTL = ttl || this.defaultTTL;

      if (this.useRedis && this.redis) {
        await this.redis.setex(cacheKey, cacheTTL, JSON.stringify(results));
      } else {
        this.nodeCache.set(cacheKey, results, cacheTTL);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Get cached autocomplete results
   */
  async getAutocompleteResults(
    query: string,
    category: string,
    limit: number
  ): Promise<AutocompleteResponse | null> {
    try {
      const cacheKey = this.generateAutocompleteCacheKey(query, category, limit);

      if (this.useRedis && this.redis) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as AutocompleteResponse;
        }
      } else {
        return this.nodeCache.get<AutocompleteResponse>(cacheKey) || null;
      }

      return null;
    } catch (error) {
      console.error('Autocomplete cache get error:', error);
      return null;
    }
  }

  /**
   * Cache autocomplete results
   */
  async setAutocompleteResults(
    query: string,
    category: string,
    limit: number,
    results: AutocompleteResponse,
    ttl?: number
  ): Promise<void> {
    try {
      const cacheKey = this.generateAutocompleteCacheKey(query, category, limit);
      const cacheTTL = ttl || this.defaultTTL;

      if (this.useRedis && this.redis) {
        await this.redis.setex(cacheKey, cacheTTL, JSON.stringify(results));
      } else {
        this.nodeCache.set(cacheKey, results, cacheTTL);
      }
    } catch (error) {
      console.error('Autocomplete cache set error:', error);
    }
  }

  /**
   * Invalidate search cache by pattern
   */
  async invalidateSearchCache(pattern?: string): Promise<number> {
    try {
      if (this.useRedis && this.redis) {
        const searchPattern = pattern || 'search:*';
        const keys = await this.redis.keys(searchPattern);

        if (keys.length > 0) {
          await this.redis.del(...keys);
        }

        return keys.length;
      } else {
        // NodeCache: delete all keys matching pattern
        const keys = this.nodeCache
          .keys()
          .filter(k => (pattern ? k.includes(pattern.replace('*', '')) : k.startsWith('search:')));
        keys.forEach(k => this.nodeCache.del(k));
        return keys.length;
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
      return 0;
    }
  }

  /**
   * Invalidate autocomplete cache
   */
  async invalidateAutocompleteCache(): Promise<number> {
    try {
      if (this.useRedis && this.redis) {
        const keys = await this.redis.keys('autocomplete:*');

        if (keys.length > 0) {
          await this.redis.del(...keys);
        }

        return keys.length;
      } else {
        const keys = this.nodeCache.keys().filter(k => k.startsWith('autocomplete:'));
        keys.forEach(k => this.nodeCache.del(k));
        return keys.length;
      }
    } catch (error) {
      console.error('Autocomplete cache invalidation error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    total_keys: number;
    search_keys: number;
    autocomplete_keys: number;
    memory_usage: string;
    backend: string;
  }> {
    try {
      if (this.useRedis && this.redis) {
        const [totalKeys, searchKeys, autocompleteKeys] = await Promise.all([
          this.redis.dbsize(),
          this.redis.keys('search:*').then(keys => keys.length),
          this.redis.keys('autocomplete:*').then(keys => keys.length),
        ]);

        // Skip memory usage call to save commands
        return {
          total_keys: totalKeys,
          search_keys: searchKeys,
          autocomplete_keys: autocompleteKeys,
          memory_usage: 'N/A (skipped to save commands)',
          backend: 'redis',
        };
      } else {
        const allKeys = this.nodeCache.keys();
        const stats = this.nodeCache.getStats();

        return {
          total_keys: allKeys.length,
          search_keys: allKeys.filter(k => k.startsWith('search:')).length,
          autocomplete_keys: allKeys.filter(k => k.startsWith('autocomplete:')).length,
          memory_usage: `${Math.round(stats.ksize / 1024)} KB (keys) + ${Math.round(stats.vsize / 1024)} KB (values)`,
          backend: 'node-cache',
        };
      }
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        total_keys: 0,
        search_keys: 0,
        autocomplete_keys: 0,
        memory_usage: '0 MB',
        backend: this.useRedis ? 'redis' : 'node-cache',
      };
    }
  }

  /**
   * Health check for cache service
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (this.useRedis && this.redis) {
        const result = await this.redis.ping();
        return result === 'PONG';
      } else {
        // NodeCache is always healthy if it exists
        return true;
      }
    } catch (error) {
      console.error('Cache health check failed:', error);
      // Fall back to NodeCache
      this.useRedis = false;
      return true; // NodeCache fallback is healthy
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.quit();
      }
      this.nodeCache.close();
    } catch (error) {
      console.error('Error closing cache connections:', error);
    }
  }

  /**
   * Generic get method for cache
   */
  async get(key: string): Promise<string | null> {
    try {
      if (this.useRedis && this.redis) {
        return await this.redis.get(key);
      } else {
        return this.nodeCache.get<string>(key) || null;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Generic set method for cache
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (this.useRedis && this.redis) {
        if (ttl) {
          await this.redis.setex(key, ttl, value);
        } else {
          await this.redis.set(key, value);
        }
      } else {
        this.nodeCache.set(key, value, ttl || this.defaultTTL);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Get current backend type
   */
  getBackendType(): string {
    return this.useRedis ? 'redis' : 'node-cache';
  }
}
