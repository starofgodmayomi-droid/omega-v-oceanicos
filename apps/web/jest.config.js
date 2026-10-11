const moduleNameMapper = {
  '^(\\.{1,2}/.*)\\.js$': '$1',
  '\\.css$': '<rootDir>/../../tests/style-stub.cjs',
};

export default {
  displayName: 'web-dom',
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  rootDir: '.',
  testMatch: ['<rootDir>/src/__tests__/dom/**/*.test.tsx'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper,
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          target: 'ES2020',
          module: 'ESNext',
        },
      },
    ],
  },
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.dom.ts'],
};
