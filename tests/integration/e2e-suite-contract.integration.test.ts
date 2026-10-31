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
 * The same failure had a second home: every suite written against Jest's
 * globals. The root `jest.config.js` named them, no script ran jest, jest was
 * not a root dependency, and the config could not even start. `tests/__tests__`
 * and `apps/web/src/__tests__` were covered on paper only.
 *
 * This guard keeps both lists answerable: every integration file, every
 * repo-level contract suite, and every web suite is either run by a gate or
 * named below with the reason it cannot be; every `*.e2e.test.ts` is run;
 * every listed path exists; and `test:e2e` runs the same set as `test` so the
 * two cannot drift apart.
 */

const root = fileURLToPath(new URL('../..', import.meta.url));

/**
 * Suites that no command runs. Each one predates the current architecture;
 * they are kept as history, not as evidence of coverage.
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
  'tests/__tests__/asymmetric-attestation.test.ts':
    'A root-level suite cannot resolve @oceanicos/* imports: pnpm links workspace packages per package, so only apps/api and the libraries themselves see them. The envelope it covers is asserted by tests/__tests__/spec-example.test.ts and apps/web/src/__tests__/verify.test.ts.',
  'tests/__tests__/governance.test.ts':
    'docs/GOVERNANCE.md still inventories the pre-/v1 write surface (it lists POST /observe, /act, /learn, /complete-loop and omits every /v1 write), so its route check cannot pass without a governance rewrite. Rewriting a security document is a governance decision, not a test migration; the suite is parked until that rewrite lands.',
  'apps/web/src/__tests__/dom/App.test.tsx':
    'Drives the removed Builder-kernel dashboard (headings and panels that no longer exist anywhere in apps/web/src). CurrentAppShell.test.tsx and the panel suites cover the surface that replaced it.',
  'apps/web/src/__tests__/dom/runtime-health-panel.test.tsx':
    'Renders the removed metrics-row / revocation-evidence rows of the old App shell. The surface it measured is gone; runtime evidence is now covered by ObservationStreamPanel and SystemHealthPanel.',
};

const scripts = (): Record<string, string> =>
  JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts;

const listedIn = (script: string): string[] =>
  [...String(scripts()[script] ?? '').matchAll(/(\.\/[^\s"]+\.tsx?)/g)].map((match) => match[1]);

const filesIn = (directory: string, pattern: RegExp): string[] =>
  readdirSync(join(root, directory))
    .filter((name) => pattern.test(name))
    .map((name) => `${directory}/${name}`);

const integrationFiles = (): string[] =>
  filesIn('tests/integration', /\.test\.ts$/);

const contractFiles = (): string[] => filesIn('tests/__tests__', /\.test\.ts$/);

const webFiles = (): string[] => filesIn('apps/web/src/__tests__', /\.test\.tsx?$/);

const webDomFiles = (): string[] => filesIn('apps/web/src/__tests__/dom', /\.test\.tsx$/);

/** The DOM suites the web gate runs, as `apps/web`-relative paths. */
const webDomGate = (): string[] => {
  const web = JSON.parse(readFileSync(join(root, 'apps/web/package.json'), 'utf8')).scripts as Record<
    string,
    string
  >;
  return [...String(web['test:current-dom'] ?? '').matchAll(/(src\/__tests__\/[^\s"]+\.tsx)/g)].map(
    (match) => `apps/web/${match[1]}`
  );
};

test('every path the test command lists exists', () => {
  const missing = listedIn('test').filter((file) => !existsSync(join(root, file)));
  assert.deepEqual(missing, [], 'listed suites that are missing from the tree');
});

test('every integration file is run or documented as unrun', () => {
  const listed = new Set(listedIn('test').map((file) => file.replace('./', '')));
  const orphans = integrationFiles().filter((file) => !listed.has(file) && !KNOWN_UNRUN[file]);
  assert.deepEqual(orphans, [], 'integration suites that no command runs and no note explains');
});

test('every repo-level contract suite is run or documented as unrun', () => {
  const listed = new Set(listedIn('test').map((file) => file.replace('./', '')));
  const orphans = contractFiles().filter((file) => !listed.has(file) && !KNOWN_UNRUN[file]);
  assert.deepEqual(orphans, [], 'tests/__tests__ suites that no command runs and no note explains');
});

test('every web suite is run by a gate or documented as unrun', () => {
  const nodeGate = new Set(listedIn('test').map((file) => file.replace('./', '')));
  const domGate = new Set(webDomGate());
  const orphans = webFiles().filter(
    (file) => !nodeGate.has(file) && !domGate.has(file) && !KNOWN_UNRUN[file]
  );
  assert.deepEqual(orphans, [], 'web suites that no gate runs and no note explains');
});

test('the web DOM gate covers every DOM suite it claims', () => {
  const domGate = new Set(webDomGate());
  const orphans = webDomFiles().filter((file) => !domGate.has(file) && !KNOWN_UNRUN[file]);
  assert.deepEqual(orphans, [], 'DOM suites missing from test:current-dom');
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
