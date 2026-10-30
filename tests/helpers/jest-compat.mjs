/**
 * Jest -> node:test bridge.
 *
 * The repository accumulated ~150 Jest-style suites (bare `describe`/`it`/
 * `expect` globals) that could not run at all: jest is not a dependency, and
 * jest.config.js maps dozens of packages that no longer exist. Rewriting every
 * assertion by hand would have changed the meaning of the tests; instead this
 * module installs the Jest globals on top of `node:test`, so those suites run
 * under the node test runner unchanged.
 *
 * Loaded via `node --import ./tests/helpers/jest-compat.mjs --test ...`
 * (see tests/run-node-suite.mjs). It provides only what the suites use:
 * describe/it/test/before/after/beforeEach/afterEach, `expect` with the
 * matchers below plus `.not`, `.resolves`, `.rejects`, and a `jest.fn()` mock.
 *
 * NOT supported: `jest.mock` module interception and fake timers. Suites that
 * need them are excluded by tests/run-node-suite.mjs and reported as unwired.
 */
import { describe, it, test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { inspect } from 'node:util';
import { registerHooks, createRequire } from 'node:module';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const fmt = (value) => inspect(value, { depth: 4, breakLength: 120 });

/** `expect.objectContaining` / `.arrayContaining` / `.any` and friends. */
const ASYMMETRIC = Symbol.for('omega.jest.asymmetric');
const isAsymmetric = (value) => Boolean(value && value[ASYMMETRIC]);

const asymmetric = (matches) => ({ [ASYMMETRIC]: true, matches });

const isPlainObject = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  !(value instanceof Date) &&
  !(value instanceof RegExp);

/** Recursive subset match, mirroring Jest's `toMatchObject`. */
function matchObject(actual, expected) {
  if (isAsymmetric(expected)) return expected.matches(actual);
  if (expected instanceof RegExp) return typeof actual === 'string' && expected.test(actual);
  if (Array.isArray(expected)) {
    // Jest compares arrays as a subset of indices but requires equal length.
    if (!Array.isArray(actual) || actual.length !== expected.length) return false;
    return expected.every((item, index) => matchObject(actual[index], item));
  }
  if (isPlainObject(expected)) {
    if (!isPlainObject(actual)) return false;
    return Object.keys(expected).every(
      (key) => Object.prototype.hasOwnProperty.call(actual, key) && matchObject(actual[key], expected[key])
    );
  }
  return Object.is(actual, expected);
}

function deepEqual(actual, expected) {
  if (isAsymmetric(expected)) return expected.matches(actual);
  try {
    assert.deepStrictEqual(actual, expected);
    return true;
  } catch {
    return false;
  }
}

/**
 * Jest's `toEqual` semantics: like `deepStrictEqual`, except that properties
 * whose value is `undefined` are ignored on both sides, and asymmetric
 * matchers are honoured anywhere in the tree. `toStrictEqual` keeps the
 * strict comparison.
 */
function toEqual(actual, expected) {
  if (isAsymmetric(expected)) return expected.matches(actual);
  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((item, index) => toEqual(actual[index], item))
    );
  }
  if (isPlainObject(expected)) {
    if (!isPlainObject(actual)) return false;
    const definedKeys = (value) => Object.keys(value).filter((key) => value[key] !== undefined);
    const expectedKeys = definedKeys(expected);
    const actualKeys = definedKeys(actual);
    if (expectedKeys.length !== actualKeys.length) return false;
    return expectedKeys.every(
      (key) => Object.prototype.hasOwnProperty.call(actual, key) && toEqual(actual[key], expected[key])
    );
  }
  return deepEqual(actual, expected);
}

function isMock(fn) {
  return typeof fn === 'function' && Array.isArray(fn.mock?.calls);
}

function thrownBy(fn) {
  try {
    fn();
    return { threw: false };
  } catch (error) {
    return { threw: true, error };
  }
}

