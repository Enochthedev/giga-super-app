/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/property-tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['property-tests/**/*.ts', '!property-tests/**/*.d.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  testTimeout: 60000, // 60 seconds for property tests
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
  verbose: true,
  bail: false, // Continue running tests even if some fail
};
