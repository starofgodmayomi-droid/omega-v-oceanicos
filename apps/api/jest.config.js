const moduleNameMapper = {
  '^(\\.{1,2}/.*)\\.js$': '$1',
  '@oceanicos/types': '<rootDir>/../../packages/types/src/index.ts',
  '@oceanicos/observer': '<rootDir>/../../packages/observer/src/index.ts',
  '@oceanicos/verification': '<rootDir>/../../packages/verification/src/index.ts',
  '@oceanicos/attestation': '<rootDir>/../../packages/attestation/src/index.ts',
  '@oceanicos/remember': '<rootDir>/../../packages/remember/src/index.ts',
  '@oceanicos/mini': '<rootDir>/../../packages/mini/src/index.ts',
  '@oceanicos/generative': '<rootDir>/../../packages/generative/src/index.ts',
  '@oceanicos/mood': '<rootDir>/../../packages/mood/src/index.ts',
  '@oceanicos/vector': '<rootDir>/../../packages/vector/src/index.ts',
  '@oceanicos/inference': '<rootDir>/../../packages/inference/src/index.ts',
  '@oceanicos/authorization': '<rootDir>/../../packages/authorization/src/index.ts',
  '@oceanicos/pluralism': '<rootDir>/../../packages/pluralism/src/index.ts',
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
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        isolatedModules: true,
      },
    ],
  },
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.ts'],
};

