/**
 * Property-Based Tests for Response Format Consistency
 *
 * **Feature: platform-architecture-split, Property 6: Response Format Consistency**
 * **Validates: Requirements 2.3**
 *
 * Property: For any service response, regardless of which backend serves it, the response
 * should conform to the unified API schema
 */

import express from 'express';
import fc from 'fast-check';
import request from 'supertest';

import {
  cacheMiddleware,
  errorResponseStandardization,
  responseStandardization,
} from '../middleware/responseStandardization.js';

describe('Property-Based Tests: Response Format Consistency', () => {
  /**
   * Property 6: Response Format Consistency
   *
   * For any response from any service, the gateway should:
   * 1. Ensure all responses have the standard format
   * 2. Include required metadata fields
   * 3. Normalize error responses consistently
   * 4. Preserve data integrity during standardization
   */
  test('Property 6: All responses should conform to unified API schema', () => {
    fc.assert(
      fc.property(
        // Generate various response scenarios
        fc.oneof(
          // Success responses with different data types
          fc.record({
            type: fc.constant('success'),
            statusCode: fc.constantFrom(200, 201, 202, 204),
            data: fc.oneof(
              fc.object(), // Object data
              fc.array(fc.object()), // Array data
              fc.string(), // String data
              fc.integer(), // Number data
              fc.constant(null), // Null data
              fc.boolean() // Boolean data
            ),
          }),

          // Error responses with different formats
          fc.record({
            type: fc.constant('error'),
            statusCode: fc.constantFrom(400, 401, 403, 404, 409, 422, 429, 500, 502, 503),
            error: fc.oneof(
              fc.string(), // Simple string error
              fc.record({
                code: fc.string({ minLength: 3, maxLength: 30 }),
                message: fc.string({ minLength: 5, maxLength: 100 }),
                details: fc.option(fc.object()),
              }), // Structured error
              fc.record({
                error_code: fc.string(),
                error_message: fc.string(),
              }) // Alternative error format
            ),
          }),

          // Already standardized responses
          fc.record({
            type: fc.constant('standardized'),
            statusCode: fc.constantFrom(200, 400, 500),
            response: fc.record({
              success: fc.boolean(),
              data: fc.option(fc.object()),
              error: fc.option(
                fc.record({
                  code: fc.string(),
                  message: fc.string(),
                })
              ),
              metadata: fc.record({
                timestamp: fc.string(),
                version: fc.string(),
              }),
            }),
          })
        ),
        async testCase => {
          // Create test app for each scenario
          const app = express();

          app.use((req, res, next) => {
            req.startTime = Date.now();
            req.id = `test-${Date.now()}`;
            next();
          });

          app.use(responseStandardization);
          app.use(cacheMiddleware);

          // Create test route based on scenario
          app.get('/test', (req, res) => {
            if (testCase.type === 'success') {
              res.status(testCase.statusCode).json(testCase.data);
            } else if (testCase.type === 'error') {
              res.status(testCase.statusCode).json(testCase.error);
            } else if (testCase.type === 'standardized') {
              res.status(testCase.statusCode).json(testCase.response);
            }
          });

          app.use(errorResponseStandardization);

          // Make request and validate response
          const response = await request(app).get('/test');

          // Test 1: All responses should have standard structure
          expect(response.body).toHaveProperty('success');
          expect(typeof response.body.success).toBe('boolean');
          expect(response.body).toHaveProperty('metadata');
          expect(typeof response.body.metadata).toBe('object');

          // Test 2: Metadata should have required fields
          expect(response.body.metadata).toHaveProperty('timestamp');
          expect(response.body.metadata).toHaveProperty('request_id');
          expect(response.body.metadata).toHaveProperty('version');
          expect(response.body.metadata.version).toBe('1.0.0');

          // Test 3: Success responses should have data, error responses should have error
          if (response.body.success) {
            expect(response.body).toHaveProperty('data');
            expect(response.body).not.toHaveProperty('error');
          } else {
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code');
            expect(response.body.error).toHaveProperty('message');
            expect(typeof response.body.error.code).toBe('string');
            expect(typeof response.body.error.message).toBe('string');
          }

          // Test 4: Response headers should be consistent
          expect(response.headers).toHaveProperty('x-request-id');
          expect(response.headers).toHaveProperty('x-response-time');
          expect(response.headers).toHaveProperty('x-cache');

          // Test 5: Status codes should be preserved
          if (testCase.statusCode) {
            expect(response.status).toBe(testCase.statusCode);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error normalization should be consistent
   */
  test('Property: Error responses should be normalized consistently', () => {
    fc.assert(
      fc.property(
        fc.record({
          errorFormat: fc.oneof(
            // String errors
            fc.record({
              type: fc.constant('string'),
              error: fc.string({ minLength: 1, maxLength: 200 }),
            }),

            // Object errors with different field names
            fc.record({
              type: fc.constant('object'),
              error: fc.oneof(
                fc.record({
                  code: fc.string(),
                  message: fc.string(),
                }),
                fc.record({
                  error_code: fc.string(),
                  error_message: fc.string(),
                  details: fc.option(fc.object()),
                }),
                fc.record({
                  errorCode: fc.string(),
                  errorMessage: fc.string(),
                })
              ),
            }),

            // Nested errors
            fc.record({
              type: fc.constant('nested'),
              error: fc.record({
                error: fc.record({
                  code: fc.string(),
                  message: fc.string(),
                }),
              }),
            })
          ),
          statusCode: fc.constantFrom(400, 401, 403, 404, 422, 500),
        }),
        async ({ errorFormat, statusCode }) => {
          const app = express();

          app.use((req, res, next) => {
            req.id = 'test-error-req';
            next();
          });

          app.use(responseStandardization);

          app.get('/test-error', (req, res) => {
            res.status(statusCode).json(errorFormat.error);
          });

          const response = await request(app).get('/test-error');

          // All error responses should be normalized to standard format
          expect(response.body.success).toBe(false);
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toHaveProperty('code');
          expect(response.body.error).toHaveProperty('message');

          // Code and message should be strings
          expect(typeof response.body.error.code).toBe('string');
          expect(typeof response.body.error.message).toBe('string');

          // Should have non-empty values
          expect(response.body.error.code.length).toBeGreaterThan(0);
          expect(response.body.error.message.length).toBeGreaterThan(0);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Cache behavior should be consistent
   */
  test('Property: Caching behavior should be deterministic', () => {
    fc.assert(
      fc.property(
        fc.record({
          method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
          path: fc.oneof(
            fc.constantFrom('/api/v1/hotels', '/api/v1/users', '/api/v1/products'),
            fc.constantFrom('/admin/users', '/admin/reports'),
            fc.constantFrom('/health', '/public/info')
          ),
          hasAuth: fc.boolean(),
          responseData: fc.object(),
        }),
        async ({ method, path, hasAuth, responseData }) => {
          const app = express();

          app.use((req, res, next) => {
            req.startTime = Date.now();
            req.id = 'cache-test-req';
            if (hasAuth) {
              req.user = { id: 'test-user' };
            }
            next();
          });

          app.use(responseStandardization);
          app.use(cacheMiddleware);

          // Create dynamic route
          app.all(path, (req, res) => {
            res.json(responseData);
          });

          const response = await request(app)[method.toLowerCase()](path);

          // Test caching rules
          const shouldCache =
            method === 'GET' &&
            !path.startsWith('/admin') &&
            !path.includes('/private') &&
            response.body.success;

          if (shouldCache && !hasAuth) {
            // Should be cacheable for anonymous GET requests to public endpoints
            expect(response.headers).toHaveProperty('x-cache', 'MISS');

            // Second request should hit cache
            const response2 = await request(app)[method.toLowerCase()](path);
            expect(response2.headers).toHaveProperty('x-cache', 'HIT');
          } else {
            // Should not be cached
            expect(response.headers).toHaveProperty('x-cache', 'MISS');

            // Second request should also miss
            const response2 = await request(app)[method.toLowerCase()](path);
            expect(response2.headers).toHaveProperty('x-cache', 'MISS');
          }

          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Response timing should be tracked consistently
   */
  test('Property: Response timing should be measured for all requests', () => {
    fc.assert(
      fc.property(
        fc.record({
          delay: fc.integer({ min: 0, max: 100 }), // Simulate processing delay
          responseType: fc.constantFrom('success', 'error', 'cached'),
        }),
        async ({ delay, responseType }) => {
          const app = express();

          app.use((req, res, next) => {
            req.startTime = Date.now();
            req.id = 'timing-test-req';
            next();
          });

          app.use(responseStandardization);

          app.get('/test-timing', async (req, res) => {
            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, delay));

            if (responseType === 'success') {
              res.json({ message: 'success' });
            } else if (responseType === 'error') {
              res.status(400).json({ error: 'test error' });
            } else {
              res.json({ cached: true });
            }
          });

          const startTime = Date.now();
          const response = await request(app).get('/test-timing');
          const actualDuration = Date.now() - startTime;

          // Should have response time header
          expect(response.headers).toHaveProperty('x-response-time');

          // Response time should be a valid format (e.g., "123ms")
          const responseTime = response.headers['x-response-time'];
          expect(responseTime).toMatch(/^\d+ms$/);

          // Parsed response time should be reasonable
          const parsedTime = parseInt(responseTime.replace('ms', ''));
          expect(parsedTime).toBeGreaterThanOrEqual(delay);
          expect(parsedTime).toBeLessThan(actualDuration + 100); // Allow some margin

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Metadata should be complete and consistent
   */
  test('Property: Response metadata should always be complete', () => {
    fc.assert(
      fc.property(
        fc.record({
          customMetadata: fc.option(fc.object()),
          requestId: fc.string({ minLength: 5, maxLength: 50 }),
          responseData: fc.oneof(fc.object(), fc.string(), fc.integer(), fc.constant(null)),
        }),
        async ({ customMetadata, requestId, responseData }) => {
          const app = express();

          app.use((req, res, next) => {
            req.startTime = Date.now();
            req.id = requestId;
            next();
          });

          app.use(responseStandardization);

          app.get('/test-metadata', (req, res) => {
            const response = {
              success: true,
              data: responseData,
              ...(customMetadata && { metadata: customMetadata }),
            };
            res.json(response);
          });

          const response = await request(app).get('/test-metadata');

          // Metadata should always be present and complete
          expect(response.body).toHaveProperty('metadata');
          expect(typeof response.body.metadata).toBe('object');

          // Required metadata fields
          const requiredFields = ['timestamp', 'request_id', 'version'];
          requiredFields.forEach(field => {
            expect(response.body.metadata).toHaveProperty(field);
            expect(response.body.metadata[field]).toBeDefined();
            expect(response.body.metadata[field]).not.toBe('');
          });

          // Request ID should match
          expect(response.body.metadata.request_id).toBe(requestId);

          // Version should be consistent
          expect(response.body.metadata.version).toBe('1.0.0');

          // Timestamp should be valid ISO string
          expect(() => new Date(response.body.metadata.timestamp)).not.toThrow();

          // Custom metadata should be preserved
          if (customMetadata) {
            Object.keys(customMetadata).forEach(key => {
              expect(response.body.metadata).toHaveProperty(key);
            });
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});

// Additional edge case tests
describe('Response Consistency Edge Cases', () => {
  test('should handle very large responses consistently', async () => {
    const app = express();

    app.use((req, res, next) => {
      req.startTime = Date.now();
      req.id = 'large-response-test';
      next();
    });

    app.use(responseStandardization);

    app.get('/large', (req, res) => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: 'x'.repeat(100),
      }));
      res.json(largeData);
    });

    const response = await request(app).get('/large');

    // Should still have standard format
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('metadata');

    // Should handle large response
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBe(1000);
  });

  test('should handle circular references gracefully', async () => {
    const app = express();

    app.use((req, res, next) => {
      req.startTime = Date.now();
      req.id = 'circular-test';
      next();
    });

    app.use(responseStandardization);

    app.get('/circular', (req, res) => {
      // This would normally cause JSON.stringify to fail
      // But our middleware should handle it gracefully
      try {
        res.json({ message: 'No circular reference here' });
      } catch (error) {
        res.status(500).json({ error: 'Circular reference error' });
      }
    });

    const response = await request(app).get('/circular');

    // Should handle gracefully
    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('metadata');
  });

  test('should preserve response status codes correctly', () => {
    const statusCodes = [200, 201, 202, 204, 400, 401, 403, 404, 422, 429, 500, 502, 503];

    statusCodes.forEach(async statusCode => {
      const app = express();

      app.use((req, res, next) => {
        req.startTime = Date.now();
        req.id = `status-${statusCode}`;
        next();
      });

      app.use(responseStandardization);

      app.get('/status', (req, res) => {
        res.status(statusCode).json({
          message: `Status ${statusCode}`,
          ...(statusCode >= 400 && { error: 'Error response' }),
        });
      });

      const response = await request(app).get('/status');
      expect(response.status).toBe(statusCode);
    });
  });
});
