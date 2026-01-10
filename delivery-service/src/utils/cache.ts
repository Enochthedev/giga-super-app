import NodeCache from 'node-cache';

import logger from './logger';

class CacheManager {
  private static instance: CacheManager;
  private cache: NodeCache;

  private constructor() {
    const ttl = parseInt(process.env['CACHE_TTL'] || '300'); // 5 minutes default
    const maxKeys = parseInt(process.env['CACHE_MAX_KEYS'] || '1000');

    this.cache = new NodeCache({
      stdTTL: ttl,
      maxKeys,
      checkperiod: ttl * 0.2, // Check for expired keys every 20% of TTL
      useClones: false, // Better performance, but be careful with object mutations
    });

    // Log cache events
    this.cache.on('set', (key, value) => {
      logger.debug('Cache set', { key, size: JSON.stringify(value).length });
    });

    this.cache.on('del', (key, _value) => {
      logger.debug('Cache delete', { key });
    });

    this.cache.on('expired', (key, _value) => {
      logger.debug('Cache expired', { key });
    });

    logger.info('Cache manager initialized', { ttl, maxKeys });
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  public get<T>(key: string): T | undefined {
    try {
      const value = this.cache.get<T>(key);
      if (value !== undefined) {
        logger.debug('Cache hit', { key });
      } else {
        logger.debug('Cache miss', { key });
      }
      return value;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return undefined;
    }
  }

  public set<T>(key: string, value: T, ttl?: number): boolean {
    try {
      const success = this.cache.set(key, value, ttl || 0);
      if (success) {
        logger.debug('Cache set successful', { key, ttl });
      } else {
        logger.warn('Cache set failed', { key, ttl });
      }
      return success;
    } catch (error) {
      logger.error('Cache set error', { key, error });
      return false;
    }
  }

  public del(key: string): number {
    try {
      const deletedCount = this.cache.del(key);
      logger.debug('Cache delete', { key, deletedCount });
      return deletedCount;
    } catch (error) {
      logger.error('Cache delete error', { key, error });
      return 0;
    }
  }

  public flush(): void {
    try {
      this.cache.flushAll();
      logger.info('Cache flushed');
    } catch (error) {
      logger.error('Cache flush error', { error });
    }
  }

  public getStats() {
    return {
      keys: this.cache.keys().length,
      stats: this.cache.getStats(),
    };
  }

  // Helper methods for common cache patterns
  public async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const value = await fetcher();
      this.set(key, value, ttl);
      return value;
    } catch (error) {
      logger.error('Cache getOrSet fetcher error', { key, error });
      throw error;
    }
  }

  public invalidatePattern(pattern: string): number {
    try {
      const keys = this.cache.keys();
      const regex = new RegExp(pattern);
      const matchingKeys = keys.filter(key => regex.test(key));

      if (matchingKeys.length > 0) {
        const deletedCount = this.cache.del(matchingKeys);
        logger.info('Cache pattern invalidation', { pattern, deletedCount });
        return deletedCount;
      }

      return 0;
    } catch (error) {
      logger.error('Cache pattern invalidation error', { pattern, error });
      return 0;
    }
  }

  // Cache key generators for consistent naming
  public static keys = {
    courierProfile: (courierId: string) => `courier:profile:${courierId}`,
    courierAssignments: (courierId: string, status?: string) =>
      `courier:assignments:${courierId}${status ? `:${status}` : ''}`,
    deliveryAssignment: (assignmentId: string) => `delivery:assignment:${assignmentId}`,
    routeOptimization: (courierId: string, assignmentIds: string[]) =>
      `route:optimization:${courierId}:${assignmentIds.sort().join(',')}`,
    routeOptimizationById: (routeId: string) => `route:optimization:id:${routeId}`,
    routeAdjustment: (routeId: string, reason: string) => `route:adjustment:${routeId}:${reason}`,
    trafficConditions: (waypoints: string) => `traffic:conditions:${waypoints}`,
    distanceMatrix: (origins: string, destinations: string) =>
      `distance:matrix:${origins}:${destinations}`,
    nearbyDrivers: (lat: number, lng: number, radius: number) =>
      `drivers:nearby:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}`,
    deliveryTracking: (assignmentId: string) => `delivery:tracking:${assignmentId}`,
    courierEfficiency: (courierId: string, days: number) =>
      `courier:efficiency:${courierId}:${days}`,
    routeAlternatives: (routeId: string) => `route:alternatives:${routeId}`,
  };
}

// Export singleton instance
export const cache = CacheManager.getInstance();
export const CacheKeys = CacheManager.keys;
export default CacheManager.getInstance();
