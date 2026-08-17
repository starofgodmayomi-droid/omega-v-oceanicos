const moduleNameMapper = {
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
  '@omega-v/dissensus': '<rootDir>/packages/dissensus/src/index.ts',
  '\\.css$': '<rootDir>/tests/style-stub.cjs',
};

export default {
  // Two environments, because the repository is two runtimes. The server and
  // packages are Node; the dashboard is a React component that needs a DOM.
  // Running everything under jsdom would slow the server suites and hide
  // Node-specific behaviour, so each project declares what it actually needs.
  projects: [
    {
      displayName: 'node',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/packages', '<rootDir>/apps', '<rootDir>/tests'],
      testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
      testPathIgnorePatterns: ['/node_modules/', '<rootDir>/apps/web/src/__tests__/dom/'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
      moduleNameMapper,
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    },
    {
      displayName: 'dom',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/apps/web/src/__tests__/dom'],
      testMatch: ['**/*.test.tsx'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
      moduleNameMapper,
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          { tsconfig: { jsx: 'react-jsx', esModuleInterop: true, target: 'ES2020' } },
        ],
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.dom.ts'],
    },
  ],
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    'apps/*/src/**/*.ts',
    // apps/web/src/App.tsx is now covered by the `dom` project, so the
    // .tsx glob is included rather than excluded. The reported percentage
    // is a percentage of the repository, not of the server alone.
    // apps/web/src/App.tsx is now exercised by the `dom` project, so the
    // .tsx glob is included rather than excluded. This moved the reported
    // figure from 96.18% to 84.37%: the old number was a percentage of the
    // server, computed with the largest source file in the repository left
    // out of the denominator. The lower number is the honest one.
    'apps/web/src/**/*.tsx',
    '!apps/web/src/main.tsx',
    // Test files and their fixtures are not the subject under test.
    '!**/__tests__/**',
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
};
