/**
 * Caching utilities for Search Service
 */

import Redis from 'ioredis';
import { AutocompleteResponse, SearchQuery, SearchResponse } from '../types/index.js';

export class CacheService {
  private redis: Redis;
  private defaultTTL: number = 300; // 5 minutes
  private isConnected: boolean = false;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
      enableReadyCheck: true,
      connectTimeout: 10000,
      retryStrategy: (times: number) => {
        if (times > 10) {
          console.error('Redis connection failed after 10 retries');
          return null;
        }
        const delay = Math.min(times * 200, 2000);
        console.log(`Redis retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      },
    });

    this.redis.on('error', error => {
      console.error('Redis connection error:', error.message);
      this.isConnected = false;
    });

    this.redis.on('connect', () => {
      console.log('Redis connected');
    });

    this.redis.on('ready', () => {
      console.log('Redis ready');
      this.isConnected = true;
    });

    this.redis.on('close', () => {
      console.warn('Redis connection closed');
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
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        const result = JSON.parse(cached) as SearchResponse;
        result.metadata.cached = true;
        return result;
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
      const cacheValue = JSON.stringify(results);

      await this.redis.setex(cacheKey, ttl || this.defaultTTL, cacheValue);
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
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached) as AutocompleteResponse;
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
      const cacheValue = JSON.stringify(results);

      await this.redis.setex(cacheKey, ttl || this.defaultTTL, cacheValue);
    } catch (error) {
      console.error('Autocomplete cache set error:', error);
    }
  }

  /**
   * Invalidate search cache by pattern
   */
  async invalidateSearchCache(pattern?: string): Promise<number> {
    try {
      const searchPattern = pattern || 'search:*';
      const keys = await this.redis.keys(searchPattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      return keys.length;
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
      const keys = await this.redis.keys('autocomplete:*');

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      return keys.length;
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
  }> {
    try {
      const [totalKeys, searchKeys, autocompleteKeys, memoryInfo] = await Promise.all([
        this.redis.dbsize(),
        this.redis.keys('search:*').then(keys => keys.length),
        this.redis.keys('autocomplete:*').then(keys => keys.length),
        this.redis.memory('usage'),
      ]);

      return {
        total_keys: totalKeys,
        search_keys: searchKeys,
        autocomplete_keys: autocompleteKeys,
        memory_usage: `${Math.round((memoryInfo / 1024 / 1024) * 100) / 100} MB`,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        total_keys: 0,
        search_keys: 0,
        autocomplete_keys: 0,
        memory_usage: '0 MB',
      };
    }
  }

  /**
   * Health check for cache service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Cache health check failed:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }

  /**
   * Set cache TTL based on query complexity
   */
  private calculateTTL(query: SearchQuery): number {
    let ttl = this.defaultTTL;

    // Longer cache for simple queries
    if (!query.filters || Object.keys(query.filters).length === 0) {
      ttl = 600; // 10 minutes
    }

    // Shorter cache for location-based queries (data changes frequently)
    if (query.filters?.latitude && query.filters?.longitude) {
      ttl = 60; // 1 minute
    }

    // Shorter cache for real-time data (drivers, posts)
    if (query.category === 'drivers' || query.category === 'posts') {
      ttl = 30; // 30 seconds
    }

    return ttl;
  }

  /**
   * Generic get method for cache
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
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
      if (ttl) {
        await this.redis.setex(key, ttl, value);
      } else {
        await this.redis.set(key, value);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Warm up cache with popular searches
   */
  async warmUpCache(popularQueries: SearchQuery[]): Promise<void> {
    console.log(`Warming up cache with ${popularQueries.length} popular queries...`);

    for (const query of popularQueries) {
      try {
        // Check if already cached
        const cached = await this.getSearchResults(query);
        if (!cached) {
          // This would typically trigger a search and cache the results
          console.log(`Cache miss for query: ${query.q}, category: ${query.category}`);
        }
      } catch (error) {
        console.error(`Failed to warm up cache for query: ${query.q}`, error);
      }
    }
  }
}
