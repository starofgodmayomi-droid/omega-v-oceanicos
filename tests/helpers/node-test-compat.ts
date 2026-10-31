/**
 * node:test compatibility layer.
 *
 * Several suites in this repository were written against Jest/Vitest globals
 * (`describe`, `it`, `expect`) but neither `jest` nor `vitest` is a dependency
 * of this workspace, so those files could not resolve or run at all. This
 * module exposes the same globals on top of the built-in `node:test` runner and
 * `node:assert`, which lets the suites run unmodified under
 * `node --experimental-strip-types --test`.
 *
 * Assertions are real: every matcher throws on failure, so a broken suite fails
 * loudly instead of passing silently. Only the matchers actually used by the
 * migrated suites are implemented; adding a new one is a deliberate act, not a
 * silent no-op.
 */
import assert from 'node:assert/strict';
import { describe, it, test } from 'node:test';

export { describe, it, test };
export { it as specify, test as context };

export const beforeAll = (fn: () => unknown) => test.before(fn as any);
export const afterAll = (fn: () => unknown) => test.after(fn as any);
export const beforeEach = (fn: () => unknown) => test.beforeEach(fn as any);
export const afterEach = (fn: () => unknown) => test.afterEach(fn as any);

type AnyFn = (...args: any[]) => any;

function describeValue(value: unknown): string {
  if (typeof value === 'function') return `[function ${value.name || 'anonymous'}]`;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

class Assertion {
  // Written out rather than as constructor parameter properties: node's type
  // stripping only erases syntax, it cannot emit assignments.
  private readonly actual: unknown;
  private readonly negated: boolean;

  constructor(actual: unknown, negated = false) {
    this.actual = actual;
    this.negated = negated;
  }

  get not(): Assertion {
    return new Assertion(this.actual, !this.negated);
  }

  private check(pass: boolean, message: string): void {
    if (this.negated ? pass : !pass) {
      throw new assert.AssertionError({
        message: `${this.negated ? 'Expected NOT: ' : ''}${message}`,
        actual: this.actual,
      });
    }
  }

  toBe(expected: unknown): void {
    this.check(
      Object.is(this.actual, expected),
      `expected ${describeValue(this.actual)} to be ${describeValue(expected)}`
    );
  }

  toEqual(expected: unknown): void {
    let pass = true;
    try {
      assert.deepEqual(this.actual, expected);
    } catch {
      pass = false;
    }
    this.check(pass, `expected ${describeValue(this.actual)} to equal ${describeValue(expected)}`);
  }

  toStrictEqual(expected: unknown): void {
    this.toEqual(expected);
  }

  toMatchObject(expected: Record<string, unknown>): void {
    const actual = this.actual as Record<string, unknown>;
    const matches =
      typeof actual === 'object' &&
      actual !== null &&
      Object.entries(expected).every(([key, value]) => {
        const candidate = actual[key];
        if (value && typeof value === 'object') {
          try {
            assert.deepEqual(candidate, value);
            return true;
          } catch {
            return false;
          }
        }
        return Object.is(candidate, value);
      });
    this.check(matches, `expected ${describeValue(this.actual)} to match ${describeValue(expected)}`);
  }

  toContain(expected: unknown): void {
    const actual = this.actual as any;
    const pass =
      typeof actual === 'string'
        ? actual.includes(String(expected))
        : Array.isArray(actual)
          ? actual.some((entry) => {
              try {
                assert.deepEqual(entry, expected);
                return true;
              } catch {
                return Object.is(entry, expected);
              }
            })
          : false;
    this.check(pass, `expected ${describeValue(this.actual)} to contain ${describeValue(expected)}`);
  }

  toMatch(expected: RegExp | string): void {
    const actual = String(this.actual);
    const pass = expected instanceof RegExp ? expected.test(actual) : actual.includes(expected);
    this.check(pass, `expected ${describeValue(this.actual)} to match ${String(expected)}`);
  }

  toHaveProperty(path: string, expected?: unknown): void {
    const segments = path.split('.');
    let cursor: any = this.actual;
    let present = true;
    for (const segment of segments) {
      if (cursor === null || cursor === undefined || !(segment in Object(cursor))) {
        present = false;
        break;
      }
      cursor = cursor[segment];
    }
    if (!present) {
      this.check(false, `expected value to have property ${path}`);
      return;
    }
    if (expected === undefined) {
      this.check(true, `has property ${path}`);
      return;
    }
    let matches = true;
    try {
      assert.deepEqual(cursor, expected);
    } catch {
      matches = false;
    }
    this.check(matches, `expected property ${path} to equal ${describeValue(expected)}`);
  }

  toHaveLength(expected: number): void {
    const actual = (this.actual as any)?.length;
    this.check(actual === expected, `expected length ${String(actual)} to be ${expected}`);
  }

  toBeDefined(): void {
    this.check(this.actual !== undefined, 'expected value to be defined');
  }

  toBeUndefined(): void {
    this.check(this.actual === undefined, `expected ${describeValue(this.actual)} to be undefined`);
  }

  toBeNull(): void {
    this.check(this.actual === null, `expected ${describeValue(this.actual)} to be null`);
  }

  toBeTruthy(): void {
    this.check(Boolean(this.actual), `expected ${describeValue(this.actual)} to be truthy`);
  }

  toBeFalsy(): void {
    this.check(!this.actual, `expected ${describeValue(this.actual)} to be falsy`);
  }

  toBeInstanceOf(expected: AnyFn): void {
    this.check(this.actual instanceof expected, `expected value to be instance of ${expected.name}`);
  }

  toBeGreaterThan(expected: number | bigint): void {
    this.check((this.actual as any) > expected, `expected ${String(this.actual)} > ${String(expected)}`);
  }

  toBeGreaterThanOrEqual(expected: number | bigint): void {
    this.check((this.actual as any) >= expected, `expected ${String(this.actual)} >= ${String(expected)}`);
  }

  toBeLessThan(expected: number | bigint): void {
    this.check((this.actual as any) < expected, `expected ${String(this.actual)} < ${String(expected)}`);
  }

  toThrow(expected?: RegExp | string | AnyFn): void {
    let thrown: unknown;
    let didThrow = false;
    try {
      (this.actual as AnyFn)();
    } catch (error) {
      didThrow = true;
      thrown = error;
    }
    if (!didThrow) {
      this.check(false, 'expected function to throw');
      return;
    }
    if (expected === undefined) {
      this.check(true, 'threw');
      return;
    }
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    const pass =
      expected instanceof RegExp
        ? expected.test(message)
        : typeof expected === 'string'
          ? message.includes(expected)
          : thrown instanceof (expected as AnyFn);
    this.check(pass, `expected thrown message ${JSON.stringify(message)} to match ${String(expected)}`);
  }
}

export function expect(actual: unknown): Assertion {
  return new Assertion(actual);
}

expect.assertions = (count: number) => {
  if (!Number.isInteger(count) || count < 0) throw new Error('assertions(count) needs a non-negative integer');
};