function matchesThrown(error, expected) {
  if (expected === undefined) return true;
  if (typeof expected === 'string') return String(error?.message ?? '').includes(expected);
  if (expected instanceof RegExp) return expected.test(String(error?.message ?? ''));
  if (typeof expected === 'function') {
    if (expected === Error || expected.prototype instanceof Error) return error instanceof expected;
    return Boolean(expected(error));
  }
  if (expected instanceof Error) {
    return error?.constructor === expected.constructor && error?.message === expected.message;
  }
  if (isPlainObject(expected)) return matchObject(error, expected);
  return false;
}

function buildMatchers(actual, negated, label) {
  const pass = (condition, description) => {
    if (negated ? condition : !condition) {
      throw new Error(`expected ${label} ${negated ? 'not ' : ''}${description}`);
    }
  };
  const requireMock = () => {
    if (!isMock(actual)) throw new Error(`expected ${label} to be a mock function`);
  };

  return {
    toBe: (expected) => pass(Object.is(actual, expected), `to be ${fmt(expected)}, received ${fmt(actual)}`),
    toEqual: (expected) => pass(toEqual(actual, expected), `to equal ${fmt(expected)}, received ${fmt(actual)}`),
    toStrictEqual: (expected) =>
      pass(deepEqual(actual, expected), `to strictly equal ${fmt(expected)}, received ${fmt(actual)}`),
    toMatch: (expected) =>
      pass(
        typeof expected === 'string' ? String(actual).includes(expected) : expected.test(String(actual)),
        `to match ${fmt(expected)}, received ${fmt(actual)}`
      ),
    toContain: (expected) =>
      pass(
        typeof actual === 'string'
          ? actual.includes(expected)
          : Array.from(actual ?? []).some((item) => Object.is(item, expected) || deepEqual(item, expected)),
        `to contain ${fmt(expected)}`
      ),
    toContainEqual: (expected) =>
      pass(
        Array.from(actual ?? []).some((item) => deepEqual(item, expected)),
        `to contain an item equal to ${fmt(expected)}`
      ),
    toHaveLength: (expected) => pass(actual?.length === expected, `to have length ${expected}, received ${actual?.length}`),
    toBeDefined: () => pass(actual !== undefined, 'to be defined, received undefined'),
    toBeUndefined: () => pass(actual === undefined, `to be undefined, received ${fmt(actual)}`),
    toBeNull: () => pass(actual === null, `to be null, received ${fmt(actual)}`),
    toBeTruthy: () => pass(Boolean(actual), `to be truthy, received ${fmt(actual)}`),
    toBeFalsy: () => pass(!actual, `to be falsy, received ${fmt(actual)}`),
    toBeNaN: () => pass(Number.isNaN(actual), `to be NaN, received ${fmt(actual)}`),
    toBeInstanceOf: (expected) => pass(actual instanceof expected, `to be an instance of ${expected?.name}`),
    toBeGreaterThan: (expected) => pass(actual > expected, `to be greater than ${fmt(expected)}, received ${fmt(actual)}`),
    toBeGreaterThanOrEqual: (expected) =>
      pass(actual >= expected, `to be >= ${fmt(expected)}, received ${fmt(actual)}`),
    toBeLessThan: (expected) => pass(actual < expected, `to be less than ${fmt(expected)}, received ${fmt(actual)}`),
    toBeLessThanOrEqual: (expected) =>
      pass(actual <= expected, `to be <= ${fmt(expected)}, received ${fmt(actual)}`),
    toBeCloseTo: (expected, precision = 2) =>
      pass(
        Math.abs(Number(actual) - Number(expected)) < Math.pow(10, -precision) / 2,
        `to be close to ${fmt(expected)}, received ${fmt(actual)}`
      ),
    toMatchObject: (expected) =>
      pass(matchObject(actual, expected), `to match object ${fmt(expected)}, received ${fmt(actual)}`),
    toHaveProperty: (path, ...rest) => {
      const parts = Array.isArray(path) ? path : String(path).split('.');
      let current = actual;
      let present = true;
      for (const part of parts) {
        if (current === null || current === undefined || !(part in Object(current))) {
          present = false;
          break;
        }
        current = current[part];
      }
      if (rest.length > 0) {
        pass(
          present && (deepEqual(current, rest[0]) || matchObject(current, rest[0])),
          `to have property ${String(path)} = ${fmt(rest[0])}, received ${fmt(current)}`
        );
        return;
      }
      pass(present, `to have property ${String(path)}`);
    },
    toThrow: (expected) => {
      const outcome = thrownBy(actual);
      if (!outcome.threw) {
        pass(false, 'to throw, but it did not throw');
        return;
      }
      pass(matchesThrown(outcome.error, expected), `to throw ${fmt(expected)}, received ${fmt(outcome.error?.message)}`);
    },
    toThrowError: (expected) => buildMatchers(actual, negated, label).toThrow(expected),
    toHaveBeenCalled: () => {
      requireMock();
      pass(actual.mock.calls.length > 0, 'to have been called');
    },
    toHaveBeenCalledTimes: (expected) => {
      requireMock();
      pass(actual.mock.calls.length === expected, `to have been called ${expected} times, received ${actual.mock.calls.length}`);
    },
    toHaveBeenCalledWith: (...expected) => {
      requireMock();
      pass(actual.mock.calls.some((args) => toEqual(args, expected)), `to have been called with ${fmt(expected)}`);
    },
    toHaveBeenLastCalledWith: (...expected) => {
      requireMock();
      const last = actual.mock.calls[actual.mock.calls.length - 1] ?? [];
      pass(toEqual(last, expected), `to have been last called with ${fmt(expected)}, received ${fmt(last)}`);
    },
  };
}

