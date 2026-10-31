/**
 * Jest-compatible globals for the native `node:test` suite.
 *
 * The repository's tests were written for Jest. Instead of keeping a second
 * test runner alive, this module maps the Jest surface they use onto
 * `node:test` + `node:assert` primitives and installs it as globals so the
 * unmodified test files run under `node --test`.
 *
 * Supported: describe/it/test (+ .skip/.only/.each), the common `expect`
 * matchers, asymmetric matchers, `resolves`/`rejects`, mock functions and
 * spies, and fake timers. Jest's module-registry interception (`jest.mock`)
 * has no equivalent for statically imported ES modules; it is recorded as a
 * no-op so the suites that need it fail loudly instead of silently passing.
 */
import { createRequire } from 'node:module';
import { inspect, isDeepStrictEqual } from 'node:util';
import {
  after as nodeAfter,
  afterEach as nodeAfterEach,
  before as nodeBefore,
  beforeEach as nodeBeforeEach,
  describe as nodeDescribe,
  it as nodeIt,
  mock as nodeMock,
  test as nodeTest,
} from 'node:test';

const nodeRequire = createRequire(import.meta.url);

const format = (value) => {
  if (typeof value === 'string') return JSON.stringify(value);
  return inspect(value, { depth: 4, breakLength: 100, compact: 3 });
};

const isPlainObject = (value) => {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const isAsymmetric = (value) =>
  value !== null && typeof value === 'object' && typeof value.asymmetricMatch === 'function';

/** Structural equality with Jest's `toEqual` semantics for plain data. */
export function equals(actual, expected) {
  if (isAsymmetric(expected)) return expected.asymmetricMatch(actual);
  if (Object.is(actual, expected)) return true;
  if (expected instanceof Date || actual instanceof Date) {
    return expected instanceof Date && actual instanceof Date && actual.getTime() === expected.getTime();
  }
  if (expected instanceof RegExp) {
    return typeof actual === 'string' && expected.test(actual);
  }
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual) || expected.length !== actual.length) return false;
    return expected.every((value, index) => equals(actual[index], value));
  }
  if (isPlainObject(expected) && isPlainObject(actual)) {
    const expectedKeys = Object.keys(expected).filter((key) => expected[key] !== undefined);
    const actualKeys = Object.keys(actual).filter((key) => actual[key] !== undefined);
    if (expectedKeys.length !== actualKeys.length) return false;
    return expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(actual, key) && equals(actual[key], expected[key]));
  }
  if (expected instanceof Map && actual instanceof Map) {
    return isDeepStrictEqual(actual, expected);
  }
  if (expected instanceof Set && actual instanceof Set) {
    return isDeepStrictEqual(actual, expected);
  }
  if (expected !== null && actual !== null && typeof expected === 'object' && typeof actual === 'object') {
    if (isPlainObject(expected) || isPlainObject(actual)) return false;
    return isDeepStrictEqual(actual, expected);
  }
  return false;
}

/** Partial structural match used by `toMatchObject` and `expect.objectContaining`. */
export function partialMatch(actual, expected) {
  if (isAsymmetric(expected)) return expected.asymmetricMatch(actual);
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) return false;
    return expected.every((value, index) => partialMatch(actual[index], value));
  }
  if (isPlainObject(expected)) {
    if (actual === null || typeof actual !== 'object') return false;
    return Object.keys(expected).every(
      (key) => Object.prototype.hasOwnProperty.call(actual, key) && partialMatch(actual[key], expected[key])
    );
  }
  return equals(actual, expected);
}

const readPath = (value, keyPath) => {
  const parts = Array.isArray(keyPath) ? keyPath : String(keyPath).split('.');
  let current = value;
  for (const part of parts) {
    if (current === null || current === undefined) return { found: false, value: undefined };
    current = current[part];
  }
  return { found: true, value: current };
};

const isMock = (value) => Boolean(value) && typeof value === 'function' && value._isMockFunction === true;

