import assert from 'node:assert/strict';
import { after as afterAll, afterEach, before as beforeAll, beforeEach, describe, it as nodeIt } from 'node:test';

/**
 * The subset of Jest's `expect`/`it.each` these repository guards use.
 *
 * The root Jest suite was never executable here: `jest.config.js` exists but
 * the root package has no Jest dependency or script, so these files sat
 * unrun. They are preserved in `tests/contracts/` under the node test
 * runner; only the assertion entry points change.
 *
 * This is deliberately small. It implements the matchers the migrated guards
 * need and no more. New tests should import `node:assert` directly, the way
 * `tests/integration/` does.
 */

const ARRAY_CONTAINING = Symbol('arrayContaining');
const ASYMMETRIC = Symbol('asymmetric');

type ArrayContaining = { [ARRAY_CONTAINING]: true; items: readonly unknown[] };

export const arrayContaining = (items: readonly unknown[]): ArrayContaining => ({
  [ARRAY_CONTAINING]: true,
  items,
});

const isArrayContaining = (value: unknown): value is ArrayContaining =>
  typeof value === 'object' && value !== null && ARRAY_CONTAINING in value;

type AsymmetricKind = 'any' | 'objectContaining' | 'stringContaining' | 'stringMatching';
type Asymmetric = { [ASYMMETRIC]: AsymmetricKind; value: unknown };

const asymmetric = (kind: AsymmetricKind, value: unknown): Asymmetric => ({
  [ASYMMETRIC]: kind,
  value,
});

const isAsymmetric = (value: unknown): value is Asymmetric =>
  typeof value === 'object' && value !== null && ASYMMETRIC in value;

const matchesAny = (actual: unknown, expected: unknown): boolean => {
  if (expected === Number) return typeof actual === 'number';
  if (expected === String) return typeof actual === 'string';
  if (expected === Boolean) return typeof actual === 'boolean';
  if (expected === Function) return typeof actual === 'function';
  if (expected === Object) return actual !== null && typeof actual === 'object';
  return typeof expected === 'function' && actual instanceof (expected as new () => unknown);
};

const show = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const deepEqual = (actual: unknown, expected: unknown): boolean => {
  try {
    assert.deepStrictEqual(actual, expected);
    return true;
  } catch {
    return false;
  }
};

/** Recursive subset comparison: every key in `expected` must be present and equal. */
const deepEqualSubset = (actual: unknown, expected: unknown): boolean => {
  if (isArrayContaining(expected)) {
    const candidates = Array.isArray(actual) ? actual : [];
    return expected.items.every((item) => candidates.some((candidate) => deepEqualSubset(candidate, item)));
  }
  if (isAsymmetric(expected)) {
    switch (expected[ASYMMETRIC]) {
      case 'any':
        return matchesAny(actual, expected.value);
      case 'stringContaining':
        return typeof actual === 'string' && actual.includes(String(expected.value));
      case 'stringMatching':
        return typeof actual === 'string' && (expected.value as RegExp).test(actual);
      case 'objectContaining':
        return deepEqualSubset(actual, expected.value);
    }
  }
  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((item, index) => deepEqualSubset(actual[index], item))
    );
  }
  if (expected !== null && typeof expected === 'object') {
    if (actual === null || typeof actual !== 'object') return false;
    return Object.entries(expected as Record<string, unknown>).every(([key, value]) =>
      deepEqualSubset((actual as Record<string, unknown>)[key], value)
    );
  }
  return deepEqual(actual, expected);
};

/** Recursive equality that honours `expect.any/objectContaining/...` inside fixtures. */
const matches = (actual: unknown, expected: unknown): boolean => {
  if (isArrayContaining(expected)) {
    const candidates = Array.isArray(actual) ? actual : [];
    return expected.items.every((item) => candidates.some((candidate) => matches(candidate, item)));
  }
  if (isAsymmetric(expected)) {
    switch (expected[ASYMMETRIC]) {
      case 'any':
        return matchesAny(actual, expected.value);
      case 'stringContaining':
        return typeof actual === 'string' && actual.includes(String(expected.value));
      case 'stringMatching':
        return typeof actual === 'string' && (expected.value as RegExp).test(actual);
      case 'objectContaining':
        return deepEqualSubset(actual, expected.value);
    }
  }
  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((item, index) => matches(actual[index], item))
    );
  }
  if (expected !== null && typeof expected === 'object') {
    if (actual === null || typeof actual !== 'object') return false;
    const actualKeys = Object.keys(actual);
    const expectedKeys = Object.keys(expected);
    return (
      actualKeys.length === expectedKeys.length &&
      expectedKeys.every((key) =>
        matches((actual as Record<string, unknown>)[key], (expected as Record<string, unknown>)[key])
      )
    );
  }
  return deepEqual(actual, expected);
};

/** Whether a fixture contains an asymmetric matcher anywhere inside it. */
const containsMatcher = (value: unknown): boolean => {
  if (isArrayContaining(value) || isAsymmetric(value)) return true;
  if (Array.isArray(value)) return value.some(containsMatcher);
  if (value !== null && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(containsMatcher);
  }
  return false;
};

