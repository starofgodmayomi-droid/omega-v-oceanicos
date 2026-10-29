import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * The root `test` script takes an explicit file list — Node's `--test` does
 * not discover files here and accepts no path filters. A suite that is never
 * added to that list therefore reads like coverage while running nowhere:
 * `omega_pipeline.e2e.test.ts` was described in docs/OMEGA_STATUS_VECTOR.md as
 * "the executable proof" of the pipeline while sitting outside every command,
 * and `omega_change_boundary.test.ts` / `omega_transition_boundary.test.ts`
 * were green but unrun.
 *
 * This guard keeps the list answerable: every integration file is either run
 * by `pnpm test` or named below with the reason it cannot be, every
 * `*.e2e.test.ts` is run, every listed path exists, and `test:e2e` runs the
 * same set as `test` so the two cannot drift apart.
 */

const root = fileURLToPath(new URL('../..', import.meta.url));

/**
 * Integration files that no command runs. Each one predates the current
 * architecture; they are kept as history, not as evidence of coverage.
 */
const KNOWN_UNRUN: Record<string, string> = {
  'tests/integration/full-loop.integration.test.ts':
    'Drives the removed /complete-loop and /log routes with jest globals; the loop it covered is now api-route-contract + execute-route.',
  'tests/integration/broken-current.integration.test.ts':
    'Same removed /complete-loop surface as full-loop; jest globals, no runner.',
  'tests/integration/mini-kernel.integration.test.ts':
    'Imports @omega-v/sdk and @omega-v/cli, which are no longer workspace packages, under jest globals; MINI is covered by max_compress_stack.e2e.test.ts.',
  'tests/integration/verification_loop.integration.test.ts':
    'Imports the pre-rename @omega-v/* package names under jest globals; observe→verify→attest is covered by max_compress_stack.e2e.test.ts.',
  'tests/integration/fullstack_e2e.integration.test.ts':
    'Imports 60+ @omega-v/* names that are not workspace members (renamed @oceanicos/*), so it cannot resolve a single import.',
};

const scripts = (): Record<string, string> =>
  JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts;

const listedIn = (script: string): string[] =>
  [...String(scripts()[script] ?? '').matchAll(/(\.\/[^\s"]+\.ts)/g)].map((match) => match[1]);

const integrationFiles = (): string[] =>
  readdirSync(join(root, 'tests', 'integration'))
    .filter((name) => name.endsWith('.test.ts'))
    .map((name) => `tests/integration/${name}`);

test('every path the test command lists exists', () => {
  const missing = listedIn('test').filter((file) => !existsSync(join(root, file)));
  assert.deepEqual(missing, [], 'listed suites that are missing from the tree');
});

test('every integration file is run or documented as unrun', () => {
  const listed = new Set(listedIn('test').map((file) => file.replace('./', '')));
  const orphans = integrationFiles().filter((file) => !listed.has(file) && !KNOWN_UNRUN[file]);
  assert.deepEqual(orphans, [], 'integration suites that no command runs and no note explains');
});

test('every documented unrun suite still exists and says why it cannot run', () => {
  for (const [file, reason] of Object.entries(KNOWN_UNRUN)) {
    assert.ok(existsSync(join(root, file)), `${file} is documented as unrun but is gone`);
    assert.ok(reason.trim().length > 20, `${file} needs a real reason, not a placeholder`);
  }
});

test('every e2e suite is part of both gates', () => {
  const runByTest = listedIn('test');
  const runByE2E = listedIn('test:e2e');
  const e2eFiles = integrationFiles().filter((file) => file.endsWith('.e2e.test.ts'));
  assert.ok(e2eFiles.length >= 4, 'expected the e2e suites to still be present');
  for (const file of e2eFiles) {
    assert.ok(runByTest.includes(`./${file}`), `${file} is not run by pnpm test`);
    assert.ok(runByE2E.includes(`./${file}`), `${file} is not run by pnpm test:e2e`);
  }
});

test('test and test:e2e run the same suites', () => {
  assert.deepEqual([...listedIn('test:e2e')].sort(), [...listedIn('test')].sort());
});
