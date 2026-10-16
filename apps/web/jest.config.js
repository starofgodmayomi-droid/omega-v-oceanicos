const moduleNameMapper = {
  '^(\\.{1,2}/.*)\\.js$': '$1',
  '\\.css$': '<rootDir>/../../tests/style-stub.cjs',
};

export default {
  displayName: 'web-dom',
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testEnvironment: 'jsdom',
  rootDir: '.',
  modulePaths: ['<rootDir>/node_modules'],
  testMatch: ['<rootDir>/src/__tests__/dom/**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper,
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          jsx: 'react-jsx',
          esModuleInterop: true,
          target: 'ES2020',
        },
      },
    ],
  },
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.dom.ts'],
};
