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

    // Register Supabase services
    this.registerService('supabase-auth', {
      id: 'supabase-auth',
      name: 'Authentication Service',
      baseUrl: config.supabaseUrl,
      healthEndpoint: '/rest/v1/',
      platform: 'supabase',
      patterns: ['/api/v1/auth/*', '/api/v1/users/*'],
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
      },
    });

    this.registerService('supabase-hotels', {
      id: 'supabase-hotels',
      name: 'Hotel Core Service',
      baseUrl: config.supabaseUrl,
      healthEndpoint: '/rest/v1/',
      platform: 'supabase',
      patterns: ['/api/v1/hotels/*', '/api/v1/bookings/*', '/api/v1/rooms/*'],
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
      },
    });

    this.registerService('supabase-payments', {
      id: 'supabase-payments',
      name: 'Payment Core Service',
      baseUrl: config.supabaseUrl,
      healthEndpoint: '/rest/v1/',
      platform: 'supabase',
      patterns: ['/api/v1/payments/*', '/api/v1/wallet/*'],
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
      patterns: ['/api/v1/products/*', '/api/v1/cart/*', '/api/v1/orders/*'],
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
      },
    });

    this.registerService('supabase-taxi', {
      id: 'supabase-taxi',
      name: 'Taxi Core Service',
      baseUrl: config.supabaseUrl,
      healthEndpoint: '/rest/v1/',
      platform: 'supabase',
      patterns: ['/api/v1/rides/*', '/api/v1/drivers/*'],
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
      },
    });

    // Register Railway services
    if (config.services.social) {
      this.registerService('railway-social', {
        id: 'railway-social',
        name: 'Social Media Service',
        baseUrl: config.services.social,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: [
          '/api/v1/social/*',
          '/api/v1/posts/*',
          '/api/v1/comments/*',
          '/api/v1/likes/*',
          '/api/v1/feed/*',
          '/api/v1/stories/*',
          '/api/v1/shares/*',
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
        patterns: ['/api/v1/admin/*', '/api/v1/dashboard/*', '/api/v1/nipost/*'],
      });
    }

    if (config.services.search) {
      this.registerService('railway-search', {
        id: 'railway-search',
        name: 'Search Service',
        baseUrl: config.services.search,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: ['/api/v1/search/*'],
      });
    }

    if (config.services.payment) {
      this.registerService('railway-payment', {
        id: 'railway-payment',
        name: 'Payment Queue Service',
        baseUrl: config.services.payment,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: ['/api/v1/payment-queue/*'],
      });
    }

    if (config.services.ads) {
      this.registerService('railway-ads', {
        id: 'railway-ads',
        name: 'Ads Service',
        baseUrl: config.services.ads,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: ['/api/v1/ads/*', '/api/v1/campaigns/*', '/api/v1/advertisers/*'],
      });
    }

    if (config.services.media) {
      this.registerService('railway-media', {
        id: 'railway-media',
        name: 'Media Processing Service',
        baseUrl: config.services.media,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: ['/api/v1/media/*', '/api/v1/files/*', '/api/v1/images/*'],
      });
    }

    if (config.services.communication) {
      this.registerService('railway-communication', {
        id: 'railway-communication',
        name: 'Communication Service',
        baseUrl: config.services.communication,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: ['/api/v1/notifications/*', '/api/v1/sms/*', '/api/v1/email/*'],
      });
    }

    if (config.services.delivery) {
      this.registerService('railway-delivery', {
        id: 'railway-delivery',
        name: 'Delivery Service',
        baseUrl: config.services.delivery,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: ['/api/v1/delivery/*', '/api/v1/courier/*', '/api/v1/tracking/*'],
      });
    }

    if (config.services.notifications) {
      this.registerService('railway-notifications', {
        id: 'railway-notifications',
        name: 'Notifications Service',
        baseUrl: config.services.notifications,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: ['/api/v1/notifications/*', '/api/v1/push/*', '/api/v1/alerts/*'],
      });
    }

    if (config.services.taxiRealtime) {
      this.registerService('railway-taxi-realtime', {
        id: 'railway-taxi-realtime',
        name: 'Taxi Realtime Service',
        baseUrl: config.services.taxiRealtime,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: ['/api/v1/taxi-realtime/*', '/api/v1/driver-location/*'],
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
    for (const service of this.services.values()) {
      for (const pattern of service.patterns) {
        if (this.matchPattern(path, pattern)) {
          return {
            ...service,
            matchedPattern: pattern,
            pathParams: {},
          };
        }
      }
    }
    return null;
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
      const response = await axios.get(`${service.baseUrl}${service.healthEndpoint}`, {
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
      const result: HealthCheckResult = {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date().toISOString(),
      };

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
