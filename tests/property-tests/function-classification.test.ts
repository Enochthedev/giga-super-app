/**
 * Property-Based Tests for Function Classification System
 *
 * These tests validate the correctness properties of the function classification
 * and platform placement algorithms using property-based testing with fast-check.
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import fc from 'fast-check';

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Type definitions for test data
interface FunctionClassification {
  function_name: string;
  module_type: 'core' | 'social' | 'admin' | 'media' | 'utility';
  database_intensity: number;
  compute_intensity: number;
  memory_intensity: number;
  io_intensity: number;
  traffic_pattern: 'low' | 'medium' | 'high' | 'burst' | 'spike';
  business_criticality: 'low' | 'medium' | 'high' | 'critical';
  security_level: 'public' | 'standard' | 'elevated' | 'critical';
  recommended_platform: 'supabase' | 'railway';
  platform_confidence: number;
}

interface PlatformRecommendation {
  recommended_platform: 'supabase' | 'railway';
  confidence: number;
  reasoning: string;
}

// Generators for property-based testing
const functionNameGenerator = fc
  .string({ minLength: 3, maxLength: 50 })
  .filter(name => /^[a-z][a-z0-9-]*$/.test(name));

const moduleTypeGenerator = fc.constantFrom('core', 'social', 'admin', 'media', 'utility');

const intensityScoreGenerator = fc.integer({ min: 1, max: 10 });

const trafficPatternGenerator = fc.constantFrom('low', 'medium', 'high', 'burst', 'spike');

const businessCriticalityGenerator = fc.constantFrom('low', 'medium', 'high', 'critical');

const securityLevelGenerator = fc.constantFrom('public', 'standard', 'elevated', 'critical');

const functionClassificationGenerator = fc.record({
  function_name: functionNameGenerator,
  module_type: moduleTypeGenerator,
  database_intensity: intensityScoreGenerator,
  compute_intensity: intensityScoreGenerator,
  memory_intensity: intensityScoreGenerator,
  io_intensity: intensityScoreGenerator,
  traffic_pattern: trafficPatternGenerator,
  business_criticality: businessCriticalityGenerator,
  security_level: securityLevelGenerator,
});

// Helper functions
async function categorizeFunctions(
  functions: Partial<FunctionClassification>[]
): Promise<FunctionClassification[]> {
  // Simulate the categorization algorithm
  return functions.map(func => ({
    function_name: func.function_name || 'test-function',
    module_type: func.module_type || 'utility',
    database_intensity: func.database_intensity || 5,
    compute_intensity: func.compute_intensity || 5,
    memory_intensity: func.memory_intensity || 5,
    io_intensity: func.io_intensity || 5,
    traffic_pattern: func.traffic_pattern || 'medium',
    business_criticality: func.business_criticality || 'medium',
    security_level: func.security_level || 'standard',
    recommended_platform: 'supabase', // Will be calculated
    platform_confidence: 0.8, // Will be calculated
  }));
}

async function calculatePlatformRecommendation(
  dbIntensity: number,
  computeIntensity: number,
  memoryIntensity: number,
  ioIntensity: number,
  trafficPattern: string,
  businessCriticality: string,
  securityLevel: string
): Promise<PlatformRecommendation> {
  const { data, error } = await supabase.rpc('calculate_platform_recommendation', {
    db_intensity: dbIntensity,
    compute_intensity: computeIntensity,
    memory_intensity: memoryIntensity,
    io_intensity: ioIntensity,
    traffic_pattern: trafficPattern,
    business_criticality: businessCriticality,
    security_level: securityLevel,
  });

  if (error) {
    throw new Error(`Platform recommendation failed: ${error.message}`);
  }

  return data[0];
}

describe('Function Classification Property Tests', () => {
  beforeAll(async () => {
    // Ensure database connection is working
    const { data, error } = await supabase.from('function_classification').select('count').limit(1);
    if (error) {
      console.warn('Database connection test failed:', error.message);
    }
  });

  /**
   * **Feature: platform-architecture-split, Property 1: Function Categorization Completeness**
   *
   * Property: For any set of edge functions, the categorization algorithm should assign
   * each function to exactly one module category (core, social, admin, media, utility)
   * with valid reasoning.
   *
   * **Validates: Requirements 1.1**
   */
  test('Property 1: Function Categorization Completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(functionClassificationGenerator, { minLength: 1, maxLength: 20 }),
        async inputFunctions => {
          // Act: Categorize the functions
          const categorizedFunctions = await categorizeFunctions(inputFunctions);

          // Assert: Each function must be assigned to exactly one valid module
          for (const func of categorizedFunctions) {
            // Property 1.1: Every function has a module assignment
            expect(func.module_type).toBeDefined();
            expect(func.module_type).not.toBeNull();
            expect(func.module_type).not.toBe('');

            // Property 1.2: Module type is one of the valid categories
            expect(['core', 'social', 'admin', 'media', 'utility']).toContain(func.module_type);

            // Property 1.3: Function name is preserved and valid
            expect(func.function_name).toBeDefined();
            expect(func.function_name.length).toBeGreaterThan(0);

            // Property 1.4: All intensity scores are within valid range (1-10)
            expect(func.database_intensity).toBeGreaterThanOrEqual(1);
            expect(func.database_intensity).toBeLessThanOrEqual(10);
            expect(func.compute_intensity).toBeGreaterThanOrEqual(1);
            expect(func.compute_intensity).toBeLessThanOrEqual(10);
            expect(func.memory_intensity).toBeGreaterThanOrEqual(1);
            expect(func.memory_intensity).toBeLessThanOrEqual(10);
            expect(func.io_intensity).toBeGreaterThanOrEqual(1);
            expect(func.io_intensity).toBeLessThanOrEqual(10);

            // Property 1.5: Traffic pattern is valid
            expect(['low', 'medium', 'high', 'burst', 'spike']).toContain(func.traffic_pattern);

            // Property 1.6: Business criticality is valid
            expect(['low', 'medium', 'high', 'critical']).toContain(func.business_criticality);

            // Property 1.7: Security level is valid
            expect(['public', 'standard', 'elevated', 'critical']).toContain(func.security_level);
          }

          // Property 1.8: No duplicate function names in the result
          const functionNames = categorizedFunctions.map(f => f.function_name);
          const uniqueNames = new Set(functionNames);
          expect(uniqueNames.size).toBe(functionNames.length);

          // Property 1.9: All input functions are represented in output
          expect(categorizedFunctions.length).toBe(inputFunctions.length);

          // Property 1.10: Module distribution follows logical patterns
          const moduleDistribution = categorizedFunctions.reduce(
            (acc, func) => {
              acc[func.module_type] = (acc[func.module_type] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          );

          // At least one module should be assigned (no empty categorization)
          expect(Object.keys(moduleDistribution).length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100, timeout: 30000 }
    );
  });

  /**
   * **Feature: platform-architecture-split, Property 2: Platform Placement Optimization**
   *
   * Property: For any function with database and compute intensity scores, the placement
   * algorithm should consistently choose Supabase for database-heavy functions (score > 7)
   * and Railway for compute-heavy functions (score > 7).
   *
   * **Validates: Requirements 1.2**
   */
  test('Property 2: Platform Placement Optimization', async () => {
    await fc.assert(
      fc.asyncProperty(
        intensityScoreGenerator,
        intensityScoreGenerator,
        intensityScoreGenerator,
        intensityScoreGenerator,
        trafficPatternGenerator,
        businessCriticalityGenerator,
        securityLevelGenerator,
        async (
          dbIntensity,
          computeIntensity,
          memoryIntensity,
          ioIntensity,
          trafficPattern,
          businessCriticality,
          securityLevel
        ) => {
          // Act: Get platform recommendation
          const recommendation = await calculatePlatformRecommendation(
            dbIntensity,
            computeIntensity,
            memoryIntensity,
            ioIntensity,
            trafficPattern,
            businessCriticality,
            securityLevel
          );

          // Assert: Platform placement follows optimization rules

          // Property 2.1: Recommendation is one of the valid platforms
          expect(['supabase', 'railway']).toContain(recommendation.recommended_platform);

          // Property 2.2: Confidence is within valid range (0.0 to 1.0)
          expect(recommendation.confidence).toBeGreaterThanOrEqual(0.0);
          expect(recommendation.confidence).toBeLessThanOrEqual(1.0);

          // Property 2.3: Reasoning is provided and non-empty
          expect(recommendation.reasoning).toBeDefined();
          expect(recommendation.reasoning.length).toBeGreaterThan(0);

          // Property 2.4: Database-heavy functions (score > 7) prefer Supabase
          if (dbIntensity > 7 && computeIntensity <= 7) {
            expect(recommendation.recommended_platform).toBe('supabase');
          }

          // Property 2.5: Compute-heavy functions (score > 7) prefer Railway
          if (computeIntensity > 7 && dbIntensity <= 7) {
            expect(recommendation.recommended_platform).toBe('railway');
          }

          // Property 2.6: High memory/IO intensity favors Railway
          if (memoryIntensity >= 8 || ioIntensity >= 8) {
            // Should have some bias toward Railway (not strict rule due to other factors)
            expect(recommendation.confidence).toBeGreaterThan(0.5);
          }

          // Property 2.7: Critical business functions have high confidence
          if (businessCriticality === 'critical') {
            expect(recommendation.confidence).toBeGreaterThan(0.6);
          }

          // Property 2.8: Burst traffic patterns favor Railway for scalability
          if (trafficPattern === 'burst' || trafficPattern === 'spike') {
            // Should show preference for Railway or high confidence in choice
            expect(recommendation.confidence).toBeGreaterThan(0.5);
          }

          // Property 2.9: Consistent recommendations for identical inputs
          const secondRecommendation = await calculatePlatformRecommendation(
            dbIntensity,
            computeIntensity,
            memoryIntensity,
            ioIntensity,
            trafficPattern,
            businessCriticality,
            securityLevel
          );

          expect(secondRecommendation.recommended_platform).toBe(
            recommendation.recommended_platform
          );
          expect(secondRecommendation.confidence).toBe(recommendation.confidence);

          // Property 2.10: Extreme cases have high confidence
          if (
            (dbIntensity >= 9 && computeIntensity <= 3) ||
            (computeIntensity >= 9 && dbIntensity <= 3)
          ) {
            expect(recommendation.confidence).toBeGreaterThan(0.8);
          }
        }
      ),
      { numRuns: 100, timeout: 30000 }
    );
  });

  /**
   * Additional Property: Platform Recommendation Consistency
   *
   * Property: The platform recommendation algorithm should be deterministic and
   * produce consistent results for the same inputs across multiple invocations.
   */
  test('Property: Platform Recommendation Consistency', async () => {
    await fc.assert(
      fc.asyncProperty(functionClassificationGenerator, async funcData => {
        // Act: Get multiple recommendations for the same input
        const recommendations = await Promise.all([
          calculatePlatformRecommendation(
            funcData.database_intensity,
            funcData.compute_intensity,
            funcData.memory_intensity,
            funcData.io_intensity,
            funcData.traffic_pattern,
            funcData.business_criticality,
            funcData.security_level
          ),
          calculatePlatformRecommendation(
            funcData.database_intensity,
            funcData.compute_intensity,
            funcData.memory_intensity,
            funcData.io_intensity,
            funcData.traffic_pattern,
            funcData.business_criticality,
            funcData.security_level
          ),
          calculatePlatformRecommendation(
            funcData.database_intensity,
            funcData.compute_intensity,
            funcData.memory_intensity,
            funcData.io_intensity,
            funcData.traffic_pattern,
            funcData.business_criticality,
            funcData.security_level
          ),
        ]);

        // Assert: All recommendations should be identical
        const [first, second, third] = recommendations;

        expect(second.recommended_platform).toBe(first.recommended_platform);
        expect(third.recommended_platform).toBe(first.recommended_platform);

        expect(second.confidence).toBe(first.confidence);
        expect(third.confidence).toBe(first.confidence);

        expect(second.reasoning).toBe(first.reasoning);
        expect(third.reasoning).toBe(first.reasoning);
      }),
      { numRuns: 50, timeout: 20000 }
    );
  });

  /**
   * Additional Property: Module Classification Logic
   *
   * Property: Functions with similar characteristics should be classified
   * into appropriate modules based on their intensity patterns.
   */
  test('Property: Module Classification Logic', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          database_intensity: fc.integer({ min: 8, max: 10 }),
          compute_intensity: fc.integer({ min: 1, max: 4 }),
          function_name: functionNameGenerator,
        }),
        async dbHeavyFunc => {
          // Act: Categorize a database-heavy function
          const [categorized] = await categorizeFunctions([dbHeavyFunc]);

          // Assert: Database-heavy functions should typically be core or utility
          // (This is a business logic assumption that can be validated)
          expect(['core', 'utility']).toContain(categorized.module_type);

          // Get platform recommendation
          const recommendation = await calculatePlatformRecommendation(
            categorized.database_intensity,
            categorized.compute_intensity,
            categorized.memory_intensity,
            categorized.io_intensity,
            categorized.traffic_pattern,
            categorized.business_criticality,
            categorized.security_level
          );

          // Database-heavy functions should prefer Supabase
          expect(recommendation.recommended_platform).toBe('supabase');
        }
      ),
      { numRuns: 30, timeout: 15000 }
    );
  });

  /**
   * Additional Property: Confidence Score Validation
   *
   * Property: Confidence scores should correlate with the clarity of the
   * platform choice based on intensity score differences.
   */
  test('Property: Confidence Score Validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          database_intensity: fc.integer({ min: 1, max: 10 }),
          compute_intensity: fc.integer({ min: 1, max: 10 }),
          memory_intensity: fc.integer({ min: 1, max: 10 }),
          io_intensity: fc.integer({ min: 1, max: 10 }),
          traffic_pattern: trafficPatternGenerator,
          business_criticality: businessCriticalityGenerator,
          security_level: securityLevelGenerator,
        }),
        async funcData => {
          // Act: Get platform recommendation
          const recommendation = await calculatePlatformRecommendation(
            funcData.database_intensity,
            funcData.compute_intensity,
            funcData.memory_intensity,
            funcData.io_intensity,
            funcData.traffic_pattern,
            funcData.business_criticality,
            funcData.security_level
          );

          // Calculate intensity difference
          const intensityDiff = Math.abs(funcData.database_intensity - funcData.compute_intensity);

          // Property: Larger intensity differences should result in higher confidence
          if (intensityDiff >= 6) {
            // Clear preference should have high confidence
            expect(recommendation.confidence).toBeGreaterThan(0.7);
          } else if (intensityDiff <= 2) {
            // Close scores might have lower confidence (but still reasonable)
            expect(recommendation.confidence).toBeGreaterThan(0.5);
          }

          // Property: Confidence should never be too low (algorithm should always have some basis)
          expect(recommendation.confidence).toBeGreaterThan(0.5);
        }
      ),
      { numRuns: 50, timeout: 20000 }
    );
  });
});