const calledWith = (mock, args) =>
  mock.mock.calls.some((call) => call.length === args.length && args.every((arg, index) => equals(call[index], arg)));

const matchers = {
  toBe(actual, expected) {
    return { pass: Object.is(actual, expected) || actual === expected };
  },
  toEqual(actual, expected) {
    return { pass: equals(actual, expected) };
  },
  toStrictEqual(actual, expected) {
    return { pass: isDeepStrictEqual(actual, expected) };
  },
  toMatchObject(actual, expected) {
    return { pass: partialMatch(actual, expected) };
  },
  toMatch(actual, expected) {
    if (typeof actual !== 'string') return { pass: false };
    return { pass: expected instanceof RegExp ? expected.test(actual) : actual.includes(String(expected)) };
  },
  toContain(actual, expected) {
    if (typeof actual === 'string') return { pass: actual.includes(String(expected)) };
    if (Array.isArray(actual)) return { pass: actual.some((value) => equals(value, expected)) };
    if (actual instanceof Set) return { pass: [...actual].some((value) => equals(value, expected)) };
    if (actual instanceof Map) return { pass: [...actual.values()].some((value) => equals(value, expected)) };
    return { pass: false };
  },
  toContainEqual(actual, expected) {
    return { pass: Array.isArray(actual) && actual.some((value) => equals(value, expected)) };
  },
  toHaveLength(actual, expected) {
    return { pass: actual !== null && actual !== undefined && actual.length === expected };
  },
  toBeDefined(actual) {
    return { pass: actual !== undefined };
  },
  toBeUndefined(actual) {
    return { pass: actual === undefined };
  },
  toBeNull(actual) {
    return { pass: actual === null };
  },
  toBeTruthy(actual) {
    return { pass: Boolean(actual) };
  },
  toBeFalsy(actual) {
    return { pass: !actual };
  },
  toBeNaN(actual) {
    return { pass: Number.isNaN(actual) };
  },
  toBeGreaterThan(actual, expected) {
    return { pass: actual > expected };
  },
  toBeGreaterThanOrEqual(actual, expected) {
    return { pass: actual >= expected };
  },
  toBeLessThan(actual, expected) {
    return { pass: actual < expected };
  },
  toBeLessThanOrEqual(actual, expected) {
    return { pass: actual <= expected };
  },
  toBeCloseTo(actual, expected, precision = 2) {
    return { pass: Math.abs(actual - expected) < Math.pow(10, -precision) / 2 };
  },
  toBeInstanceOf(actual, expected) {
    return { pass: actual instanceof expected };
  },
  toHaveProperty(actual, keyPath, ...expected) {
    const { found, value } = readPath(actual, keyPath);
    return { pass: found && (expected.length === 0 || equals(value, expected[0])) };
  },
  toHaveBeenCalled(actual) {
    return { pass: isMock(actual) && actual.mock.calls.length > 0 };
  },
  toHaveBeenCalledTimes(actual, expected) {
    return { pass: isMock(actual) && actual.mock.calls.length === expected };
  },
  toHaveBeenCalledWith(actual, ...expected) {
    return { pass: isMock(actual) && calledWith(actual, expected) };
  },
  toHaveBeenLastCalledWith(actual, ...expected) {
    if (!isMock(actual) || actual.mock.calls.length === 0) return { pass: false };
    return { pass: calledWith({ mock: { calls: [actual.mock.calls[actual.mock.calls.length - 1]] } }, expected) };
  },
  toHaveReturned(actual) {
    return { pass: isMock(actual) && actual.mock.results.some((result) => result.type === 'return') };
  },
  toThrow(actual, expected) {
    if (typeof actual !== 'function') {
      return { pass: false, message: `toThrow expects a function, received ${format(actual)}` };
    }
    let thrown;
    let didThrow = false;
    try {
      actual();
    } catch (error) {
      didThrow = true;
      thrown = error;
    }
    if (!didThrow) return { pass: false, message: 'Expected the function to throw, but it returned normally' };
    if (expected === undefined) return { pass: true };
    const message = thrown && thrown.message !== undefined ? String(thrown.message) : String(thrown);
    if (typeof expected === 'string') return { pass: message.includes(expected), message: `Received error message ${format(message)}` };
    if (expected instanceof RegExp) return { pass: expected.test(message), message: `Received error message ${format(message)}` };
    if (typeof expected === 'function') return { pass: thrown instanceof expected, message: `Received ${format(thrown)}` };
    if (expected && typeof expected === 'object') return { pass: partialMatch(thrown, expected), message: `Received ${format(thrown)}` };
    return { pass: false };
  },
  toThrowError(actual, expected) {
    return matchers.toThrow(actual, expected);
  },
  toExist(actual) {
    return { pass: actual !== null && actual !== undefined };
  },
};

