// The package is CommonJS, so this file must be too (it used `export default`,
// which Jest could only half-read: `moduleNameMapping` was also a typo for
// `moduleNameMapper`, and nothing was transformed, so no suite could load).
// Tests are ESM-syntax .js importing the .ts sources via NodeNext-style `.js`
// specifiers; ts-jest compiles both down to CommonJS.
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        isolatedModules: true,
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node',
          allowJs: true,
          esModuleInterop: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/test/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: ['<rootDir>/src/**/?(*.)+(spec|test).[jt]s'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.js'],
};
