/**
 * A strict Jest-compatible facade over `node:test`.
 *
 * The repository carried a root `jest.config.js` and a large set of suites
 * written against Jest's globals (`describe`/`it`/`expect`), but no command
 * ever ran them: `jest` was not a root dependency, `pnpm test` invoked only
 * `node --test` over an explicit list, and the root config could not even
 * start (`ts-jest` is not installed at the root, and `jest.setup.ts` fails to
 * typecheck). Those suites read like coverage while running nowhere.
 *
 * Rather than rewrite every assertion — a mechanical edit that risks changing
 * what is asserted — the suites import this facade and run under
 * `node --experimental-strip-types --test`, the same runner as the rest of the
 * gate. Only the matchers these suites use are implemented, and each one is
 * built on `node:assert/strict`, so a passing assertion means exactly what the
 * strict assert means. Anything unimplemented throws rather than passing
 * quietly.
 *
 * This is not a general Jest reimplementation: it exists to keep existing
 * assertions honest under the repository's one runner.
 */
import assert from 'node:assert/strict';
import { describe, it, test } from 'node:test';

export type Expectation = {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toStrictEqual(expected: unknown): void;
  toContain(expected: unknown): void;
  toMatch(expected: string | RegExp): void;
  toHaveLength(expected: number): void;
  toBeNull(): void;
  toBeDefined(): void;
  toBeUndefined(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
  not: Omit<Expectation, 'not'>;
};

const render = (value: unknown): string => {
  try {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return text === undefined ? String(value) : text.length > 200 ? `${text.slice(0, 200)}…` : text;
  } catch {
    return String(value);
  }
};

const contains = (actual: unknown, expected: unknown): boolean => {
  if (typeof actual === 'string') return actual.includes(String(expected));
  if (Array.isArray(actual)) {
    if (typeof expected === 'object') {
      return actual.some((entry) => {
        try {
          assert.deepStrictEqual(entry, expected);
          return true;
        } catch {
          return false;
        }
      });
    }
    return actual.includes(expected);
  }
  return false;
};

function build(actual: unknown, negate: boolean): Omit<Expectation, 'not'> {
  const check = (passes: boolean, claim: string, detail?: string) => {
    if (negate ? !passes : passes) return;
    assert.fail(
      `${negate ? 'expected not to ' : 'expected to '}${claim}` +
        (detail ? ` (${detail})` : '') +
        ` · received ${render(actual)}`
    );
  };

  return {
    toBe(expected) {
      check(Object.is(actual, expected), `be ${render(expected)}`);
    },
    toEqual(expected) {
      let passes = true;
      try {
        assert.deepStrictEqual(actual, expected);
      } catch {
        passes = false;
      }
      check(passes, `equal ${render(expected)}`);
    },
    toStrictEqual(expected) {
      let passes = true;
      try {
        assert.deepStrictEqual(actual, expected);
      } catch {
        passes = false;
      }
      check(passes, `strictly equal ${render(expected)}`);
    },
    toContain(expected) {
      check(contains(actual, expected), `contain ${render(expected)}`);
    },
    toMatch(expected) {
      const pattern = typeof expected === 'string' ? new RegExp(expected) : expected;
      check(pattern.test(String(actual)), `match ${pattern}`);
    },
    toHaveLength(expected) {
      const length = (actual as { length?: number } | null)?.length;
      check(length === expected, `have length ${expected}`, `length ${String(length)}`);
    },
    toBeNull() {
      check(actual === null, 'be null');
    },
    toBeDefined() {
      check(actual !== undefined, 'be defined');
    },
    toBeUndefined() {
      check(actual === undefined, 'be undefined');
    },
    toBeTruthy() {
      check(Boolean(actual), 'be truthy');
    },
    toBeFalsy() {
      check(!actual, 'be falsy');
    },
    toBeGreaterThan(expected) {
      check(Number(actual) > expected, `be greater than ${expected}`);
    },
    toBeGreaterThanOrEqual(expected) {
      check(Number(actual) >= expected, `be at least ${expected}`);
    },
    toBeLessThan(expected) {
      check(Number(actual) < expected, `be less than ${expected}`);
    },
    toBeLessThanOrEqual(expected) {
      check(Number(actual) <= expected, `be at most ${expected}`);
    },
  };
}

export function expect(actual: unknown): Expectation {
  return { ...build(actual, false), not: build(actual, true) };
}

/** Jest fills `%s` / `%p` / `%i` / `%d` from the row's arguments. */
function formatTitle(title: string, args: unknown[]): string {
  let index = 0;
  return title.replace(/%[spid]/g, () => render(args[index++]));
}

/**
 * `it.each(table)(name, fn)`. An array of arrays supplies one argument per
 * column; an array of scalars supplies the value itself. A plain object is
 * iterated as `[key, value]` rows, matching Jest's behaviour.
 */
function each(table: unknown) {
  const rows: unknown[] = Array.isArray(table)
    ? table
    : Object.entries(table ?? {}).map(([key, value]) => [key, value]);
  return (title: string, fn: (...args: never[]) => unknown) => {
    for (const row of rows) {
      const args = (Array.isArray(row) ? row : [row]) as never[];
      it(formatTitle(title, args as unknown[]), async () => {
        await fn(...args);
      });
    }
  };
}

const describeWithEach = Object.assign(describe, { each });
const itWithEach = Object.assign(it, { each });
const testWithEach = Object.assign(test, { each });

export { describeWithEach as describe, itWithEach as it, testWithEach as test };

export { assert };

export { afterEach, before, beforeEach } from 'node:test';