const matcherNames = Object.keys(matchers);

const fail = (message) => {
  const error = new Error(message);
  error.name = 'AssertionError';
  throw error;
};

const MOCK_NAMES = new Set([
  'toHaveBeenCalled',
  'toHaveBeenCalledTimes',
  'toHaveBeenCalledWith',
  'toHaveBeenLastCalledWith',
  'toHaveReturned',
]);

function applyMatcher(name, actual, args, negate) {
  const matcher = matchers[name];
  const result = matcher(actual, ...args);
  const passed = negate ? !result.pass : result.pass;
  if (passed) return;
  const received = MOCK_NAMES.has(name) ? `mock with ${isMock(actual) ? actual.mock.calls.length : 0} call(s)` : format(actual);
  const expected = args.length > 0 ? ` ${format(args[0])}` : '';
  fail(
    result.message
      ? result.message
      : `Expected ${received} ${negate ? 'not ' : ''}${name.replace(/^to/, 'to ').toLowerCase()}${expected}`
  );
}

const lazy = (target, name, factory) => {
  Object.defineProperty(target, name, { get: factory, enumerable: false, configurable: true });
};

const THROW_MATCHERS = new Set(['toThrow', 'toThrowError']);

function createAsyncAssertions(mode, negate) {
  return (promise, asyncNegate = negate) => {
    const assertions = {};
    for (const name of matcherNames) {
      assertions[name] = async (...args) => {
        let settled;
        try {
          settled = await promise;
        } catch (error) {
          if (mode === 'resolves') {
            fail(`Expected the promise to resolve, but it rejected with ${format(error)}`);
          }
          // `rejects.toThrow(...)` matches the rejection reason, not a thunk,
          // so hand the matcher a function that rethrows it.
          if (THROW_MATCHERS.has(name)) {
            applyMatcher(
              name,
              () => {
                throw error;
              },
              args,
              asyncNegate
            );
            return;
          }
          applyMatcher(name, error, args, asyncNegate);
          return;
        }
        if (mode === 'rejects') {
          fail(`Expected the promise to reject, but it resolved with ${format(settled)}`);
        }
        applyMatcher(name, settled, args, asyncNegate);
      };
    }
    lazy(assertions, 'not', () => createAsyncAssertions(mode, !asyncNegate)(promise, !asyncNegate));
    return assertions;
  };
}

const resolvesFactory = createAsyncAssertions('resolves', false);
const rejectsFactory = createAsyncAssertions('rejects', false);

function createAssertions(actual, negate) {
  const assertions = {};
  for (const name of matcherNames) {
    assertions[name] = (...args) => applyMatcher(name, actual, args, negate);
  }
  lazy(assertions, 'not', () => createAssertions(actual, !negate));
  lazy(assertions, 'resolves', () => resolvesFactory(actual, negate));
  lazy(assertions, 'rejects', () => rejectsFactory(actual, negate));
  return assertions;
}

