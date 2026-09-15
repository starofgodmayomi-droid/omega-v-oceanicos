const moduleNameMapper = {
  '^(\\.{1,2}/.*)\\.js$': '$1',
  '@oceanicos/types': '<rootDir>/../types/src/index.ts',
  '@oceanicos/observer': '<rootDir>/../observer/src/index.ts',
  '@oceanicos/verification': '<rootDir>/../verification/src/index.ts',
  '@oceanicos/remember': '<rootDir>/../remember/src/index.ts',
  '@oceanicos/attestation': '<rootDir>/../attestation/src/index.ts',
  '@oceanicos/mini': '<rootDir>/src/index.ts',
  '@omega-v/types': '<rootDir>/../types/src/index.ts',
  '@omega-v/observer': '<rootDir>/../observer/src/index.ts',
  '@omega-v/verification': '<rootDir>/../verification/src/index.ts',
  '@omega-v/remember': '<rootDir>/../remember/src/index.ts',
  '@omega-v/attestation': '<rootDir>/../attestation/src/index.ts',
};

export default {
  displayName: 'mini',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
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
