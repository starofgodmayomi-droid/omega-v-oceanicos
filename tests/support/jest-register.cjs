/**
 * Runtime shim that lets the repository's Jest-written tests run on the
 * native `node:test` runner.
 *
 * Why a custom register hook instead of `node --test` directly: the packages
 * are TypeScript sources that import interfaces without the `type` keyword,
 * and several suites use CommonJS idioms (`require`, `__filename`,
 * `jest.resetModules`). Loading the sources through TypeScript's transpiler in
 * CommonJS mode reproduces the environment the tests were written for; Node's
 * built-in type stripping cannot erase type-only imports.
 *
 * Responsibilities:
 *  - transpile the workspace `src` (and tests) on require;
 *  - resolve `@oceanicos/*` and legacy `@omega-v/*` to `packages/<name>/src`;
 *  - resolve CommonJS-style relative writes (`./jobs.js`, `../index`) to `.ts`;
 *  - route `@jest/globals` and CSS imports to the compatibility layer;
 *  - provide `jest.mock` module interception through the require registry.
 */
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const repoRoot = path.resolve(__dirname, '..', '..');
const packagesDir = path.join(repoRoot, 'packages');
const compatPath = path.join(__dirname, 'jest-compat.mjs');
const styleStub = path.join(repoRoot, 'tests', 'style-stub.cjs');

// Tests must never rely on a committed default signing key; the old Jest
// setup file supplied an explicit test-only key.
process.env.OMEGA_SIGNING_KEY = process.env.OMEGA_SIGNING_KEY ?? 'test-only-signing-key';

require('ts-node').register({
  transpileOnly: true,
  moduleTypes: { '**/*.ts': 'cjs', '**/*.tsx': 'cjs' },
  ignore: [/node_modules/],
  compilerOptions: {
    module: 'CommonJS',
    moduleResolution: 'node',
    target: 'ES2022',
    esModuleInterop: true,
    jsx: 'react-jsx',
    resolveJsonModule: true,
    skipLibCheck: true,
    noEmit: false,
  },
});

const moduleMocks = new Map();
globalThis.__jestModuleMocks = moduleMocks;

// Fastify v5 no longer makes the instance a callable request listener; the
// handler lives on `instance.routing`. The API suites were written against the
// callable form (`http.createServer(app)`), so route those calls to `routing`.
// Passing a non-function to `http.createServer` is otherwise treated as an
// options object, which yields a server that never answers (an infinite hang).
const http = require('node:http');
const originalCreateServer = http.createServer;
http.createServer = function createServer(first, ...rest) {
  if (first && typeof first === 'object' && typeof first.routing === 'function') {
    const instance = first;
    // v4 awaited `ready()` implicitly for a callable instance; v5 does not.
    const listener = (request, response) => {
      instance
        .ready()
        .then(() => instance.routing(request, response))
        .catch((error) => {
          response.statusCode = 500;
          response.end(String((error && error.message) || error));
        });
    };
    return originalCreateServer.call(this, listener, ...rest);
  }
  return originalCreateServer.call(this, first, ...rest);
};

const packageEntry = (name) => {
  const entry = path.join(packagesDir, name, 'src', 'index.ts');
  return fs.existsSync(entry) ? entry : null;
};

const withSourceExtension = (candidate) => {
  const alternatives = [];
  if (candidate.endsWith('.js')) alternatives.push(`${candidate.slice(0, -3)}.ts`);
  if (candidate.endsWith('.jsx')) alternatives.push(`${candidate.slice(0, -4)}.tsx`);
  if (!path.extname(candidate)) alternatives.push(`${candidate}.ts`, `${candidate}.tsx`);
  return alternatives.find((file) => fs.existsSync(file)) || null;
};

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request === '@jest/globals' || request === '@jest/globals.js') return compatPath;
  if (request.endsWith('.css') || request.endsWith('.scss')) return styleStub;

  const workspace = /^@(?:oceanicos|omega-v)\/([a-z0-9][a-z0-9-]*)$/.exec(request);
  if (workspace) {
    const entry = packageEntry(workspace[1]);
    if (entry) return originalResolve.call(this, entry, parent, isMain, options);
  }

  try {
    return originalResolve.call(this, request, parent, isMain, options);
  } catch (error) {
    if (request.startsWith('.') && parent && parent.filename) {
      const candidate = withSourceExtension(path.resolve(path.dirname(parent.filename), request));
      if (candidate) return candidate;
      if (!path.extname(request)) {
        const nested = path.resolve(path.dirname(parent.filename), request, 'index.ts');
        if (fs.existsSync(nested)) return nested;
      }
    }
    throw error;
  }
};

const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
  const mock = globalThis.__jestRequireActualDepth > 0 ? undefined : moduleMocks.get(request);
  if (mock) {
    if (!mock.loaded) {
      mock.exports = mock.factory();
      mock.loaded = true;
    }
    return mock.exports;
  }
  return originalLoad.call(this, request, parent, isMain);
};

// Install the Jest-compatible globals (`describe`, `expect`, `jest`, ...).
require(compatPath);