const objectContaining = (expected) => ({ asymmetricMatch: (actual) => partialMatch(actual, expected) });
const arrayContaining = (expected) => ({
  asymmetricMatch: (actual) =>
    Array.isArray(actual) && expected.every((item) => actual.some((value) => equals(value, item))),
});
const any = (Constructor) => ({
  asymmetricMatch: (actual) => {
    if (Constructor === String) return typeof actual === 'string' || actual instanceof String;
    if (Constructor === Number) return typeof actual === 'number' || actual instanceof Number;
    if (Constructor === Boolean) return typeof actual === 'boolean' || actual instanceof Boolean;
    if (Constructor === Function) return typeof actual === 'function';
    if (Constructor === Object) return actual !== null && typeof actual === 'object';
    if (Constructor === BigInt) return typeof actual === 'bigint';
    return actual instanceof Constructor;
  },
});
const anything = () => ({ asymmetricMatch: (actual) => actual !== null && actual !== undefined });
const stringContaining = (expected) => ({
  asymmetricMatch: (actual) => typeof actual === 'string' && actual.includes(expected),
});
const stringMatching = (expected) => ({
  asymmetricMatch: (actual) =>
    typeof actual === 'string' && (expected instanceof RegExp ? expected.test(actual) : actual.includes(expected)),
});
const closeTo = (expected, precision = 2) => ({
  asymmetricMatch: (actual) =>
    typeof actual === 'number' && Math.abs(actual - expected) < Math.pow(10, -precision) / 2,
});

export function expect(actual) {
  return createAssertions(actual, false);
}
expect.objectContaining = objectContaining;
expect.arrayContaining = arrayContaining;
expect.any = any;
expect.anything = anything;
expect.stringContaining = stringContaining;
expect.stringMatching = stringMatching;
expect.closeTo = closeTo;
expect.extend = () => undefined;

function createMockFunction(implementation) {
  const calls = [];
  const results = [];
  const instances = [];
  let impl = implementation;
  const once = [];

  const fn = function mockFunction(...args) {
    calls.push(args);
    instances.push(this);
    const next = once.length > 0 ? once.shift() : impl;
    try {
      const value = next ? next.apply(this, args) : undefined;
      results.push({ type: 'return', value });
      return value;
    } catch (error) {
      results.push({ type: 'throw', value: error });
      throw error;
    }
  };

  fn._isMockFunction = true;
  fn.mock = { calls, results, instances };
  fn.getMockName = () => 'jest.fn()';
  fn.mockImplementation = (next) => {
    impl = next;
    return fn;
  };
  fn.mockImplementationOnce = (next) => {
    once.push(next);
    return fn;
  };
  fn.mockReturnValue = (value) => fn.mockImplementation(() => value);
  fn.mockReturnValueOnce = (value) => fn.mockImplementationOnce(() => value);
  fn.mockResolvedValue = (value) => fn.mockImplementation(() => Promise.resolve(value));
  fn.mockResolvedValueOnce = (value) => fn.mockImplementationOnce(() => Promise.resolve(value));
  fn.mockRejectedValue = (value) => fn.mockImplementation(() => Promise.reject(value));
  fn.mockRejectedValueOnce = (value) => fn.mockImplementationOnce(() => Promise.reject(value));
  fn.mockClear = () => {
    calls.length = 0;
    results.length = 0;
    instances.length = 0;
    return fn;
  };
  fn.mockReset = () => {
    fn.mockClear();
    impl = undefined;
    once.length = 0;
    return fn;
  };
  fn.mockRestore = () => fn.mockReset();
  return fn;
}

const moduleMockRegistry = () => globalThis.__jestModuleMocks;

const requireCacheReset = () => {
  for (const key of Object.keys(nodeRequire.cache)) {
    delete nodeRequire.cache[key];
  }
  // Factories run again after a registry reset, like Jest's module registry.
  const registry = moduleMockRegistry();
  if (registry) for (const mock of registry.values()) mock.loaded = false;
};

