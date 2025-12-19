// Test setup file
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Mock external services for testing
global.mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
};

// Global test timeout
jest.setTimeout(10000);
