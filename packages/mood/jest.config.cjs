module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@oceanicos/types$': '<rootDir>/../types/src/index.ts',
    '^@omega-v/types$': '<rootDir>/../types/src/index.ts',
  },
};
