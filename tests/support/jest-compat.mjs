/*
 * jest-compat — run the repository's pre-existing suites on `node:test`.
 *
 * The root Jest runner was never installed (`node_modules/.bin/jest` does not
 * exist), so every suite importing `@jest/globals` or `vitest` was stale: it
 * compiled nowhere and ran never. This module keeps those assertions exactly
 * as written — `describe`/`it` come from `node:test`, `expect` is a thin,
 * explicit matcher layer over `node:assert` — so they join the node suite
 * instead of needing a rewrite.
 *
 * What is deliberately NOT here: `jest.mock`, `jest.requireActual` and
 * `jest.resetModules`. Module-registry swapping has no honest node:test
 * equivalent, so the suites that need it are converted by hand.
 */
import assert from 'node:assert/strict';
import {
  after,
  afterEach,
  before,
  beforeEach,
  describe,
  it,
  test,
} from 'node:test';

export { after, afterEach, before, beforeEach, describe, it, test };
export const beforeAll = before;
export const afterAll = after;

// Tests must never rely on a committed default signing key (see jest.setup.ts).
process.env.OMEGA_SIGNING_KEY = process.env.OMEGA_SIGNING_KEY ?? 'test-only-signing-key';

/* ------------------------------------------------------------------ *
 * asymmetric matchers
 * ------------------------------------------------------------------ */

class AsymmetricMatcher {
  constructor(kind, sample) {
    this.kind = kind;
    this.sample = sample;
  }

  matches(value) {
    switch (this.kind) {
      case 'any':
        if (this.sample === String) return typeof value === 'string' || value instanceof String;
        if (this.sample === Number) return typeof value === 'number' || value instanceof Number;
        if (this.sample === Boolean) return typeof value === 'boolean';
        if (this.sample === Function) return typeof value === 'function';
        if (this.sample === Object) return value !== null && typeof value === 'object';
        if (this.sample === Array) return Array.isArray(value);
        return value instanceof this.sample;
      case 'objectContaining':
        return subsetMatches(value, this.sample);
      case 'arrayContaining':
        return (
          Array.isArray(value) &&
          this.sample.every((item) => value.some((candidate) => equals(candidate, item)))
        );
      case 'stringContaining':
        return typeof value === 'string' && value.includes(String(this.sample));
      case 'stringMatching':
        if (value === null || value === undefined) return false;
        return this.sample instanceof RegExp
          ? this.sample.test(String(value))
          : String(value).includes(String(this.sample));
      default:
        return false;
    }
  }
}

/* ------------------------------------------------------------------ *
 * equality (Jest's toEqual is loose; undefined-valued keys are ignored)
 * ------------------------------------------------------------------ */

function equals(actual, expected) {
  if (expected instanceof AsymmetricMatcher) return expected.matches(actual);
  if (actual === expected) return true;
  if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();
  }
  if (actual instanceof RegExp && expected instanceof RegExp) {
    return actual.source === expected.source && actual.flags === expected.flags;
  }
  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((item, index) => equals(actual[index], item))
    );
  }
  if (expected && typeof expected === 'object') {
    if (!actual || typeof actual !== 'object') return false;
    const expectedKeys = Object.keys(expected).filter((key) => expected[key] !== undefined);
    const actualKeys = Object.keys(actual).filter((key) => actual[key] !== undefined);
    if (expectedKeys.length !== actualKeys.length) return false;
    return expectedKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(actual, key) && equals(actual[key], expected[key])
    );
  }
  return false;
}

function subsetMatches(actual, expected) {
  if (expected instanceof AsymmetricMatcher) return expected.matches(actual);
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    if (!actual || typeof actual !== 'object') return false;
    return Object.keys(expected).every(
      (key) =>
        expected[key] === undefined ||
        (Object.prototype.hasOwnProperty.call(actual, key) &&
          subsetMatches(actual[key], expected[key]))
    );
  }
  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((item, index) => subsetMatches(actual[index], item))
    );
  }
  return equals(actual, expected);
}

