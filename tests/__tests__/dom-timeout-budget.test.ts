import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * An assertion budget must be reachable, or it is not a budget.
 *
 * The browser WebCrypto test gave one `findByRole` a 30s timeout while the
 * suite-wide `jest.setTimeout` was also 30s. The test spends seconds before
 * reaching that line — mounting, generating a key pair, four userEvent
 * interactions, a waitFor — so jest always expired first and the inner wait
 * could never reach its own limit.
 *
 * The cost was not one confusing error. A jest timeout aborts the test inside
 * act(), and every later test in that file then rendered an empty container:
 * one stalled assertion became ten failures, and the reported errors named
 * none of them. Hours went into "why is the container empty" when the answer
 * was three describes earlier.
 *
 * This pins the relationship rather than the numbers, so the budgets can move
 * as long as the inner one stays reachable.
 */
describe('dom assertion budgets stay inside their test budget', () => {
  const root = process.cwd();
  const suite = readFileSync(join(root, 'apps/web/src/__tests__/dom/App.test.tsx'), 'utf8');
  const setup = readFileSync(join(root, 'jest.setup.dom.ts'), 'utf8');

  /** The suite-wide default every test inherits unless it declares its own. */
  const defaultTestBudget = Number(
    setup.match(/jest\.setTimeout\((\d[\d_]*)\)/)?.[1].replace(/_/g, '') ?? '0'
  );

  it('reads a suite-wide test budget', () => {
    // Guards the parse: a rename would otherwise make every check below vacuous.
    expect(defaultTestBudget).toBeGreaterThan(0);
  });

  /**
   * `it('...', async () => { ... }, 90_000)` — the trailing argument is the
   * per-test budget. Tests without one inherit the suite default.
   */
  const declaredPerTestBudgets = Array.from(suite.matchAll(/^\s*\}, (\d[\d_]*)\);$/gm)).map((m) =>
    Number(m[1].replace(/_/g, ''))
  );

  /** Every explicit `{ timeout: N }` handed to a query or waitFor. */
  const assertionBudgets = Array.from(suite.matchAll(/timeout:\s*(\d[\d_]*)/g)).map((m) =>
    Number(m[1].replace(/_/g, ''))
  );

  it('finds the assertion budgets it means to check', () => {
    expect(assertionBudgets.length).toBeGreaterThan(0);
  });

  it('never gives an assertion the whole test budget or more', () => {
    // The governing budget for a long assertion is the largest per-test
    // budget declared in the file, falling back to the suite default when no
    // test declares one.
    const governing = Math.max(defaultTestBudget, ...declaredPerTestBudgets);

    const unreachable = assertionBudgets.filter((budget) => budget >= governing);

    // An assertion allowed to wait as long as its test cannot fail on its own
    // terms: jest kills it first, aborting inside act() and taking the rest of
    // the file with it.
    expect(unreachable).toEqual([]);
  });

  it('leaves real headroom for the setup that precedes the assertion', () => {
    const governing = Math.max(defaultTestBudget, ...declaredPerTestBudgets);
    const longest = Math.max(...assertionBudgets);

    // Mounting, key generation and several userEvent interactions run before
    // the longest wait begins. Headroom equal to that wait is not a precise
    // measurement of them; it is a margin wide enough that ordinary slowness
    // cannot close it.
    expect(governing - longest).toBeGreaterThanOrEqual(longest);
  });
});
