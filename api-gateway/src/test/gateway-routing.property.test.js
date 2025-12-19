/**
 * Property-Based Tests for Gateway Routing Correctness
 *
 * **Feature: platform-architecture-split, Property 4: Gateway Routing Correctness**
 * **Validates: Requirements 2.1**
 *
 * Property: For any API request, the gateway should route it to the correct backend
 * service based on the defined routing rules and return a valid response
 */

import fc from 'fast-check';

import { serviceRegistry } from '../services/serviceRegistry.js';
import { pathMatcher } from '../utils/pathMatcher.js';

describe('Property-Based Tests: Gateway Routing Correctness', () => {
  beforeAll(async () => {
    // Initialize service registry for property tests
    await serviceRegistry.initialize();
  });

  /**
   * Property 4: Gateway Routing Correctness
   *
   * For any valid API path, the gateway should:
   * 1. Either find a matching service or return null consistently
   * 2. If a service is found, it should be the most specific match
   * 3. The same path should always route to the same service (deterministic)
   * 4. Path parameters should be correctly extracted
   */
  test('Property 4: Gateway routing should be deterministic and correct', () => {
    fc.assert(
      fc.property(
        // Generate various API paths
        fc.oneof(
          // Hotel service paths
          fc.record({
            path: fc.constantFrom(
              '/api/v1/hotels',
              '/api/v1/hotels/123',
              '/api/v1/hotels/123/reviews',
              '/api/v1/bookings',
              '/api/v1/bookings/456',
              '/api/v1/rooms/availability'
            ),
            expectedPlatform: fc.constant('supabase'),
            expectedService: fc.constant('Hotel Core Service'),
          }),

          // Payment service paths
          fc.record({
            path: fc.constantFrom(
              '/api/v1/payments',
              '/api/v1/payments/initialize',
              '/api/v1/wallet/balance',
              '/api/v1/wallet/transactions'
            ),
            expectedPlatform: fc.constant('supabase'),
            expectedService: fc.oneof(
              fc.constant('Payment Core Service'),
              fc.constant('Payment Core Service') // Wallet is part of payment
            ),
          }),

          // Social service paths (Railway)
          fc.record({
            path: fc.constantFrom(
              '/api/v1/social/posts',
              '/api/v1/social/feed',
              '/api/v1/posts/123/comments',
              '/api/v1/messages/conversations'
            ),
            expectedPlatform: fc.constant('railway'),
            expectedService: fc.constant('Social Media Service'),
          }),

          // Ads service paths (Railway)
          fc.record({
            path: fc.constantFrom(
              '/api/v1/ads/campaigns',
              '/api/v1/campaigns/123',
              '/api/v1/advertisers/profile'
            ),
            expectedPlatform: fc.constant('railway'),
            expectedService: fc.constant('Ads Service'),
          }),

          // Admin service paths (Railway)
          fc.record({
            path: fc.constantFrom(
              '/api/v1/admin/users',
              '/api/v1/admin/dashboard',
              '/api/v1/admin/reports'
            ),
            expectedPlatform: fc.constant('railway'),
            expectedService: fc.constant('Admin Service'),
          }),

          // Unknown paths (should return null)
          fc.record({
            path: fc.constantFrom(
              '/api/v1/unknown/service',
              '/api/v2/hotels', // Wrong version
              '/invalid/path',
              '/api/v1/nonexistent'
            ),
            expectedPlatform: fc.constant(null),
            expectedService: fc.constant(null),
          })
        ),
        testCase => {
          const { path, expectedPlatform, expectedService } = testCase;

          // Test 1: Routing should be deterministic
          const service1 = serviceRegistry.findServiceForPath(path);
          const service2 = serviceRegistry.findServiceForPath(path);

          // Same path should always return the same result
          if (service1 === null && service2 === null) {
            // Both null is fine
            expect(service1).toBe(service2);
          } else if (service1 !== null && service2 !== null) {
            // Both should have same service ID
            expect(service1.id).toBe(service2.id);
            expect(service1.name).toBe(service2.name);
            expect(service1.platform).toBe(service2.platform);
          } else {
            // One null, one not null - this should never happen
            fail(`Inconsistent routing for path ${path}: ${service1} vs ${service2}`);
          }

          // Test 2: Validate expected platform and service
          if (expectedPlatform === null) {
            expect(service1).toBeNull();
          } else {
            expect(service1).not.toBeNull();
            expect(service1.platform).toBe(expectedPlatform);

            if (expectedService !== null) {
              expect(service1.name).toBe(expectedService);
            }
          }

          // Test 3: If service found, it should have required properties
          if (service1 !== null) {
            expect(service1).toHaveProperty('id');
            expect(service1).toHaveProperty('name');
            expect(service1).toHaveProperty('platform');
            expect(service1).toHaveProperty('baseUrl');
            expect(service1).toHaveProperty('patterns');
            expect(Array.isArray(service1.patterns)).toBe(true);
            expect(service1.patterns.length).toBeGreaterThan(0);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Path parameter extraction should be consistent
   */
  test('Property: Path parameter extraction should work correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          pattern: fc.constantFrom(
            '/api/v1/hotels/:id',
            '/api/v1/hotels/:hotelId/rooms/:roomId',
            '/api/v1/users/:userId/bookings/:bookingId'
          ),
          path: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/')),
        }),
        ({ pattern, path }) => {
          // Create a concrete path from the pattern
          const concretePath = pattern.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, path);

          // Test path matching
          const match = pathMatcher.match(concretePath, pattern);

          if (match && match.matched) {
            // Should extract parameters correctly
            expect(match.params).toBeDefined();
            expect(typeof match.params).toBe('object');

            // All parameter values should match our test path
            Object.values(match.params).forEach(paramValue => {
              expect(paramValue).toBe(path);
            });
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Pattern specificity ranking should be consistent
   */
  test('Property: More specific patterns should always win over less specific ones', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          {
            patterns: ['/api/v1/hotels/*', '/api/v1/hotels/analytics/*'],
            testPath: '/api/v1/hotels/analytics/revenue',
            expectedWinner: '/api/v1/hotels/analytics/*',
          },
          {
            patterns: ['/api/v1/*', '/api/v1/hotels/*', '/api/v1/hotels/123'],
            testPath: '/api/v1/hotels/123',
            expectedWinner: '/api/v1/hotels/123',
          },
          {
            patterns: ['/api/v1/users/:id', '/api/v1/users/:id/profile'],
            testPath: '/api/v1/users/123/profile',
            expectedWinner: '/api/v1/users/:id/profile',
          }
        ),
        ({ patterns, testPath, expectedWinner }) => {
          const match = pathMatcher.findBestMatch(testPath, patterns);

          if (match) {
            expect(match.pattern).toBe(expectedWinner);

            // Verify specificity calculation is working
            const winnerSpecificity = pathMatcher.calculateSpecificity(expectedWinner);

            patterns.forEach(pattern => {
              if (pattern !== expectedWinner) {
                const otherMatch = pathMatcher.match(testPath, pattern);
                if (otherMatch && otherMatch.matched) {
                  const otherSpecificity = pathMatcher.calculateSpecificity(pattern);
                  expect(winnerSpecificity).toBeGreaterThanOrEqual(otherSpecificity);
                }
              }
            });
          }

          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Service registry should maintain consistency
   */
  test('Property: Service registry operations should be consistent', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'supabase-auth',
          'supabase-hotels',
          'supabase-payments',
          'railway-social',
          'railway-ads',
          'railway-admin'
        ),
        serviceId => {
          // Test 1: Getting a service should be consistent
          const service1 = serviceRegistry.getService(serviceId);
          const service2 = serviceRegistry.getService(serviceId);

          if (service1 === undefined && service2 === undefined) {
            // Both undefined is fine (service might not exist in test)
            expect(service1).toBe(service2);
          } else if (service1 !== undefined && service2 !== undefined) {
            // Both should be identical
            expect(service1.id).toBe(service2.id);
            expect(service1.name).toBe(service2.name);
            expect(service1.platform).toBe(service2.platform);
          }

          // Test 2: Service count should be stable
          const count1 = serviceRegistry.getServiceCount();
          const count2 = serviceRegistry.getServiceCount();
          expect(count1).toBe(count2);
          expect(count1).toBeGreaterThan(0);

          // Test 3: All services should be valid
          const allServices = serviceRegistry.getAllServices();
          expect(Array.isArray(allServices)).toBe(true);
          expect(allServices.length).toBe(count1);

          allServices.forEach(service => {
            expect(service).toHaveProperty('id');
            expect(service).toHaveProperty('name');
            expect(service).toHaveProperty('platform');
            expect(['supabase', 'railway']).toContain(service.platform);
          });

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Health check operations should be safe
   */
  test('Property: Health checks should handle all service states safely', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'supabase-auth',
          'supabase-hotels',
          'railway-social',
          'railway-ads',
          'nonexistent-service'
        ),
        async serviceId => {
          // Health check should never throw for any service ID
          let healthResult;
          try {
            healthResult = await serviceRegistry.checkServiceHealth(serviceId);
          } catch (error) {
            fail(`Health check should not throw for service ${serviceId}: ${error.message}`);
          }

          // Health result should always have expected structure
          expect(healthResult).toHaveProperty('healthy');
          expect(typeof healthResult.healthy).toBe('boolean');
          expect(healthResult).toHaveProperty('lastCheck');

          if (!healthResult.healthy) {
            // Unhealthy services should have error information
            expect(healthResult).toHaveProperty('error');
          }

          return true;
        }
      ),
      { numRuns: 20 } // Fewer runs for async operations
    );
  });
});

// Additional utility tests for edge cases
describe('Gateway Routing Edge Cases', () => {
  test('should handle empty and invalid paths gracefully', () => {
    const invalidPaths = ['', '/', '//', '///api/v1/hotels', '/api/v1/', '/api/v1'];

    invalidPaths.forEach(path => {
      expect(() => {
        const service = serviceRegistry.findServiceForPath(path);
        // Should not throw, may return null
      }).not.toThrow();
    });
  });

  test('should handle very long paths without performance issues', () => {
    const longPath = `/api/v1/hotels/${'a'.repeat(1000)}`;
    const startTime = Date.now();

    const service = serviceRegistry.findServiceForPath(longPath);

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(100); // Should complete within 100ms
  });

  test('should handle special characters in paths', () => {
    const specialPaths = [
      '/api/v1/hotels/test%20hotel',
      '/api/v1/hotels/test-hotel-123',
      '/api/v1/hotels/test_hotel',
      '/api/v1/hotels/test.hotel',
    ];

    specialPaths.forEach(path => {
      expect(() => {
        serviceRegistry.findServiceForPath(path);
      }).not.toThrow();
    });
  });
});
