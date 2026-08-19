import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

/**
 * Flat configuration, required from ESLint v9.
 *
 * The previous setup used .eslintrc.json, .eslintignore and `--ext`, all
 * three of which ESLint 10 removed. The linting group bump failed with
 * "ESLint couldn't find an eslint.config.(js|mjs|cjs) file", which is the
 * upgrade telling us the configuration format changed rather than anything
 * being wrong with the code.
 *
 * Written as .mjs so it is unambiguously ESM regardless of what the root
 * package.json declares.
 *
 * KNOWN REDUCTION, stated rather than hidden: the old config extended
 * `eslint:recommended`, which in flat config lives in the separate
 * `@eslint/js` package. Adding a dependency requires regenerating the
 * lockfile, which this change cannot do reliably by hand, so the core rules
 * that TypeScript does not already catch are re-added explicitly below.
 * Restoring `@eslint/js` is a follow-up, and until then this file is the
 * honest record of what is and is not being checked.
 */
export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/*.tsbuildinfo'],
  },

  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Previously supplied by env: node/es2020/jest.
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...prettierConfig.rules,

      // Carried over unchanged from .eslintrc.json.
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'prettier/prettier': 'error',

      // Re-added from eslint:recommended. Chosen because TypeScript does not
      // catch them and each has bitten real codebases: an assignment inside
      // a condition, a forgotten debugger, a promise executor that swallows
      // rejections, a typeof compared against a string that is never a type.
      'no-cond-assign': 'error',
      'no-debugger': 'error',
      'no-duplicate-case': 'error',
      'no-fallthrough': 'error',
      'no-async-promise-executor': 'error',
      'no-prototype-builtins': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'no-self-compare': 'error',
      'require-atomic-updates': 'error',
    },
  },

  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
    rules: {
      // Tests reach for `any` when constructing deliberately malformed input,
      // which is the point of those tests.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  {
    files: ['**/*.cjs', 'scripts/**'],
    languageOptions: { sourceType: 'commonjs' },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
    },
  },
];
