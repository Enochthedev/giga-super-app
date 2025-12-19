import express from 'express';
import request from 'supertest';
import {
  cacheMiddleware,
  cacheUtils,
  errorResponseStandardization,
  responseStandardization,
} from '../middleware/responseStandardization.js';

// Create test app
const createTestApp = () => {
  const app = express();

  // Add request timing
  app.use((req, res, next) => {
    req.startTime = Date.now();
    req.id = 'test-req-123';
    next();
  });

  app.use(responseStandardization);
  app.use(cacheMiddleware);

  // Test routes
  app.get('/test/success', (req, res) => {
    res.json({ message: 'Success' });
  });

  app.get('/test/error', (req, res) => {
    res.status(400).json({ error: 'Bad request' });
  });

  app.get('/test/already-standard', (req, res) => {
    res.json({
      success: true,
      data: { message: 'Already standardized' },
      metadata: { custom: 'field' },
    });
  });

  app.get('/test/cacheable', (req, res) => {
    req.cacheable = true;
    res.json({ message: 'Cacheable response', timestamp: Date.now() });
  });

  app.get('/test/cache-ttl', (req, res) => {
    req.cacheTTL = 60; // 1 minute
    res.json({ message: 'Custom TTL response' });
  });

  app.use(errorResponseStandardization);

  return app;
};

describe('Response Standardization Middleware', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    cacheUtils.clearAll(); // Clear cache before each test
  });

  describe('Response Format Standardization', () => {
    test('should standardize successful responses', async () => {
      const response = await request(app).get('/test/success').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toEqual({ message: 'Success' });
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('timestamp');
      expect(response.body.metadata).toHaveProperty('request_id', 'test-req-123');
      expect(response.body.metadata).toHaveProperty('version', '1.0.0');
    });

    test('should standardize error responses', async () => {
      const response = await request(app).get('/test/error').expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('request_id', 'test-req-123');
    });

    test('should preserve already standardized responses', async () => {
      const response = await request(app).get('/test/already-standard').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toEqual({ message: 'Already standardized' });
      expect(response.body.metadata).toHaveProperty('custom', 'field');
      expect(response.body.metadata).toHaveProperty('request_id', 'test-req-123');
    });

    test('should add standard response headers', async () => {
      const response = await request(app).get('/test/success').expect(200);

      expect(response.headers).toHaveProperty('x-request-id', 'test-req-123');
      expect(response.headers).toHaveProperty('x-response-time');
      expect(response.headers).toHaveProperty('x-cache', 'MISS');
    });
  });

  describe('Response Caching', () => {
    test('should cache GET responses', async () => {
      // First request - cache miss
      const response1 = await request(app).get('/test/cacheable').expect(200);

      expect(response1.headers).toHaveProperty('x-cache', 'MISS');

      // Second request - cache hit
      const response2 = await request(app).get('/test/cacheable').expect(200);

      expect(response2.headers).toHaveProperty('x-cache', 'HIT');
      expect(response2.headers).toHaveProperty('x-cache-date');

      // Response should be identical
      expect(response2.body.data.message).toBe(response1.body.data.message);
    });

    test('should not cache POST requests', async () => {
      const testApp = express();
      testApp.use((req, res, next) => {
        req.startTime = Date.now();
        req.id = 'test-req';
        next();
      });
      testApp.use(responseStandardization);
      testApp.use(cacheMiddleware);

      testApp.post('/test/post', (req, res) => {
        res.json({ message: 'POST response' });
      });

      const response = await request(testApp).post('/test/post').expect(200);

      expect(response.headers).toHaveProperty('x-cache', 'MISS');

      // Second POST should also be MISS
      const response2 = await request(testApp).post('/test/post').expect(200);

      expect(response2.headers).toHaveProperty('x-cache', 'MISS');
    });

    test('should not cache error responses', async () => {
      // First error request
      const response1 = await request(app).get('/test/error').expect(400);

      expect(response1.headers).toHaveProperty('x-cache', 'MISS');

      // Second error request should also be MISS
      const response2 = await request(app).get('/test/error').expect(400);

      expect(response2.headers).toHaveProperty('x-cache', 'MISS');
    });

    test('should respect custom cache TTL', async () => {
      const response = await request(app).get('/test/cache-ttl').expect(200);

      expect(response.headers).toHaveProperty('x-cache', 'MISS');

      // Should be cached with custom TTL
      const response2 = await request(app).get('/test/cache-ttl').expect(200);

      expect(response2.headers).toHaveProperty('x-cache', 'HIT');
    });
  });

  describe('Cache Management', () => {
    test('should clear cache by pattern', () => {
      // Add some test cache entries
      cacheUtils.warmCache('GET:/test/item1::user1', { data: 'test1' });
      cacheUtils.warmCache('GET:/test/item2::user1', { data: 'test2' });
      cacheUtils.warmCache('GET:/other/item::user1', { data: 'test3' });

      const cleared = cacheUtils.clearPattern('/test/');
      expect(cleared).toBe(2); // Should clear 2 entries matching pattern
    });

    test('should clear all cache', () => {
      // Add some test cache entries
      cacheUtils.warmCache('key1', { data: 'test1' });
      cacheUtils.warmCache('key2', { data: 'test2' });

      const cleared = cacheUtils.clearAll();
      expect(cleared).toBe(2); // Should clear all entries
    });

    test('should provide cache statistics', () => {
      const stats = cacheUtils.getStats();

      expect(stats).toHaveProperty('keyCount');
      expect(stats).toHaveProperty('memoryUsage');
      expect(typeof stats.keyCount).toBe('number');
      expect(typeof stats.memoryUsage).toBe('object');
    });
  });

  describe('Error Normalization', () => {
    test('should normalize string errors', async () => {
      const testApp = express();
      testApp.use((req, res, next) => {
        req.id = 'test-req';
        next();
      });
      testApp.use(responseStandardization);

      testApp.get('/test/string-error', (req, res) => {
        res.status(400).json('Simple error message');
      });

      testApp.use(errorResponseStandardization);

      const response = await request(testApp).get('/test/string-error').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });

    test('should normalize object errors', async () => {
      const testApp = express();
      testApp.use((req, res, next) => {
        req.id = 'test-req';
        next();
      });
      testApp.use(responseStandardization);

      testApp.get('/test/object-error', (req, res) => {
        res.status(422).json({
          error_code: 'VALIDATION_FAILED',
          error_message: 'Validation failed',
          details: { field: 'email' },
        });
      });

      testApp.use(errorResponseStandardization);

      const response = await request(testApp).get('/test/object-error').expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(response.body.error.message).toBe('Validation failed');
      expect(response.body.error.details).toEqual({ field: 'email' });
    });
  });

  describe('Response Compression', () => {
    test('should add content-length header for responses', async () => {
      const response = await request(app).get('/test/success').expect(200);

      // Should have content-length header for JSON responses
      expect(response.headers).toHaveProperty('content-length');
    });

    test('should detect large responses', async () => {
      const testApp = express();
      testApp.use((req, res, next) => {
        req.startTime = Date.now();
        req.id = 'test-req';
        next();
      });
      testApp.use(responseStandardization);

      testApp.get('/test/large', (req, res) => {
        const largeData = 'x'.repeat(15000); // > 10KB
        res.json({ data: largeData });
      });

      const response = await request(testApp).get('/test/large').expect(200);

      expect(response.headers).toHaveProperty('x-large-response', 'true');
    });
  });
});
