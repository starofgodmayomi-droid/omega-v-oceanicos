import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  WATER_PATHS,
  assertRepoReport,
  assertWaterReport,
} from './assert-compression-boundary.mjs';

const digest = 'a'.repeat(64);

const water = (overrides = {}) => ({
  current: 'FULL_STACK_WATER',
  skills: WATER_PATHS.length,
  status: 'COMPRESSED',
  digest,
  halt: null,
  upgrade: {
    execution: 'NOT_EXECUTED',
    authority: 'compression-is-not-permission',
    selected: { kind: 'review-verified-repo', evidenceHash: digest },
  },
  flow: WATER_PATHS.map((path) => ({ id: path, path })),
  ...overrides,
});

const repo = (overrides = {}) => ({
  status: 'COMPRESSED',
  reconciliation: 'VERIFIED',
  ring: WATER_PATHS.length + 1,
  remembered: WATER_PATHS.length + 1,
  digest,
  upgrade: {
    execution: 'NOT_EXECUTED',
    authority: 'compression-is-not-permission',
    selected: { kind: 'review-verified-repo', evidenceHash: digest },
  },
  outward: [...WATER_PATHS, 'ECOSYSTEM_BODY.md'].map((path) => ({ path })),
  ...overrides,
});

test('a compressed water current with an unexecuted candidate passes', () => {
  assert.deepEqual(assertWaterReport(water()), []);
});

test('water compression refuses an executed upgrade', () => {
  const failures = assertWaterReport(
    water({ upgrade: { ...water().upgrade, execution: 'EXECUTED' } }),
  );
  assert.ok(failures.some((failure) => failure.includes('upgrade.execution')));
});

test('water compression refuses a halt', () => {
  const failures = assertWaterReport(water({ status: 'HALTED', halt: { verdict: 'UNKNOWN' } }));
  assert.ok(failures.some((failure) => failure.startsWith('status=')));
  assert.ok(failures.includes('halt is set'));
});

test('a reconciled repository fold that still contains the water passes', () => {
  assert.deepEqual(assertRepoReport(repo()), []);
});

test('repository compression refuses a partial memory', () => {
  const failures = assertRepoReport(repo({ remembered: 2 }));
  assert.ok(failures.some((failure) => failure.startsWith('remembered=')));
});

test('repository compression refuses a candidate that is not the fold digest', () => {
  const failures = assertRepoReport(
    repo({
      upgrade: {
        execution: 'NOT_EXECUTED',
        authority: 'compression-is-not-permission',
        selected: { kind: 'review-verified-repo', evidenceHash: 'b'.repeat(64) },
      },
    }),
  );
  assert.ok(failures.some((failure) => failure.includes('fold digest')));
});

test('this checkout compresses water and the outward ring without executing the upgrade', () => {
  const dir = mkdtempSync(join(tmpdir(), 'omega-boundary-'));
  const waterFile = join(dir, 'water.json');
  const repoFile = join(dir, 'repo.json');
  const node = process.execPath;
  writeFileSync(
    waterFile,
    execFileSync(node, ['--experimental-strip-types', 'scripts/compress-full-stack-water.ts'], {
      cwd: process.cwd(),
    }),
  );
  writeFileSync(
    repoFile,
    execFileSync(node, ['--experimental-strip-types', 'scripts/compress-repo-equation.ts'], {
      cwd: process.cwd(),
    }),
  );
  const waterOut = execFileSync(node, ['scripts/assert-compression-boundary.mjs', 'water', waterFile], {
    encoding: 'utf8',
  });
  const repoOut = execFileSync(node, ['scripts/assert-compression-boundary.mjs', 'repo', repoFile], {
    encoding: 'utf8',
  });
  assert.match(waterOut, /upgrade\.execution=NOT_EXECUTED/);
  assert.match(repoOut, /upgrade\.execution=NOT_EXECUTED/);
});
