/**
 * Jest setup file for property-based tests
 */

import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Set default test timeout
jest.setTimeout(60000);

// Global test setup
beforeAll(() => {
  console.log('🧪 Starting Property-Based Tests for Function Classification');
  console.log('📊 Testing with fast-check property-based testing framework');
  console.log('🎯 Validating Requirements 1.1 and 1.2');
});

afterAll(() => {
  console.log('✅ Property-Based Tests completed');
});
