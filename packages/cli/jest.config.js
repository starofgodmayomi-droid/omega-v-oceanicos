const moduleNameMapper = {
  '^(\\.{1,2}/.*)\\.js$': '$1',
};

export default {
  displayName: 'cli',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  testPathIgnorePatterns: ['<rootDir>/src/__tests__/cli-entrypoint.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  moduleNameMapper,
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.ts'],
};
