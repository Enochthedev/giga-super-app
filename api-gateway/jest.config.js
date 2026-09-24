/** @type {import('jest').Config} */
// The service is TypeScript with ESM-style `.js` import specifiers; the test
// files are plain .js written against it. ts-jest compiles both to CommonJS for
// the test run so `jest.mock` hoisting works, and moduleNameMapper strips the
// `.js` suffix so `../index.js` resolves to `../index.ts`.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.(ts|js)', '**/?(*.)+(spec|test).(ts|js)'],
  transform: {
    '^.+\\.(ts|js)$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          allowJs: true,
          esModuleInterop: true,
          isolatedModules: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.*', '!src/**/*.spec.*'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.js'],
};
