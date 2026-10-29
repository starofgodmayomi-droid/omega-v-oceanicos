/**
 * Runs the repository suite on the native Node test runner.
 *
 * Each test file runs in its own process (with `tests/support/jest-register.cjs`)
 * so module state, environment variables and `jest.resetModules()` behave the
 * way they did under Jest. An optional argument filters the discovered paths.
 *
 *   node scripts/run-node-suite.mjs [substring]
 */
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const searchRoots = ['packages', 'apps', 'tests'];
const ignoredSegments = new Set(['node_modules', 'dist', 'coverage', '.pnpm-store']);
const registerPath = path.join(repoRoot, 'tests', 'support', 'jest-register.cjs');
const bootstrapPath = path.join(repoRoot, 'tests', 'support', 'bootstrap.cjs');

const walk = (directory, found = []) => {
  for (const entry of readdirSync(directory)) {
    if (ignoredSegments.has(entry)) continue;
    const absolute = path.join(directory, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      if (entry === 'dom' && directory.includes(path.join('apps', 'web', 'src', '__tests__'))) continue;
      walk(absolute, found);
    } else if (/\.test\.tsx?$/.test(entry)) {
      found.push(absolute);
    }
  }
  return found;
};

const filter = process.argv[2];
const perFileTimeoutMs = Number(process.env.NODE_SUITE_TIMEOUT_MS ?? 20_000);
const files = searchRoots
  .flatMap((root) => {
    try {
      return walk(path.join(repoRoot, root));
    } catch {
      return [];
    }
  })
  .map((file) => path.relative(repoRoot, file))
  .filter((file) => !filter || file.includes(filter))
  .sort();

if (files.length === 0) {
  console.error('No test files matched.');
  process.exit(1);
}

const runFile = (file) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, ['--test-force-exit', '--require', registerPath, bootstrapPath, file], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, perFileTimeoutMs);
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve({ file, code: timedOut ? 124 : code ?? 1, stdout, stderr, timedOut });
    });
  });

const failures = [];
let tests = 0;
let passed = 0;
let failed = 0;

for (const file of files) {
  const result = await runFile(file);
  const summary = result.stdout.match(/# tests (\d+)/);
  const passedMatch = result.stdout.match(/# pass (\d+)/);
  const failedMatch = result.stdout.match(/# fail (\d+)/);
  tests += summary ? Number(summary[1]) : 0;
  passed += passedMatch ? Number(passedMatch[1]) : 0;
  failed += failedMatch ? Number(failedMatch[1]) : 0;

  if (result.code === 0) {
    console.log(`ok   ${file}`);
  } else {
    console.log(`${result.timedOut ? 'HANG' : 'FAIL'} ${file}`);
    failures.push(result);
  }
}

console.log(`\n${files.length} files · ${tests} tests · ${passed} passed · ${failed} failed`);
console.log(`${files.length - failures.length} files passed, ${failures.length} failed`);

if (failures.length > 0) {
  console.log('\n─── failure detail ───');
  for (const failure of failures) {
    console.log(`\n### ${failure.file}`);
    console.log(failure.stdout.trim().split('\n').slice(0, 400).join('\n'));
    if (failure.stderr.trim()) console.log(failure.stderr.trim().split('\n').slice(0, 80).join('\n'));
  }
  process.exit(1);
}
