module.exports = {
  preset: 'ts-jest',
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
  verbose: true,
  testTimeout: 30000,
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
      },
    },
  },
  // Separate integration tests from unit tests
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      testEnvironment: 'node',
    },
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      testEnvironment: 'node',
      testTimeout: 60000, // Integration tests may need more time
    },
  ],
};
