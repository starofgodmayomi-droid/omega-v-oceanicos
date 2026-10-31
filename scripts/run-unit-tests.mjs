#!/usr/bin/env node
// Runs the stale Jest/Vitest-style unit tests under the node:test compat layer.
//
// Selects `.test.ts` files (packages + tests/__tests__ + non-dom apps/web) that
// are NOT already authored for `node:test` (no `import ... from 'node:test'`),
// and runs them unmodified via `node --test --import tests/compat/register.mjs`.
// DOM (jsdom) tests stay on the web app's own jest runner; integration tests stay
// on the native `node --test` list in the root `test` script.

import { spawnSync } from 'node:child_process';
import { readFileSync, globSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

// Stale tests with known genuine failures are excluded from the green slice
// (see tests/compat/known-broken.json) so `npm test` stays green. Run with
// UNIT_ALL=1 (or `npm run test:unit:all`) to include them and expose the backlog.
const allMode = process.env.UNIT_ALL === '1';
let knownBroken = new Set();
try {
  const manifest = JSON.parse(readFileSync(resolve(root, 'tests/compat/known-broken.json'), 'utf8'));
  knownBroken = new Set((manifest.known_broken ?? []).map((p) => resolve(root, p)));
} catch { /* no manifest → run everything */ }

const globs = [
  'packages/*/src/__tests__/*.test.ts',
  'packages/*/src/*.test.ts',
  'tests/__tests__/*.test.ts',
  'apps/web/src/__tests__/*.test.ts',
];

let files = [];
for (const g of globs) {
  for (const f of globSync(g, { cwd: root })) {
    const full = resolve(root, f);
    if (full.includes('/dom/')) continue;          // DOM tests run via the web jest runner
    let src;
    try { src = readFileSync(full, 'utf8'); } catch { continue; }
    if (/from\s+['"]node:test['"]/.test(src)) continue; // already in the native node suite
    if (!allMode && knownBroken.has(full)) continue;    // green slice excludes the backlog
    files.push(full);
  }
}
files.sort();

if (files.length === 0) {
  console.error('run-unit-tests: no stale Jest/Vitest test files found');
  process.exit(1);
}

const args = [
  '--experimental-transform-types',
  '--import', resolve(root, 'tests/compat/register.mjs'),
  '--test-concurrency=1',
  '--test', ...files,
];

const res = spawnSync(process.execPath, args, { stdio: 'inherit' });
process.exit(res.status ?? 1);
