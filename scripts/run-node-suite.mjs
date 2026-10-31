#!/usr/bin/env node
/**
 * Canonical `node:test` suite runner.
 *
 * The suite is defined by the files on disk, not by a hand-maintained list in
 * package.json. Eight integration tests once sat outside that list and never
 * ran in CI, and a further set of web logic tests were written against Jest
 * globals and could not run at all. Adding a `*.test.ts` file (or deleting
 * one) now changes the suite, so a test cannot silently become orphaned.
 *
 * Every `tests/integration/*.test.ts` and every logic test in
 * `apps/web/src/__tests__` is part of the suite. The DOM suites
 * (`apps/web/src/__tests__/dom/*.test.tsx`) need jsdom and run under Jest via
 * `pnpm test:web`; node's type stripping does not transform JSX.
 *
 * TypeScript is executed directly (`--experimental-strip-types`), so the
 * workspace packages and the API must be built first (`pnpm build`).
 * Extra arguments are forwarded to the runner, e.g. `--test-reporter=spec`.
 */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const collect = (directory) =>
  readdirSync(directory)
    .filter((file) => file.endsWith('.test.ts'))
    .sort()
    .map((file) => `./${directory}/${file}`);

const integration = collect('tests/integration');
const webLogic = collect('apps/web/src/__tests__');

if (integration.length === 0) {
  console.error('NODE_SUITE_EMPTY: no tests/integration/*.test.ts files found');
  process.exit(1);
}

const files = [...integration, ...webLogic];
console.log(
  `node suite: ${files.length} files (${integration.length} integration, ${webLogic.length} web logic)`
);

const result = spawnSync(
  process.execPath,
  ['--experimental-strip-types', '--test-concurrency=1', '--test', ...files, ...process.argv.slice(2)],
  { stdio: 'inherit' }
);

process.exit(result.status ?? 1);
