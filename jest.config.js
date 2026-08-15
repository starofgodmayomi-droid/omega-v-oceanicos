export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages', '<rootDir>/apps', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '@omega-v/types': '<rootDir>/packages/types/src/index.ts',
    '@omega-v/observer': '<rootDir>/packages/observer/src/index.ts',
    '@omega-v/verification': '<rootDir>/packages/verification/src/index.ts',
    '@omega-v/remember': '<rootDir>/packages/remember/src/index.ts',
    '@omega-v/mini': '<rootDir>/packages/mini/src/index.ts',
    '@omega-v/attestation': '<rootDir>/packages/attestation/src/index.ts',
  },
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    'apps/*/src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};
