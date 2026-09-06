const moduleNameMapper = {
  '^(\\.{1,2}/.*)\\.js$': '$1',
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
