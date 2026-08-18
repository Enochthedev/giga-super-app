import axios from 'axios';
import NodeCache from 'node-cache';
import CircuitBreaker from 'opossum';

import { config } from '../config/index.js';
import type { CircuitBreakerStats, HealthCheckResult, ServiceConfig } from '../types/index.js';
import { logger } from '../utils/logger.js';

interface RegisteredService extends ServiceConfig {
  matchedPattern?: string;
  pathParams?: Record<string, string>;
}

class ServiceRegistry {
  private services: Map<string, RegisteredService> = new Map();
  private healthCache: NodeCache = new NodeCache({ stdTTL: 30 });
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    logger.info('Initializing service registry');

    // Register Supabase services - using simplified patterns (prefix*)
    this.registerService('supabase-auth', {
      id: 'supabase-auth',
      name: 'Authentication Service',
      baseUrl: config.supabaseUrl,
      healthEndpoint: '/rest/v1/',
      platform: 'supabase',
      patterns: [
        '/api/v1/auth*',
        '/api/v1/user*',
        '/api/v1/users/search*',
        '/api/v1/users/profile*',
      ],
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
      },
    });

    // Hotels are now handled by Railway hotels-service
    // Keeping this as fallback for any edge functions that haven't been migrated
    this.registerService('supabase-hotels', {
      id: 'supabase-hotels',
      name: 'Hotel Core Service (Legacy)',
      baseUrl: config.supabaseUrl,
      healthEndpoint: '/rest/v1/',
      platform: 'supabase',
      patterns: ['/api/v1/hotel-legacy*', '/api/v1/room*'],
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
      },
    });

    // Payments (/api/v1/payments*) MIGRATED to Railway payment-queue-service
    // (railway-payment). This entry is narrowed to wallet only so it no longer
    // shadows railway-payment (registered later), matching the notifications
    // migration pattern.
    this.registerService('supabase-payments', {
      id: 'supabase-payments',
      name: 'Wallet Core Service',
      baseUrl: config.supabaseUrl,
      healthEndpoint: '/rest/v1/',
      platform: 'supabase',
      patterns: ['/api/v1/wallet*'],
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
      },
    });

    this.registerService('supabase-ecommerce', {
      id: 'supabase-ecommerce',
      name: 'Ecommerce Core Service',
      baseUrl: config.supabaseUrl,
      healthEndpoint: '/rest/v1/',
      platform: 'supabase',
      patterns: ['/api/v1/product*', '/api/v1/cart*', '/api/v1/order*'],
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
      },
    });

    // Taxi service is now handled by Railway taxi-realtime-service
    // Keeping this as fallback for any edge functions that haven't been migrated
    this.registerService('supabase-taxi', {
      id: 'supabase-taxi',
      name: 'Taxi Core Service (Legacy)',
      baseUrl: config.supabaseUrl,
      healthEndpoint: '/rest/v1/',
      platform: 'supabase',
      patterns: ['/api/v1/taxi-legacy*'],
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
      },
    });

    // Notifications — MIGRATED to Railway notifications-service (registered below).
    // The supabase-notifications edge-function entry has been retired so it no
    // longer shadows railway-notifications (which was registered after it).

    // Ads service (Supabase functions)
    this.registerService('supabase-ads', {
      id: 'supabase-ads',
      name: 'Ads Service',
      baseUrl: config.supabaseUrl,
      healthEndpoint: '/rest/v1/',
      platform: 'supabase',
      // V6: '/api/v1/campaigns*' removed — that prefix belongs to notifications-service
      // campaigns; ad campaigns live under '/api/v1/ads/campaigns'.
      patterns: ['/api/v1/ads*', '/api/v1/advertiser*'],
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
      },
    });

    // Register Railway services - using simplified patterns (prefix*)
    if (config.services.social) {
      this.registerService('railway-social', {
        id: 'railway-social',
        name: 'Social Media Service',
        baseUrl: config.services.social,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: [
          '/api/v1/social*',
          '/api/v1/post*',
          '/api/v1/comment*',
          '/api/v1/like*',
          '/api/v1/feed*',
          '/api/v1/stor*',
          '/api/v1/share*',
          '/api/v1/connection*', // E6: connections router was unreachable (SERVICE_NOT_FOUND)
          '/api/v1/tenant*', // V5: tenant-posts router was unreachable (SERVICE_NOT_FOUND)
        ],
      });
    }

    if (config.services.admin) {
      this.registerService('railway-admin', {
        id: 'railway-admin',
        name: 'Admin Service',
        baseUrl: config.services.admin,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: [
          '/api/v1/admin*',
          '/api/v1/dashboard*',
          '/api/v1/nipost*',
          '/api/nipost-admin*',
          // Note: /api/v1/ads* goes to Supabase for user-facing operations
          '/api/v1/campaign*',
          '/api/v1/advertiser*',
          // GIGA Dashboard API patterns
          '/api/dashboard*',
          '/api/admin*',
          '/api/ecommerce*',
          '/api/taxi*',
          '/api/hotel*',
          '/api/media*',
          '/api/postal-monitoring*',
          '/api/postal*',
          '/api/delivery*',
          '/api/operations*',
          '/api/managers*',
          '/api/ads*', // Admin ads management (approve/reject/incoming)
          '/api/pending-entries*',
          '/api/public*', // V5: citizen-facing apply/my-applications endpoints were unreachable
          '/api/roles*', // Role application review (approve/reject)
          '/api/v1/roles/review*', // Legacy path for role application review
        ],
      });
    }

    if (config.services.search) {
      this.registerService('railway-search', {
        id: 'railway-search',
        name: 'Search Service',
        baseUrl: config.services.search,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: [
          '/api/v1/search*',
          // Product routes - handled by search service
          '/api/v1/products/search*',
          '/api/v1/products/categories*',
          '/api/v1/products/trending*',
          '/api/v1/products/brands*',
        ],
      });
    }

    if (config.services.hotels) {
      this.registerService('railway-hotels', {
        id: 'railway-hotels',
        name: 'Hotels Service',
        baseUrl: config.services.hotels,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: [
          '/api/v1/bookings*',
          '/api/v1/favorites*',
          '/api/v1/reviews*',
          '/api/v1/management*',
          '/api/v1/hotels*',
        ],
      });
    }

    if (config.services.payment) {
      this.registerService('railway-payment', {
        id: 'railway-payment',
        name: 'Payment Queue Service',
        baseUrl: config.services.payment,
        healthEndpoint: '/health',
        platform: 'railway',
        // Wallet stays on edge (supabase-payments) for now; payments migrated here.
        patterns: [
          '/api/v1/payments*',
          '/api/v1/payment-queue*',
          '/api/v1/webhooks*', // V5: Paystack/Stripe callbacks were unreachable
          '/api/v1/admin/payments*', // V6: was swallowed by admin-service's '/api/v1/admin*'
          // V8: these two wallet routes exist ONLY in payment-queue-service. The broad
          // '/api/v1/wallet*' pattern on supabase-payments was claiming them and they
          // 503'd. topup/pay stay on the edge functions, which do work; these are more
          // specific so the specificity match sends just them here.
          '/api/v1/wallet/transactions*',
          '/api/v1/wallet/topup/verify*',
        ],
      });
    }

    // Note: Ads functionality is handled by the Admin Service
    if (config.services.ads) {
      this.registerService('railway-ads', {
        id: 'railway-ads',
        name: 'Ads Service (Future)',
        baseUrl: config.services.ads,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: ['/api/v1/ads-future*'],
      });
    }

    if (config.services.media) {
      this.registerService('railway-media', {
        id: 'railway-media',
        name: 'Media Processing Service',
        baseUrl: config.services.media,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: ['/api/v1/media*', '/api/v1/file*', '/api/v1/image*'],
      });
    }

    if (config.services.communication) {
      this.registerService('railway-communication', {
        id: 'railway-communication',
        name: 'Communication Service',
        baseUrl: config.services.communication,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: ['/api/v1/notification*', '/api/v1/sms*', '/api/v1/email*'],
      });
    }

    if (config.services.delivery) {
      this.registerService('railway-delivery', {
        id: 'railway-delivery',
        name: 'Delivery Service',
        baseUrl: config.services.delivery,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: [
          '/api/v1/delivery*',
          '/api/v1/courier*',
          '/api/v1/package*',
          '/api/v1/assignment*',
          '/api/v1/tracking*',
          '/api/v1/track-delivery*', // V5: was unreachable
          '/api/v1/scheduler*', // V5: was unreachable
          '/api/v1/websocket*', // V5: was unreachable
        ],
      });
    }

    if (config.services.notifications) {
      this.registerService('railway-notifications', {
        id: 'railway-notifications',
        name: 'Notifications Service',
        baseUrl: config.services.notifications,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: [
          '/api/v1/notifications*',
          '/api/v1/push*',
          '/api/v1/alert*',
          // Other routers mounted by notifications-service (previously unclaimed)
          '/api/v1/preferences*',
          '/api/v1/templates*',
          '/api/v1/analytics*', // E20: notification analytics router was unreachable (SERVICE_NOT_FOUND)
          // V6: these are notification tracking routes; delivery owns the broader
          // '/api/v1/tracking*' for assignment tracking, so claim these explicitly.
          '/api/v1/tracking/open*',
          '/api/v1/tracking/click*',
          '/api/v1/tracking/webhook*',
          '/api/v1/tracking/health*',
          '/api/v1/campaigns*', // V6: was swallowed by supabase-ads (503)
        ],
      });
    }

    if (config.services.taxiRealtime) {
      this.registerService('railway-taxi-realtime', {
        id: 'railway-taxi-realtime',
        name: 'Taxi Realtime Service',
        baseUrl: config.services.taxiRealtime,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: [
          // All taxi/ride routes now go to Railway taxi-realtime-service
          // Support both /api/v1/rides and /api/rides paths
          '/api/v1/rides*',
          '/api/v1/ride*',
          '/api/rides*',
          '/api/ride*',
          '/api/v1/drivers*',
          '/api/v1/driver*',
          '/api/drivers*',
          '/api/driver*',
          '/api/v1/taxi*',
          '/api/v1/taxi-realtime*',
          '/api/v1/driver-location*',
        ],
      });
    }

    this.initialized = true;
    logger.info(`Service registry initialized with ${this.services.size} services`);
  }

  registerService(id: string, serviceConfig: ServiceConfig): void {
    this.services.set(id, {
      ...serviceConfig,
      healthy: true,
      lastHealthCheck: null,
    });

    logger.debug(`Registered service: ${id}`, {
      name: serviceConfig.name,
      platform: serviceConfig.platform,
      patterns: serviceConfig.patterns,
    });
  }

  findServiceForPath(path: string): RegisteredService | null {
    // V6: pick the MOST SPECIFIC matching pattern, not simply the first-registered one.
    //
    // With first-match-wins, a broad prefix registered early silently swallowed routes
    // belonging to a service registered later — e.g. delivery's '/api/v1/tracking*' took
    // notifications' '/api/v1/tracking/open|click|webhook' (404), and admin's
    // '/api/v1/admin*' took payment-queue's '/api/v1/admin/payments/*' (404).
    // Specificity = length of the pattern's literal prefix before the first wildcard,
    // so '/api/v1/tracking/open*' (21) beats '/api/v1/tracking*' (16).
    let best: RegisteredService | null = null;
    let bestScore = -1;

    for (const service of this.services.values()) {
      for (const pattern of service.patterns) {
        if (!this.matchPattern(path, pattern)) continue;

        const wildcardAt = pattern.indexOf('*');
        const score = wildcardAt === -1 ? pattern.length + 1000 : wildcardAt;

        if (score > bestScore) {
          bestScore = score;
          best = {
            ...service,
            matchedPattern: pattern,
            pathParams: {},
          };
        }
      }
    }

    return best;
  }

  private matchPattern(path: string, pattern: string): boolean {
    const regexPattern = pattern.replace(/\*/g, '.*').replace(/\//g, '\\/');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  async checkServiceHealth(serviceId: string): Promise<HealthCheckResult> {
    const cacheKey = `health_${serviceId}`;
    const cached = this.healthCache.get<HealthCheckResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const service = this.services.get(serviceId);
    if (!service) {
      return { healthy: false, error: 'Service not found', lastCheck: new Date().toISOString() };
    }

    try {
      const targetUrl = `${service.baseUrl}${service.healthEndpoint}`;
      const response = await axios.get(targetUrl, {
        timeout: config.healthCheckTimeoutMs,
        headers: service.headers ?? {},
        validateStatus: status => status < 500,
      });

      const healthy = response.status < 400;
      const result: HealthCheckResult = {
        healthy,
        status: response.status,
        responseTime: (response.headers['x-response-time'] as string) ?? 'unknown',
        lastCheck: new Date().toISOString(),
      };

      service.healthy = healthy;
      service.lastHealthCheck = new Date();
      this.healthCache.set(cacheKey, result);

      return result;
    } catch (error) {
      let errorMessage = 'Unknown error';
      if (axios.isAxiosError(error)) {
        errorMessage = `${error.message} (${error.code}) accessing ${service.baseUrl}${service.healthEndpoint}`;
        if (error.response) {
          errorMessage += ` - Status: ${error.response.status}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      const result: HealthCheckResult = {
        healthy: false,
        error: errorMessage,
        lastCheck: new Date().toISOString(),
      };

      logger.error(`Health check failed for ${serviceId}`, {
        error: errorMessage,
        serviceUrl: service.baseUrl,
      });

      service.healthy = false;
      service.lastHealthCheck = new Date();
      this.healthCache.set(cacheKey, result, 10);

      return result;
    }
  }

  async checkAllServicesHealth(): Promise<
    Record<string, HealthCheckResult & { name: string; platform: string }>
  > {
    const healthChecks: Record<string, HealthCheckResult & { name: string; platform: string }> = {};

    for (const [id, service] of this.services) {
      const health = await this.checkServiceHealth(id);
      healthChecks[id] = {
        name: service.name,
        platform: service.platform,
        ...health,
      };
    }

    return healthChecks;
  }

  getService(id: string): RegisteredService | undefined {
    return this.services.get(id);
  }

  getAllServices(): RegisteredService[] {
    return Array.from(this.services.values());
  }

  getServiceCount(): number {
    return this.services.size;
  }

  isReady(): boolean {
    return this.initialized;
  }

  getHealthyServices(): RegisteredService[] {
    return Array.from(this.services.values()).filter(service => service.healthy);
  }

  getUnhealthyServices(): RegisteredService[] {
    return Array.from(this.services.values()).filter(service => !service.healthy);
  }

  isServiceHealthy(serviceName: string): boolean {
    // Map service names to service IDs
    const serviceIdMap: Record<string, string> = {
      social: 'railway-social',
      admin: 'railway-admin',
      search: 'railway-search',
      payment: 'railway-payment',
      delivery: 'railway-delivery',
      notifications: 'railway-notifications',
      taxiRealtime: 'railway-taxi-realtime',
      hotels: 'railway-hotels',
    };

    const serviceId = serviceIdMap[serviceName] || serviceName;
    const service = this.services.get(serviceId);
    return service?.healthy ?? false;
  }

  getCircuitBreaker(serviceId: string): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceId)) {
      const service = this.services.get(serviceId);

      const breaker = new CircuitBreaker(async <T>(operation: () => Promise<T>) => operation(), {
        timeout: config.serviceTimeoutMs,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        name: serviceId,
      });

      breaker.on('open', () => {
        logger.error(`Circuit breaker opened for service: ${serviceId}`, {
          serviceId,
          serviceName: service?.name,
        });
        if (service) {
          service.healthy = false;
        }
      });

      breaker.on('halfOpen', () => {
        logger.warn(`Circuit breaker half-open for service: ${serviceId}`);
      });

      breaker.on('close', () => {
        logger.info(`Circuit breaker closed for service: ${serviceId}`);
        if (service) {
          service.healthy = true;
        }
      });

      breaker.fallback(() => {
        throw new Error(`Service ${serviceId} is currently unavailable`);
      });

      this.circuitBreakers.set(serviceId, breaker);
    }

    return this.circuitBreakers.get(serviceId)!;
  }

  getCircuitBreakerStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};

    for (const [serviceId, breaker] of this.circuitBreakers) {
      const breakerStats = breaker.stats;
      stats[serviceId] = {
        state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
        failures: breakerStats.failures ?? 0,
        successes: breakerStats.successes ?? 0,
        fallbacks: breakerStats.fallbacks ?? 0,
        timeouts: breakerStats.timeouts ?? 0,
        fires: breakerStats.fires ?? 0,
        rejects: breakerStats.rejects ?? 0,
        latencyMean: breakerStats.latencyMean ?? 0,
        percentiles: breakerStats.percentiles ?? {},
      };
    }

    return stats;
  }

  async getServiceStats() {
    const services: Record<string, unknown> = {};

    for (const [id, service] of this.services) {
      const health = await this.checkServiceHealth(id);
      services[id] = {
        name: service.name,
        platform: service.platform,
        patterns: service.patterns,
        health,
        lastHealthCheck: service.lastHealthCheck,
      };
    }

    return {
      services,
      circuitBreakers: this.getCircuitBreakerStats(),
      totalServices: this.services.size,
      healthyServices: this.getHealthyServices().length,
      unhealthyServices: this.getUnhealthyServices().length,
    };
  }
}

export const serviceRegistry = new ServiceRegistry();
