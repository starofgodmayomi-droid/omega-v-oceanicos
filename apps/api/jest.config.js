const moduleNameMapper = {
  '^(\\.{1,2}/.*)\\.js$': '$1',
  '@omega-v/types': '<rootDir>/../../packages/types/src/index.ts',
  '@omega-v/observer': '<rootDir>/../../packages/observer/src/index.ts',
  '@omega-v/verification': '<rootDir>/../../packages/verification/src/index.ts',
  '@omega-v/attestation': '<rootDir>/../../packages/attestation/src/index.ts',
  '@omega-v/dissensus': '<rootDir>/../../packages/dissensus/src/index.ts',
  '@omega-v/remember': '<rootDir>/../../packages/remember/src/index.ts',
  '@omega-v/mini': '<rootDir>/../../packages/mini/src/index.ts',
};

export default {
  displayName: 'api',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  testPathIgnorePatterns: ['<rootDir>/src/__tests__/documentation.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  moduleNameMapper,
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.ts'],
};
