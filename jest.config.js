/** @type {import('jest').Config} */
export default {
  projects: [
    '<rootDir>/api-gateway/jest.config.js',
    '<rootDir>/search-service/jest.config.js',
    '<rootDir>/admin-service/jest.config.js',
    '<rootDir>/delivery-service/jest.config.js',
    '<rootDir>/payment-queue-service/jest.config.js',
  ],
  collectCoverage: false,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