function settle(actual) {
  if (!actual || typeof actual.then !== 'function') {
    throw new Error('`.resolves` / `.rejects` received a value that is not a promise');
  }
  return actual;
}

/** A `.resolves` / `.rejects` modifier: await the promise, then match the outcome. */
function settledMatchers(actual, negated, label, mode) {
  const outcome = async () => {
    if (mode === 'resolves') return settle(actual);
    try {
      await settle(actual);
    } catch (error) {
      return error;
    }
    throw new Error(`expected ${label} to reject, but it resolved`);
  };

  const matcher = async (name, negate, args) => {
    const value = await outcome();
    const describe = `${label} ${mode === 'resolves' ? 'resolved to' : 'rejected with'} ${fmt(value)}`;
    // `.rejects.toThrow(...)` matches the rejection itself, not a function that
    // throws it: jest reports the rejected error's message/type.
    if (mode === 'rejects' && (name === 'toThrow' || name === 'toThrowError')) {
      return buildMatchers(() => { throw value; }, negate, describe)[name](...args);
    }
    return buildMatchers(value, negate, describe)[name](...args);
  };

  const proxy = {};
  for (const name of Object.keys(buildMatchers(undefined, false, label))) {
    proxy[name] = (...args) => matcher(name, negated, args);
  }
  proxy.not = new Proxy({}, {
    get: (_target, name) => (...args) => matcher(name, !negated, args),
  });
  return proxy;
}

export function expect(actual) {
  const label = `value ${fmt(actual)}`;
  return {
    ...buildMatchers(actual, false, label),
    not: buildMatchers(actual, true, label),
    resolves: settledMatchers(actual, false, label, 'resolves'),
    rejects: settledMatchers(actual, false, label, 'rejects'),
  };
}

/** Asymmetric matchers usable inside `toEqual` / `toMatchObject` expectations. */
expect.objectContaining = (subset) =>
  asymmetric((actual) => matchObject(actual, subset));
expect.arrayContaining = (items) =>
  asymmetric(
    (actual) =>
      Array.isArray(actual) &&
      items.every((item) => actual.some((entry) => deepEqual(entry, item) || matchObject(entry, item)))
  );
expect.any = (Ctor) =>
  asymmetric((actual) => {
    if (Ctor === String) return typeof actual === 'string' || actual instanceof String;
    if (Ctor === Number) return typeof actual === 'number' || actual instanceof Number;
    if (Ctor === Boolean) return typeof actual === 'boolean' || actual instanceof Boolean;
    if (Ctor === Function) return typeof actual === 'function';
    if (Ctor === Object) return typeof actual === 'object';
    return actual instanceof Ctor;
  });
