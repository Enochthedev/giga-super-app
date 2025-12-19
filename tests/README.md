# Property-Based Tests for Function Classification System

## Overview

This directory contains property-based tests that validate the correctness
properties of the function classification and platform placement algorithms. The
tests use the fast-check library to generate random test cases and verify that
the system behaves correctly across a wide range of inputs.

## Properties Tested

### Property 1: Function Categorization Completeness

**Feature: platform-architecture-split, Property 1: Function Categorization
Completeness** **Validates: Requirements 1.1**

This property ensures that for any set of edge functions, the categorization
algorithm assigns each function to exactly one module category (core, social,
admin, media, utility) with valid reasoning.

**Test Coverage:**

- Every function gets assigned to a valid module
- Module assignments are from the allowed set
- Function names are preserved and valid
- All intensity scores are within valid ranges (1-10)
- Traffic patterns and business criticality are valid
- No duplicate function names in results
- All input functions are represented in output

### Property 2: Platform Placement Optimization

**Feature: platform-architecture-split, Property 2: Platform Placement
Optimization** **Validates: Requirements 1.2**

This property ensures that for any function with database and compute intensity
scores, the placement algorithm consistently chooses Supabase for database-heavy
functions (score > 7) and Railway for compute-heavy functions (score > 7).

**Test Coverage:**

- Platform recommendations are valid (supabase or railway)
- Confidence scores are within valid range (0.0 to 1.0)
- Reasoning is provided for all recommendations
- Database-heavy functions prefer Supabase
- Compute-heavy functions prefer Railway
- High memory/IO intensity influences Railway preference
- Critical business functions have high confidence
- Burst traffic patterns favor Railway
- Consistent recommendations for identical inputs
- Extreme cases have high confidence

## Additional Properties

### Platform Recommendation Consistency

Validates that the platform recommendation algorithm is deterministic and
produces consistent results for the same inputs across multiple invocations.

### Module Classification Logic

Validates that functions with similar characteristics are classified into
appropriate modules based on their intensity patterns.

### Confidence Score Validation

Validates that confidence scores correlate with the clarity of the platform
choice based on intensity score differences.

## Test Configuration

- **Framework**: Jest with fast-check for property-based testing
- **Iterations**: 100 iterations per property test (as specified in design)
- **Timeout**: 60 seconds per test to accommodate database operations
- **Environment**: Node.js with TypeScript support

## Running Tests

### Prerequisites

1. Install dependencies:

```bash
cd tests
npm install
```

2. Set up environment variables:

```bash
# Create .env file with Supabase credentials
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Test Commands

```bash
# Run all property tests
npm test

# Run specific property test
npm run test:property

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests with verbose output
npm run test:verbose
```

### Example Output

```
🧪 Starting Property-Based Tests for Function Classification
📊 Testing with fast-check property-based testing framework
🎯 Validating Requirements 1.1 and 1.2

 PASS  property-tests/function-classification.test.ts
  Function Classification Property Tests
    ✓ Property 1: Function Categorization Completeness (2345ms)
    ✓ Property 2: Platform Placement Optimization (3456ms)
    ✓ Property: Platform Recommendation Consistency (1234ms)
    ✓ Property: Module Classification Logic (987ms)
    ✓ Property: Confidence Score Validation (1567ms)
  Function Classification Integration Tests
    ✓ Validate existing function classifications (234ms)
    ✓ Validate platform recommendation algorithm with real data (345ms)

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
Snapshots:   0 total
Time:        9.168 s
Ran all test suites.
✅ Property-Based Tests completed
```

## Test Structure

### Generators

The tests use fast-check generators to create random but valid test data:

- `functionNameGenerator`: Valid function names (kebab-case)
- `moduleTypeGenerator`: Valid module types
- `intensityScoreGenerator`: Intensity scores (1-10)
- `trafficPatternGenerator`: Valid traffic patterns
- `businessCriticalityGenerator`: Valid criticality levels
- `securityLevelGenerator`: Valid security levels

### Test Categories

1. **Property Tests**: Validate universal properties that should hold for all
   inputs
2. **Integration Tests**: Validate against real database data
3. **Consistency Tests**: Ensure deterministic behavior
4. **Logic Tests**: Validate business logic assumptions

## Debugging Failed Tests

If property tests fail, fast-check will provide:

1. **Counterexample**: The specific input that caused the failure
2. **Shrinking**: A minimal example that still fails
3. **Seed**: For reproducing the exact test run

Example failure output:

```
Property failed after 1 tests
{ seed: 1234567890, path: "0:0:0", endOnFailure: true }
Counterexample: [{"function_name": "test-func", "database_intensity": 9, ...}]
Shrunk 5 time(s)
Got error: Expected 'railway' but received 'supabase'
```

## Integration with CI/CD

These tests should be run as part of the CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run Property Tests
  run: |
    cd tests
    npm install
    npm run test:coverage
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

## Maintenance

### Adding New Properties

1. Define the property in the design document
2. Create a new test case with appropriate generators
3. Tag with the required format:
   `**Feature: platform-architecture-split, Property {number}: {property_text}**`
4. Ensure minimum 100 iterations
5. Add integration tests if needed

### Updating Generators

When the classification system changes:

1. Update generators to match new valid values
2. Adjust property assertions for new business rules
3. Update integration tests for schema changes
4. Maintain backward compatibility where possible

## Performance Considerations

- Tests run against a real database, so network latency affects performance
- Property tests with 100 iterations can take several minutes
- Use `maxWorkers: 1` to avoid database connection conflicts
- Consider using a local Supabase instance for faster testing

## Troubleshooting

### Common Issues

1. **Database Connection Errors**: Check environment variables and network
   connectivity
2. **Timeout Errors**: Increase test timeout or reduce iteration count for
   debugging
3. **Flaky Tests**: Ensure database state is consistent between test runs
4. **Memory Issues**: Large property test runs may require increased Node.js
   memory

### Debug Mode

Run tests with additional debugging:

```bash
DEBUG=* npm test
NODE_OPTIONS="--inspect" npm test
```

This comprehensive test suite ensures the reliability and correctness of the
function classification system, providing confidence in the platform
architecture split decisions.