export const jest = {
  fn: (implementation) => createMockFunction(implementation),
  spyOn(target, method) {
    const original = target[method];
    const spy = createMockFunction(function (...args) {
      return original.apply(this, args);
    });
    spy.mockRestore = () => {
      target[method] = original;
    };
    target[method] = spy;
    return spy;
  },
  /**
   * Module interception goes through the require registry in
   * `jest-register.cjs`. It only affects modules required *after* the call,
   * which matches suites that combine it with `jest.resetModules()`.
   */
  mock(moduleName, factory) {
    const registry = moduleMockRegistry();
    if (!registry) return;
    registry.set(moduleName, { factory: factory ?? (() => ({})), loaded: false, exports: undefined });
  },
  unmock(moduleName) {
    moduleMockRegistry()?.delete(moduleName);
  },
  doMock(moduleName, factory) {
    jest.mock(moduleName, factory);
  },
  dontMock(moduleName) {
    jest.unmock(moduleName);
  },
  requireActual: (id) => {
    // Bypass this registry so a factory calling `requireActual` on the module
    // it is mocking loads the real module instead of recursing into itself.
    globalThis.__jestRequireActualDepth = (globalThis.__jestRequireActualDepth ?? 0) + 1;
    try {
      return nodeRequire(id);
    } finally {
      globalThis.__jestRequireActualDepth -= 1;
    }
  },
  requireMock: (id) => nodeRequire(id),
  resetModules: requireCacheReset,
  isolateModules: (fn) => fn(),
  setTimeout() {},
  useFakeTimers() {
    nodeMock.timers.enable({ apis: ['setTimeout', 'setInterval', 'setImmediate', 'Date'] });
  },
  useRealTimers() {
    nodeMock.timers.reset();
  },
  advanceTimersByTime(milliseconds) {
    nodeMock.timers.tick(milliseconds);
  },
  runAllTimers() {
    nodeMock.timers.runAll();
  },
  runOnlyPendingTimers() {
    nodeMock.timers.runAll();
  },
  clearAllTimers() {
    nodeMock.timers.reset();
  },
  clearAllMocks() {},
  resetAllMocks() {},
  restoreAllMocks() {},
  Mock: class Mock {},
};

const formatEachTitle = (template, args) => {
  let index = 0;
  return String(template).replace(/%[sdifjpoO%]/g, (token) => {
    if (token === '%%') return '%';
    const value = args[index];
    index += 1;
    switch (token) {
      case '%d':
      case '%i':
        return String(Number(value));
      case '%f':
        return String(Number(value));
      case '%j':
        return JSON.stringify(value);
      case '%p':
        return format(value);
      case '%o':
      case '%O':
        return inspect(value, { depth: 2 });
      default:
        return String(value);
    }
  });
};

const rowsOf = (table) => {
  if (!Array.isArray(table)) return [];
  return table.map((row) => (Array.isArray(row) ? row : [row]));
};

const eachRunner = (runner) => (table) => (title, fn, timeout) => {
  rowsOf(table).forEach((args, index) => {
    runner(formatEachTitle(title, args), () => fn(...args, {}), timeout);
  });
};

const withEach = (runner) => {
  runner.each = eachRunner(runner);
  return runner;
};

export const describe = withEach(nodeDescribe);
export const it = withEach(nodeIt);
export const test = withEach(nodeTest);
export const beforeAll = nodeBefore;
export const afterAll = nodeAfter;
export const beforeEach = nodeBeforeEach;
export const afterEach = nodeAfterEach;

/** Installs the Jest surface as globals for test files that do not import it. */
export function installJestGlobals() {
  Object.assign(globalThis, {
    describe,
    it,
    test,
    expect,
    beforeAll,
    afterAll,
    beforeEach,
    afterEach,
    jest,
  });
}

// `@jest/globals` is imported as a module by some suites; importing this file
// must make the globals available either way.
installJestGlobals();

export default { describe, it, test, expect, beforeAll, afterAll, beforeEach, afterEach, jest };
