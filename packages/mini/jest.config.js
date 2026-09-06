const moduleNameMapper = {
  '^(\\.{1,2}/.*)\\.js$': '$1',
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
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.ts'],
};
