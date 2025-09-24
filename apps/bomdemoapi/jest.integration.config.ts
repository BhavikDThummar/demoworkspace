import type { Config } from 'jest';

const config: Config = {
  displayName: 'bomdemoapi-integration',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',

  // Test file patterns for integration tests
  testMatch: ['<rootDir>/src/**/*.integration.spec.ts', '<rootDir>/src/**/*.e2e.spec.ts'],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],

  // Transform configuration
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        isolatedModules: true,
      },
    ],
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'html'],

  // Module name mapping for path aliases
  moduleNameMapping: {
    '^@org/gorules$': '<rootDir>/../../libs/gorules/src/index.ts',
    '^@org/gorules/(.*)$': '<rootDir>/../../libs/gorules/src/$1',
  },

  // Coverage configuration
  collectCoverageFrom: [
    '<rootDir>/src/**/*.(t|j)s',
    '!<rootDir>/src/**/*.spec.ts',
    '!<rootDir>/src/**/*.integration.spec.ts',
    '!<rootDir>/src/**/*.e2e.spec.ts',
    '!<rootDir>/src/test-setup.ts',
    '!<rootDir>/src/main.ts',
  ],

  coverageDirectory: '../../coverage/apps/bomdemoapi-integration',
  coverageReporters: ['html', 'lcov', 'text-summary'],

  // Test timeout for integration tests (longer than unit tests)
  testTimeout: 30000,

  // Global setup and teardown
  globalSetup: '<rootDir>/src/test-global-setup.ts',
  globalTeardown: '<rootDir>/src/test-global-teardown.ts',

  // Verbose output for integration tests
  verbose: true,

  // Fail fast on first test failure in CI
  bail: process.env.CI ? 1 : 0,

  // Maximum number of concurrent workers
  maxWorkers: process.env.CI ? 2 : '50%',

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Error handling
  errorOnDeprecated: true,

  // Module resolution
  resolver: undefined,

  // Test result processor
  testResultsProcessor: undefined,

  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/../../node_modules/',
    '<rootDir>/../../dist/',
    '<rootDir>/../../coverage/',
  ],

  // Ignore patterns
  testPathIgnorePatterns: ['<rootDir>/../../node_modules/', '<rootDir>/../../dist/'],

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Detect leaked timers
  detectLeaks: false,
};

export default config;