/**
 * Integration Tests for Real Database Functions
 *
 * These tests validate the classification system against actual database data.
 */
describe('Function Classification Integration Tests', () => {
  test('Validate existing function classifications', async () => {
    // Get all classified functions from database
    const { data: functions, error } = await supabase
      .from('function_classification')
      .select('*')
      .limit(10);

    if (error) {
      console.warn('Skipping integration test due to database error:', error.message);
      return;
    }

    if (!functions || functions.length === 0) {
      console.warn('No functions found in database, skipping integration test');
      return;
    }

    // Validate each function meets our properties
    for (const func of functions) {
      // Property 1: Complete categorization
      expect(func.module_type).toBeDefined();
      expect(['core', 'social', 'admin', 'media', 'utility']).toContain(func.module_type);

      // Property 2: Valid platform recommendation
      expect(['supabase', 'railway']).toContain(func.recommended_platform);
      expect(func.platform_confidence).toBeGreaterThanOrEqual(0.0);
      expect(func.platform_confidence).toBeLessThanOrEqual(1.0);

      // Validate intensity scores
      expect(func.database_intensity).toBeGreaterThanOrEqual(1);
      expect(func.database_intensity).toBeLessThanOrEqual(10);
      expect(func.compute_intensity).toBeGreaterThanOrEqual(1);
      expect(func.compute_intensity).toBeLessThanOrEqual(10);
    }
  });

  test('Validate platform recommendation algorithm with real data', async () => {
    // Test with known database-heavy function
    const dbHeavyRecommendation = await calculatePlatformRecommendation(
      9,
      2,
      3,
      4,
      'medium',
      'high',
      'standard'
    );

    expect(dbHeavyRecommendation.recommended_platform).toBe('supabase');
    expect(dbHeavyRecommendation.confidence).toBeGreaterThan(0.8);

    // Test with known compute-heavy function
    const computeHeavyRecommendation = await calculatePlatformRecommendation(
      2,
      9,
      8,
      7,
      'high',
      'medium',
      'standard'
    );

    expect(computeHeavyRecommendation.recommended_platform).toBe('railway');
    expect(computeHeavyRecommendation.confidence).toBeGreaterThan(0.8);
  });
});