function show(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/* ------------------------------------------------------------------ *
 * expect
 * ------------------------------------------------------------------ */

function toThrowMessage(actual, expected) {
  assert.equal(typeof actual, 'function', `expected a function, received ${show(actual)}`);
  let thrown = null;
  try {
    actual();
  } catch (error) {
    thrown = error;
  }
  if (thrown === null) throw new assert.AssertionError({ message: 'expected the call to throw' });
  if (expected === undefined) return;
  if (expected instanceof RegExp) {
    assert.match(String(thrown?.message ?? thrown), expected);
    return;
  }
  if (typeof expected === 'string') {
    assert.ok(
      String(thrown?.message ?? thrown).includes(expected),
      `expected thrown message ${show(String(thrown?.message ?? thrown))} to include ${show(expected)}`
    );
    return;
  }
  if (typeof expected === 'function') {
    assert.ok(thrown instanceof expected, 'thrown error was not an instance of the expected class');
    return;
  }
  equals(thrown, expected);
}

function makeMatchers(actual, negate) {
  const check = (pass, message) => {
    const outcome = negate ? !pass : pass;
    assert.ok(outcome, `${negate ? 'not: ' : ''}${message}`);
  };

  return {
    toBe: (expected) => check(Object.is(actual, expected), `expected ${show(actual)} to be ${show(expected)}`),
    toEqual: (expected) => check(equals(actual, expected), `expected ${show(actual)} to equal ${show(expected)}`),
    toStrictEqual: (expected) => {
      if (negate) {
        assert.throws(() => assert.deepStrictEqual(actual, expected));
        return;
      }
      assert.deepStrictEqual(actual, expected);
    },
    toMatchObject: (expected) => check(subsetMatches(actual, expected), `expected ${show(actual)} to match ${show(expected)}`),
    toContain: (expected) => {
      const pass =
        typeof actual === 'string'
          ? actual.includes(String(expected))
          : Array.isArray(actual) && actual.some((item) => equals(item, expected));
      check(pass, `expected ${show(actual)} to contain ${show(expected)}`);
    },
    toMatch: (expected) => {
      const pattern = expected instanceof RegExp ? expected : new RegExp(String(expected));
      check(pattern.test(String(actual)), `expected ${show(actual)} to match ${String(expected)}`);
    },
    toThrow: (expected) => {
      if (negate) {
        assert.throws(() => toThrowMessage(actual, expected));
        return;
      }
      toThrowMessage(actual, expected);
    },
    toHaveLength: (length) => check(actual != null && actual.length === length, `expected length ${length}, received ${actual?.length}`),
    toBeDefined: () => check(actual !== undefined, `expected ${show(actual)} to be defined`),
    toBeUndefined: () => check(actual === undefined, `expected ${show(actual)} to be undefined`),
    toBeNull: () => check(actual === null, `expected ${show(actual)} to be null`),
    toBeTruthy: () => check(Boolean(actual), `expected ${show(actual)} to be truthy`),
    toBeFalsy: () => check(!actual, `expected ${show(actual)} to be falsy`),
    toBeNaN: () => check(Number.isNaN(actual), `expected ${show(actual)} to be NaN`),
    toBeInstanceOf: (ctor) => check(actual instanceof ctor, `expected instance of ${ctor?.name}`),
    toBeGreaterThan: (n) => check(actual > n, `expected ${show(actual)} > ${show(n)}`),
    toBeGreaterThanOrEqual: (n) => check(actual >= n, `expected ${show(actual)} >= ${show(n)}`),
    toBeLessThan: (n) => check(actual < n, `expected ${show(actual)} < ${show(n)}`),
    toBeLessThanOrEqual: (n) => check(actual <= n, `expected ${show(actual)} <= ${show(n)}`),
    toBeCloseTo: (expected, digits = 2) => {
      const pass = Math.abs(Number(actual) - Number(expected)) < Math.pow(10, -digits) / 2;
      check(pass, `expected ${show(actual)} to be close to ${show(expected)}`);
    },
    toHaveProperty: (path, value) => {
      const segments = Array.isArray(path) ? path : String(path).split('.');
      let cursor = actual;
      let present = actual != null;
      for (const segment of segments) {
        if (cursor == null || !Object.prototype.hasOwnProperty.call(cursor, segment)) {
          present = false;
          break;
        }
        cursor = cursor[segment];
      }
      check(present, `expected property ${String(path)} to exist`);
      if (value !== undefined) equals(cursor, value);
    },
  };
}

export function expect(actual) {
  const matchers = makeMatchers(actual, false);
  return {
    ...matchers,
    not: makeMatchers(actual, true),
    resolves: { ...makeMatchers(actual, false) },
    rejects: makeMatchers(actual, false),
  };
}

expect.any = (ctor) => new AsymmetricMatcher('any', ctor);
expect.objectContaining = (sample) => new AsymmetricMatcher('objectContaining', sample);
expect.arrayContaining = (sample) => new AsymmetricMatcher('arrayContaining', sample);
expect.stringContaining = (sample) => new AsymmetricMatcher('stringContaining', sample);
expect.stringMatching = (sample) => new AsymmetricMatcher('stringMatching', sample);

/* ------------------------------------------------------------------ *
 * it.each / describe.each
 * ------------------------------------------------------------------ */

function interpolate(name, args) {
  let index = 0;
  const withPositional = String(name).replace(/%[sdjpi%]/g, (token) => {
    if (token === '%%') return '%';
    const value = args[index++];
    if (token === '%s') return String(value);
    if (token === '%d' || token === '%i') return String(Number(value));
    if (token === '%j') return show(value);
    return show(value);
  });
  return withPositional.replace(/\$([A-Za-z0-9_.]+)/g, (_token, path) => {
    let cursor = args[0];
    for (const segment of String(path).split('.')) cursor = cursor?.[segment];
    return String(cursor ?? '');
  });
}

function eachRows(cases) {
  if (Array.isArray(cases)) return cases;
  const table = [];
  for (const [key, value] of Object.entries(cases ?? {})) table.push([key, value]);
  return table;
}

function eachRunner(register) {
  return (cases) => (name, handler) => {
    for (const row of eachRows(cases)) {
      const args = Array.isArray(row) ? row : [row];
      const title = typeof name === 'function' ? name(...args) : interpolate(name, args);
      register(title, () => (typeof handler === 'function' ? handler(...args) : undefined));
    }
  };
}

describe.each = eachRunner(describe);
it.each = eachRunner(it);
test.each = eachRunner(test);

/* ------------------------------------------------------------------ *
 * jest.fn
 * ------------------------------------------------------------------ */

export function fn(implementation = () => undefined) {
  const mock = { calls: [], results: [], instances: [] };
  let impl = implementation;
  let once = [];

  const mockFn = (...args) => {
    mock.calls.push(args);
    const active = once.length > 0 ? once.shift() : impl;
    const result = active.apply(mockFn, args);
    mock.results.push(result);
    return result;
  };

  mockFn.mock = mock;
  mockFn.mockImplementation = (next) => {
    impl = next;
    return mockFn;
  };
  mockFn.mockImplementationOnce = (next) => {
    once.push(next);
    return mockFn;
  };
  mockFn.mockReturnValue = (value) => mockFn.mockImplementation(() => value);
  mockFn.mockResolvedValue = (value) => mockFn.mockImplementation(() => Promise.resolve(value));
  mockFn.mockClear = () => {
    mock.calls.length = 0;
    mock.results.length = 0;
    mock.instances.length = 0;
    return mockFn;
  };
  mockFn.mockReset = () => {
    mockFn.mockClear();
    impl = () => undefined;
    once = [];
    return mockFn;
  };
  return mockFn;
}

export const jest = {
  fn,
  setTimeout: () => undefined,
  clearAllMocks: () => undefined,
  resetAllMocks: () => undefined,
  restoreAllMocks: () => undefined,
};