expect.anything = () => asymmetric((actual) => actual !== null && actual !== undefined);
expect.stringContaining = (text) => asymmetric((actual) => String(actual).includes(text));
expect.stringMatching = (pattern) =>
  asymmetric((actual) => (typeof pattern === 'string' ? String(actual).includes(pattern) : pattern.test(String(actual))));
expect.closeTo = (value, precision = 2) =>
  asymmetric((actual) => Math.abs(Number(actual) - Number(value)) < Math.pow(10, -precision) / 2);

/** Minimal `jest.fn()`: records calls, optional implementation. */
function fn(implementation) {
  const mock = { calls: [], instances: [], results: [] };
  const mockFn = function mockFunction(...args) {
    mock.calls.push(args);
    mock.instances.push(this);
    try {
      const value = implementation ? implementation.apply(this, args) : undefined;
      mock.results.push({ type: 'return', value });
      return value;
    } catch (error) {
      mock.results.push({ type: 'throw', value: error });
      throw error;
    }
  };
  mockFn.mock = mock;
  mockFn.mockClear = () => {
    mock.calls.length = 0;
    mock.instances.length = 0;
    mock.results.length = 0;
    return mockFn;
  };
  mockFn.mockReset = () => {
    mockFn.mockClear();
    implementation = undefined;
    return mockFn;
  };
  mockFn.mockReturnValue = (value) => {
    implementation = () => value;
    return mockFn;
  };
  mockFn.mockResolvedValue = (value) => {
    implementation = () => Promise.resolve(value);
    return mockFn;
  };
  mockFn.mockRejectedValue = (value) => {
    implementation = () => Promise.reject(value);
    return mockFn;
  };
  mockFn.mockImplementation = (impl) => {
    implementation = impl;
    return mockFn;
  };
  return mockFn;
}

const unsupported = (name) => () => {
  throw new Error(`jest.${name} is not supported by the node test runner (see tests/helpers/jest-compat.mjs)`);
};

const jestGlobal = {
  fn,
  setTimeout: () => {},
  mock: unsupported('mock'),
  spyOn: unsupported('spyOn'),
  useFakeTimers: unsupported('useFakeTimers'),
  useRealTimers: () => {},
};

/** `it.each` / `describe.each`, including `%s` printf and `$key` object titles. */
function each(register) {
  return (table) => (title, fn) => {
    const rows = Array.isArray(table) ? table : Object.entries(table);
    for (const [index, rawRow] of rows.entries()) {
      const row = Array.isArray(rawRow) ? rawRow : [rawRow];
      let cursor = 0;
      const rendered = String(title)
        .replace(/%[sdifjoOp]/g, () => String(row[cursor++] ?? ''))
        .replace(/\$([A-Za-z0-9_]+)/g, (_match, key) => String(row[0]?.[key] ?? ''));
      register(`[case ${index}] ${rendered}`, () => (row.length === 1 && !Array.isArray(rawRow) ? fn(row[0]) : fn(...row)));
    }
  };
}

for (const register of [describe, it, test]) {
  register.each = each(register);
  register.skip = (name, fn) => register(name, { skip: true }, fn);
  register.todo = (name) => register(name, { todo: true }, () => {});
  register.only = register;
}

const helperRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(helperRoot);
const requireFromHere = createRequire(import.meta.url);

