const moduleNameMapper = {
  '^(\\.{1,2}/.*)\\.js$': '$1',
  '@omega-v/types': '<rootDir>/../types/src/index.ts',
  '@omega-v/observer': '<rootDir>/../observer/src/index.ts',
  '@omega-v/verification': '<rootDir>/../verification/src/index.ts',
  '@omega-v/attestation': '<rootDir>/../attestation/src/index.ts',
  '@omega-v/store': '<rootDir>/../store/src/index.ts',
  '@omega-v/contract': '<rootDir>/../contract/src/index.ts',
  '@omega-v/auth': '<rootDir>/../auth/src/index.ts',
  '@omega-v/replay': '<rootDir>/../replay/src/index.ts',
  '@omega-v/vaas': '<rootDir>/../vaas/src/index.ts',
  '@omega-v/federation': '<rootDir>/../federation/src/index.ts',
  '@omega-v/remember': '<rootDir>/../remember/src/index.ts',
  '@omega-v/mini': '<rootDir>/../mini/src/index.ts',
  '@omega-v/sdk': '<rootDir>/src/index.ts',
};

export default {
  displayName: 'sdk',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  moduleNameMapper,
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.ts'],
};
