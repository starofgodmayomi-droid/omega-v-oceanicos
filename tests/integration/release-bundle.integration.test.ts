import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const repoRoot = process.cwd();
const validator = path.join(repoRoot, 'scripts', 'validate-release-bundle.mjs');
const commit = '0123456789abcdef0123456789abcdef01234567';

function createBundle(overrides: Record<string, unknown> = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'omega-release-test-'));
  for (const directory of ['api/dist', 'web/dist', 'docs']) {
    fs.mkdirSync(path.join(root, directory), { recursive: true });
  }
  for (const file of [
    'api/dist/index.js',
    'web/dist/index.html',
    'api/package.json',
    'web/package.json',
    'package.json',
    'pnpm-lock.yaml',
    'docs/OREADE-OCEANICOS-HARMONIZER.md',
  ]) {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, '{}\n');
  }
  fs.writeFileSync(
    path.join(root, 'release-manifest.json'),
    JSON.stringify(
      {
        commit,
        ref: 'test',
        environment: 'staging',
        builtAt: '2026-10-01T17:14:00.000Z',
        status: 'VERIFIED',
        deployment: 'STAGED_ONLY',
        limitations: ['test fixture is not a deployment'],
        ...overrides,
      },
      null,
      2,
    ),
  );
  return root;
}

function runValidator(bundle: string, expectedCommit = commit) {
  return execFileSync(process.execPath, [validator, bundle, expectedCommit], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

test('release validator accepts a complete staged bundle', () => {
  const bundle = createBundle();
  try {
    const output = runValidator(bundle);
    assert.match(output, /"status": "VERIFIED"/);
    assert.match(output, /"deployment": "STAGED_ONLY"/);
  } finally {
    fs.rmSync(bundle, { recursive: true, force: true });
  }
});

test('release validator rejects a deployment claim or commit mismatch', () => {
  const deployed = createBundle({ deployment: 'DEPLOYED' });
  const mismatched = createBundle();
  try {
    assert.throws(() => runValidator(deployed), /release validation failed/);
    assert.throws(() => runValidator(mismatched, 'fedcba987654321'), /release validation failed/);
  } finally {
    fs.rmSync(deployed, { recursive: true, force: true });
    fs.rmSync(mismatched, { recursive: true, force: true });
  }
});