/** package name -> built entry point, used to replace jest.config's moduleNameMapper. */
const packageEntryPoints = new Map();
for (const entry of readdirSync(join(repoRoot, 'packages'), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const manifestPath = join(repoRoot, 'packages', entry.name, 'package.json');
  if (!existsSync(manifestPath)) continue;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const dist = join(repoRoot, 'packages', entry.name, 'dist', 'index.js');
  if (manifest.name && existsSync(dist)) packageEntryPoints.set(manifest.name, dist);
}

const CJS_FACADE = '?cjs-facade';

/** True when the package owning `file` is a CommonJS package. */
function isCommonJs(file) {
  let dir = dirname(file);
  while (dir !== repoRoot && dir.startsWith(repoRoot)) {
    const manifestPath = join(dir, 'package.json');
    if (existsSync(manifestPath)) {
      try {
        return JSON.parse(readFileSync(manifestPath, 'utf8')).type !== 'module';
      } catch {
        return true;
      }
    }
    dir = dirname(dir);
  }
  return true;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    // Jest mapped '@jest/globals' to the runner's own globals.
    if (specifier === '@jest/globals') {
      return { url: pathToFileURL(fileURLToPath(import.meta.url)).href, shortCircuit: true };
    }
    // The API suites import '../index' and expect the whole server module to
    // load. Under the node runner that pulls apps/api/src/index.ts through
    // transform-only TS, which cannot elide its type-only `fastify` imports, so
    // point them at the compiled server instead.
    if (/^(\.\/)?\.\.\/index(\.js)?$/.test(specifier) && context.parentURL?.includes('/apps/api/src/__tests__/')) {
      const built = join(repoRoot, 'apps/api/dist/index.js');
      if (existsSync(built)) return { url: pathToFileURL(built).href + CJS_FACADE, shortCircuit: true };
    }
    // Relative imports: the sources use TS's NodeNext convention
    // (`import { x } from './jobs.js'` for jobs.ts) and Jest stripped the
    // extension; Node's ESM resolver requires the real file.
    if (specifier.startsWith('.') && context.parentURL) {
      const base = fileURLToPath(new URL(specifier, context.parentURL));
      const unresolved = !/\.[cm]?[jt]sx?$/.test(specifier);
      const candidates = unresolved
        ? [`${base}.ts`, `${base}.tsx`, `${base}.js`, join(base, 'index.ts'), join(base, 'index.js')]
        : [base.replace(/\.js$/, '.ts'), base.replace(/\.js$/, '.tsx'), base];
      if (unresolved || !existsSync(base)) {
        for (const candidate of candidates) {
          if (existsSync(candidate)) return { url: pathToFileURL(candidate).href, shortCircuit: true };
        }
      }
      return nextResolve(specifier, context);
    }
    // `@omega-v/x` and `@oceanicos/x` both pointed at the same package in the
    // old jest.config moduleNameMapper; only one of the two names still exists.
    if (specifier.startsWith('@omega-v/') || specifier.startsWith('@oceanicos/')) {
      let resolved;
      try {
        resolved = nextResolve(specifier, context);
      } catch {
        const alias = packageEntryPoints.get(`@omega-v/${specifier.split('/')[1]}`) ?? packageEntryPoints.get(`@oceanicos/${specifier.split('/')[1]}`);
        if (!alias) throw new Error(`package ${specifier} no longer exists in this repository`);
        return { url: pathToFileURL(alias).href + CJS_FACADE, shortCircuit: true };
      }
      // A CommonJS dist cannot expose named exports to an ESM importer without
      // help; the load hook below re-exports it as an ESM facade.
      const file = fileURLToPath(resolved.url);
      const esmImporter = (context.conditions ?? []).includes('import');
      if (esmImporter && /\.js$/.test(file) && file.includes('/packages/') && file.includes('/dist/') && isCommonJs(file)) {
        return { url: resolved.url + CJS_FACADE, shortCircuit: true };
      }
      return resolved;
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    // The workspace packages are CommonJS builds; their named exports are not
    // statically analysable, so re-export them through a generated ESM facade.
    if (url.endsWith(CJS_FACADE)) {
      const file = fileURLToPath(url.slice(0, -CJS_FACADE.length));
      const exported = requireFromHere(file);
      const names = Object.keys(exported).filter(
        (key) => key !== 'default' && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
      );
      const source = [
        "import { createRequire } from 'node:module';",
        `const m = createRequire(import.meta.url)(${JSON.stringify(file)});`,
        'export default m;',
        ...names.map((name) => `export const ${name} = m[${JSON.stringify(name)}];`),
      ].join('\n');
      return { format: 'module', source, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

export { describe, it, test, before, after, beforeEach, afterEach, before as beforeAll, after as afterAll };

Object.assign(globalThis, {
  describe,
  it,
  test,
  before,
  after,
  beforeAll: before,
  afterAll: after,
  beforeEach,
  afterEach,
  expect,
  jest: jestGlobal,
});

export { jestGlobal as jest };