const buildMatchers = (actual: unknown, negate: boolean) => {
  const check = (pass: boolean, message: string) => {
    if (negate ? pass : !pass) {
      throw new Error(`${negate ? 'not ' : ''}${message}`);
    }
  };

  return {
    toBe(expected: unknown) {
      check(Object.is(actual, expected), `expected ${show(actual)} to be ${show(expected)}`);
    },
    toEqual(expected: unknown) {
      const pass = containsMatcher(expected) ? matches(actual, expected) : deepEqual(actual, expected);
      check(pass, `expected ${show(actual)} to equal ${show(expected)}`);
    },
    toContain(expected: unknown) {
      const pass =
        typeof actual === 'string'
          ? actual.includes(String(expected))
          : Array.isArray(actual) && actual.some((item) => deepEqual(item, expected));
      check(pass, `expected ${show(actual)} to contain ${show(expected)}`);
    },
    toMatch(expected: RegExp | string) {
      const pattern = typeof expected === 'string' ? new RegExp(expected) : expected;
      check(
        typeof actual === 'string' && pattern.test(actual),
        `expected ${show(actual)} to match ${pattern}`
      );
    },
    toBeGreaterThan(expected: number) {
      check(typeof actual === 'number' && actual > expected, `expected ${actual} > ${expected}`);
    },
    toBeGreaterThanOrEqual(expected: number) {
      check(typeof actual === 'number' && actual >= expected, `expected ${actual} >= ${expected}`);
    },
    toBeLessThan(expected: number) {
      check(typeof actual === 'number' && actual < expected, `expected ${actual} < ${expected}`);
    },
    toBeLessThanOrEqual(expected: number) {
      check(typeof actual === 'number' && actual <= expected, `expected ${actual} <= ${expected}`);
    },
    toBeDefined() {
      check(actual !== undefined, 'expected value to be defined');
    },
    toBeTruthy() {
      check(Boolean(actual), `expected ${show(actual)} to be truthy`);
    },
    toBeFalsy() {
      check(!actual, `expected ${show(actual)} to be falsy`);
    },
    toHaveLength(expected: number) {
      const length = (actual as { length?: number } | null)?.length;
      check(length === expected, `expected length ${length} to be ${expected}`);
    },
    toBeNull() {
      check(actual === null, `expected ${show(actual)} to be null`);
    },
    toBeUndefined() {
      check(actual === undefined, `expected ${show(actual)} to be undefined`);
    },
    toBeNaN() {
      check(typeof actual === 'number' && Number.isNaN(actual), `expected ${show(actual)} to be NaN`);
    },
    toBeCloseTo(expected: number, precision = 2) {
      const tolerance = Math.pow(10, -precision) / 2;
      check(
        typeof actual === 'number' && Math.abs(actual - expected) < tolerance,
        `expected ${show(actual)} to be close to ${expected}`
      );
    },
    toMatchObject(expected: unknown) {
      check(deepEqualSubset(actual, expected), `expected ${show(actual)} to match ${show(expected)}`);
    },
    toThrow(expected?: unknown) {
      let thrown: unknown;
      let threw = false;
      try {
        (actual as () => unknown)();
      } catch (error) {
        threw = true;
        thrown = error;
      }
      if (!threw) {
        check(false, 'expected function to throw');
        return;
      }
      if (expected === undefined) return;
      const message = thrown instanceof Error ? thrown.message : String(thrown);
      let pass: boolean;
      if (isAsymmetric(expected) || isArrayContaining(expected)) {
        pass = deepEqualSubset(thrown, expected);
      } else if (expected instanceof RegExp) {
        pass = expected.test(message);
      } else if (typeof expected === 'function') {
        pass = thrown instanceof (expected as new () => unknown);
      } else {
        pass = message.includes(String(expected));
      }
      check(pass, `expected thrown message ${show(message)} to match ${show(expected)}`);
    },
  };
};

type Matchers = ReturnType<typeof buildMatchers>;

const expectFn = (actual: unknown): Matchers & { not: Matchers } => ({
  ...buildMatchers(actual, false),
  not: buildMatchers(actual, true),
});

type Each = (name: string, fn: (...args: never[]) => unknown) => void;

const each =
  (cases: readonly unknown[]): Each =>
  (name, fn) => {
    for (const entry of cases) {
      const args = Array.isArray(entry) ? entry : [entry];
      let index = 0;
      const title = name.replace(/%s/g, () => String(args[index++]));
      nodeIt(title, () => {
        (fn as (...values: unknown[]) => unknown)(...args);
      });
    }
  };

export const expect = Object.assign(expectFn, {
  arrayContaining,
  any: (constructor: unknown) => asymmetric('any', constructor),
  objectContaining: (value: Record<string, unknown>) => asymmetric('objectContaining', value),
  stringContaining: (value: string) => asymmetric('stringContaining', value),
  stringMatching: (value: RegExp) => asymmetric('stringMatching', value),
});

export const it = Object.assign(nodeIt, { each }) as typeof nodeIt & { each: typeof each };

export { describe, beforeAll, afterAll, beforeEach, afterEach };
