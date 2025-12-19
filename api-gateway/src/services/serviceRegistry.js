import axios from 'axios';
import NodeCache from 'node-cache';
import { logger } from '../utils/logger.js';

class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.healthCache = new NodeCache({ stdTTL: 30 }); // Cache health status for 30 seconds
    this.initialized = false;
  }

  async initialize() {
    logger.info('Initializing service registry');

    // Register Supabase services
    this.registerService('supabase-auth', {
      name: 'Authentication Service',
      baseUrl: process.env.SUPABASE_URL,
      healthEndpoint: '/rest/v1/',
      platform: 'supabase',
      patterns: ['/api/v1/auth/*', '/api/v1/users/*'],
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      },
    });

    this.registerService('supabase-hotels', {
      name: 'Hotel Core Service',
      baseUrl: process.env.SUPABASE_URL,
      healthEndpoint: '/rest/v1/',
      platform: 'supabase',
      patterns: ['/api/v1/hotels/*', '/api/v1/bookings/*', '/api/v1/rooms/*'],
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      },
    });

    this.registerService('supabase-payments', {
      name: 'Payment Core Service',
      baseUrl: process.env.SUPABASE_URL,
      healthEndpoint: '/rest/v1/',
      platform: 'supabase',
      patterns: ['/api/v1/payments/*', '/api/v1/wallet/*'],
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      },
    });

    this.registerService('supabase-ecommerce', {
      name: 'Ecommerce Core Service',
      baseUrl: process.env.SUPABASE_URL,
      healthEndpoint: '/rest/v1/',
      platform: 'supabase',
      patterns: ['/api/v1/products/*', '/api/v1/cart/*', '/api/v1/orders/*'],
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      },
    });

    this.registerService('supabase-taxi', {
      name: 'Taxi Core Service',
      baseUrl: process.env.SUPABASE_URL,
      healthEndpoint: '/rest/v1/',
      platform: 'supabase',
      patterns: ['/api/v1/rides/*', '/api/v1/drivers/*'],
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      },
    });

    // Register Railway services
    if (process.env.SOCIAL_SERVICE_URL) {
      this.registerService('railway-social', {
        name: 'Social Media Service',
        baseUrl: process.env.SOCIAL_SERVICE_URL,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: ['/api/v1/social/*', '/api/v1/posts/*', '/api/v1/messages/*'],
      });
    }

    if (process.env.ADS_SERVICE_URL) {
      this.registerService('railway-ads', {
        name: 'Ads Service',
        baseUrl: process.env.ADS_SERVICE_URL,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: ['/api/v1/ads/*', '/api/v1/campaigns/*', '/api/v1/advertisers/*'],
      });
    }

    if (process.env.ADMIN_SERVICE_URL) {
      this.registerService('railway-admin', {
        name: 'Admin Service',
        baseUrl: process.env.ADMIN_SERVICE_URL,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: ['/api/v1/admin/*'],
      });
    }

    if (process.env.MEDIA_SERVICE_URL) {
      this.registerService('railway-media', {
        name: 'Media Processing Service',
        baseUrl: process.env.MEDIA_SERVICE_URL,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: ['/api/v1/media/*', '/api/v1/files/*', '/api/v1/images/*'],
      });
    }

    if (process.env.COMMUNICATION_SERVICE_URL) {
      this.registerService('railway-communication', {
        name: 'Communication Service',
        baseUrl: process.env.COMMUNICATION_SERVICE_URL,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: ['/api/v1/notifications/*', '/api/v1/sms/*', '/api/v1/email/*'],
      });
    }

    if (process.env.HOTEL_EXTENDED_SERVICE_URL) {
      this.registerService('railway-hotel-extended', {
        name: 'Hotel Extended Service',
        baseUrl: process.env.HOTEL_EXTENDED_SERVICE_URL,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: ['/api/v1/hotels/analytics/*', '/api/v1/hotels/pricing/*'],
      });
    }

    if (process.env.TAXI_EXTENDED_SERVICE_URL) {
      this.registerService('railway-taxi-extended', {
        name: 'Taxi Extended Service',
        baseUrl: process.env.TAXI_EXTENDED_SERVICE_URL,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: ['/api/v1/rides/analytics/*', '/api/v1/drivers/management/*'],
      });
    }

    if (process.env.ECOMMERCE_EXTENDED_SERVICE_URL) {
      this.registerService('railway-ecommerce-extended', {
        name: 'Ecommerce Extended Service',
        baseUrl: process.env.ECOMMERCE_EXTENDED_SERVICE_URL,
        healthEndpoint: '/health',
        platform: 'railway',
        patterns: ['/api/v1/products/search/*', '/api/v1/checkout/*'],
      });
    }

    this.initialized = true;
    logger.info(`Service registry initialized with ${this.services.size} services`);
  }

  registerService(id, config) {
    this.services.set(id, {
      id,
      ...config,
      healthy: true,
      lastHealthCheck: null,
    });

    logger.debug(`Registered service: ${id}`, {
      name: config.name,
      platform: config.platform,
      patterns: config.patterns,
    });
  }

  findServiceForPath(path) {
    const allPatterns = [];
    const serviceMap = new Map();

    // Collect all patterns with their services
    for (const [id, service] of this.services) {
      for (const pattern of service.patterns) {
        allPatterns.push(pattern);
        serviceMap.set(pattern, service);
      }
    }

    // Find the best matching pattern
    const match = pathMatcher.findBestMatch(path, allPatterns);
    if (!match) {
      return null;
    }

    const service = serviceMap.get(match.pattern);
    return {
      ...service,
      matchedPattern: match.pattern,
      pathParams: match.params,
    };
  }

  async checkServiceHealth(serviceId) {
    const cacheKey = `health_${serviceId}`;
    const cached = this.healthCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const service = this.services.get(serviceId);
    if (!service) {
      return { healthy: false, error: 'Service not found' };
    }

    try {
      const timeout = parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS) || 5000;
      const response = await axios.get(`${service.baseUrl}${service.healthEndpoint}`, {
        timeout,
        headers: service.headers || {},
        validateStatus: status => status < 500, // Accept 4xx as healthy
      });

      const healthy = response.status < 400;
      const result = {
        healthy,
        status: response.status,
        responseTime: response.headers['x-response-time'] || 'unknown',
        lastCheck: new Date().toISOString(),
      };

      // Update service health status
      service.healthy = healthy;
      service.lastHealthCheck = new Date();

      // Cache result
      this.healthCache.set(cacheKey, result);

      return result;
    } catch (error) {
      const result = {
        healthy: false,
        error: error.message,
        lastCheck: new Date().toISOString(),
      };

      // Update service health status
      service.healthy = false;
      service.lastHealthCheck = new Date();

      // Cache result (shorter TTL for unhealthy services)
      this.healthCache.set(cacheKey, result, 10);

      return result;
    }
  }

  async checkAllServicesHealth() {
    const healthChecks = {};

    for (const [id, service] of this.services) {
      healthChecks[id] = {
        name: service.name,
        platform: service.platform,
        ...(await this.checkServiceHealth(id)),
      };
    }

    return healthChecks;
  }

  getService(id) {
    return this.services.get(id);
  }

  getAllServices() {
    return Array.from(this.services.values());
  }

  getServiceCount() {
    return this.services.size;
  }

  isReady() {
    return this.initialized;
  }

  getHealthyServices() {
    return Array.from(this.services.values()).filter(service => service.healthy);
  }

  getUnhealthyServices() {
    return Array.from(this.services.values()).filter(service => !service.healthy);
  }
}

export const serviceRegistry = new ServiceRegistry();

  /**
   * Execute a request with circuit breaker protection
   */
  async executeWithCircuitBreaker(serviceId, operation) {
    return circuitBreakerManager.executeWithBreaker(serviceId, operation);
  }

  /**
   * Get circuit breaker statistics for all services
   */
  getCircuitBreakerStats() {
    return circuitBreakerManager.getAllStats();
  }

  /**
   * Get load balancer statistics
   */
  getLoadBalancerStats() {
    return loadBalancer.getStats();
  }

  /**
   * Get comprehensive service statistics
   */
  async getServiceStats() {
    const services = {};
    
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
      loadBalancer: this.getLoadBalancerStats(),
      totalServices: this.services.size,
      healthyServices: this.getHealthyServices().length,
      unhealthyServices: this.getUnhealthyServices().length,
    };
  }
}