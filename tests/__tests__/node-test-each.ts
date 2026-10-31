import { it } from 'node:test';

/**
 * Minimal replacement for Jest's `it.each`.
 *
 * `it.each(rows)(name, fn)` is the only parameterized-test helper these suites
 * used; `node:test` has no equivalent. A row that is an array is spread into
 * the test function (Jest's behaviour) and each `%s` in the title is replaced
 * with the matching argument, in order.
 */
export function each<T>(cases: readonly T[]) {
  return (name: string, fn: (...args: any[]) => unknown): void => {
    for (const testCase of cases) {
      const args: any[] = Array.isArray(testCase) ? testCase : [testCase];
      let index = 0;
      const title = name.replace(/%s/g, () => String(args[index++] ?? ''));
      it(title, () => fn(...args));
    }
  };
}
