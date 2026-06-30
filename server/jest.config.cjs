// The project compiles with "module": "nodenext" and every internal import
// uses an explicit .js specifier pointing at a .ts source file (required by
// NodeNext resolution). Jest's resolver would otherwise look for a literal
// .js file and fail, so this strips the suffix and lets moduleFileExtensions
// (which lists "ts" first) resolve to the real .ts file instead.
const moduleNameMapper = {
  // src/utils/logger.ts requires a full AppConfig and writes a log file as a
  // side effect of initializeLogger() — swap in a silent test double instead.
  // Must come before the generic .js-stripper below since Jest uses the
  // first matching pattern.
  '.*/utils/logger\\.js$': '<rootDir>/tests/helpers/loggerMock.ts',
  '^(\\.{1,2}/.*)\\.js$': '$1',
};

// Root tsconfig.json excludes "tests" and only lists "node" in `types`, so
// test files (which use Jest's ambient describe/it/expect globals) need this
// override merged on top when ts-jest compiles them.
const transform = {
  '^.+\\.ts$': ['ts-jest', {
    tsconfig: {
      esModuleInterop: true,
      types: ['node', 'jest'],
    },
    // TS151002: hybrid module kind (nodenext) recommending isolatedModules —
    // harmless here since ts-jest's default (non-isolated) transform already
    // works; silencing per the warning's own suggestion to cut test-run noise.
    diagnostics: {
      ignoreCodes: [151002],
    },
  }],
};

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper,
  verbose: true,
  testTimeout: 30000,
  transform,
  // Separate integration tests from unit tests
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      testEnvironment: 'node',
      moduleNameMapper,
      transform,
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      testEnvironment: 'node',
      testTimeout: 60000, // Integration tests may need more time
      moduleNameMapper,
      transform,
      globalSetup: '<rootDir>/tests/integration/helpers/globalSetup.ts',
      setupFilesAfterEnv: ['<rootDir>/tests/integration/helpers/jestSetup.ts'],
    },
  ],
};
