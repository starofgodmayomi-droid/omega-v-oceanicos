export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages', '<rootDir>/apps', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    // The packages are ESM ("type": "module"), so relative imports must
    // carry a .js extension for Node to resolve them at runtime. Strip it
    // here so ts-jest still resolves the .ts source.
    '^(\\.{1,2}/.*)\\.js$': '$1',
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
    // Known gap, stated rather than hidden: the .ts glob silently excludes
    // apps/web/src/App.tsx, the largest source file in the repository, from
    // the coverage denominator. The reported percentage is therefore a
    // percentage of the server, not of the repo. Covering it needs jsdom and
    // a component testing setup that does not exist yet; until then the
    // exclusion is explicit here so the number is not read as more than it is.
    '!apps/web/src/**',
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
