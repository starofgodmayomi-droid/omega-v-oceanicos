import assert from 'node:assert/strict';
import { describe, it as nodeIt } from 'node:test';

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

type ArrayContaining = { [ARRAY_CONTAINING]: true; items: readonly unknown[] };

export const arrayContaining = (items: readonly unknown[]): ArrayContaining => ({
  [ARRAY_CONTAINING]: true,
  items,
});

const isArrayContaining = (value: unknown): value is ArrayContaining =>
  typeof value === 'object' && value !== null && ARRAY_CONTAINING in value;

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
      if (isArrayContaining(expected)) {
        const candidates = Array.isArray(actual) ? actual : [];
        const pass = expected.items.every((item) =>
          candidates.some((candidate) => deepEqual(candidate, item))
        );
        check(pass, `expected ${show(actual)} to contain ${show(expected.items)}`);
        return;
      }
      check(deepEqual(actual, expected), `expected ${show(actual)} to equal ${show(expected)}`);
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

export const expect = Object.assign(expectFn, { arrayContaining });

export const it = Object.assign(nodeIt, { each }) as typeof nodeIt & { each: typeof each };

export { describe };
