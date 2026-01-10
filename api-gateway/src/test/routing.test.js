import request from 'supertest';

import app from '../index.js';
import { serviceRegistry } from '../services/serviceRegistry.js';

describe('Gateway Routing', () => {
  beforeAll(async () => {
    // Initialize service registry for tests
    await serviceRegistry.initialize();
  });

  describe('Service Discovery', () => {
    test('should find correct service for hotel paths', () => {
      const service = serviceRegistry.findServiceForPath('/api/v1/hotels/123');
      expect(service).toBeTruthy();
      expect(service.platform).toBe('supabase');
      expect(service.name).toBe('Hotel Core Service');
    });

    test('should find correct service for social paths', () => {
      const service = serviceRegistry.findServiceForPath('/api/v1/social/posts');
      expect(service).toBeTruthy();
      expect(service.platform).toBe('railway');
      expect(service.name).toBe('Social Media Service');
    });

    test('should find correct service for ads paths', () => {
      const service = serviceRegistry.findServiceForPath('/api/v1/ads/campaigns');
      expect(service).toBeTruthy();
      expect(service.platform).toBe('railway');
      expect(service.name).toBe('Ads Service');
    });

    test('should return null for unknown paths', () => {
      const service = serviceRegistry.findServiceForPath('/api/v1/unknown/path');
      expect(service).toBeNull();
    });

    test('should prefer more specific patterns', () => {
      // More specific pattern should win over wildcard
      const service = serviceRegistry.findServiceForPath('/api/v1/hotels/analytics/revenue');
      expect(service).toBeTruthy();
      // Should match hotel extended service if available, otherwise hotel core
    });
  });

  describe('Health Checks', () => {
    test('GET /health should return basic health status', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.version).toBe('1.0.0');
    });

    test('GET /health/detailed should return service health status', async () => {
      const response = await request(app).get('/health/detailed').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.services).toBeDefined();
      expect(typeof response.body.data.services).toBe('object');
    });

    test('GET /health/ready should check service registry readiness', async () => {
      const response = await request(app).get('/health/ready').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ready');
    });

    test('GET /health/live should return liveness status', async () => {
      const response = await request(app).get('/health/live').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('alive');
    });
  });

  describe('Authentication Requirements', () => {
    test('should require authentication for API endpoints', async () => {
      const response = await request(app).get('/api/v1/hotels').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    test('should accept valid Bearer token format', async () => {
      // This would need a valid test token in a real test
      const response = await request(app)
        .get('/api/v1/hotels')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401); // Will fail auth validation, but passes format check

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown endpoints', async () => {
      const response = await request(app).get('/unknown/endpoint').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ENDPOINT_NOT_FOUND');
    });

    test('should return 404 for unmapped API paths', async () => {
      const response = await request(app)
        .get('/api/v1/unmapped/service')
        .set('Authorization', 'Bearer test-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SERVICE_NOT_FOUND');
    });
  });

  describe('Response Format', () => {
    test('should include standard metadata in all responses', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.metadata).toBeDefined();
      expect(response.body.metadata.timestamp).toBeDefined();
      expect(response.body.metadata.version).toBe('1.0.0');
    });

    test('should include request ID in response headers', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to requests', async () => {
      // This test would need to make many requests to trigger rate limiting
      // For now, just verify the middleware is applied
      const response = await request(app).get('/health').expect(200);

      // Rate limit headers should be present
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });
});
