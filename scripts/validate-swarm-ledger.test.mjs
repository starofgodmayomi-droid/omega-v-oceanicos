import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const repoRoot = process.cwd();
const validator = path.join(repoRoot, 'scripts', 'validate-swarm-ledger.mjs');
const requiredFiles = ['SWARM_PROTOCOL.md', 'AGENTS.md', '.cursorrules', 'CLAUDE.md', 'kai_ledger.json'];

function createGitFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'omega-swarm-ledger-test-'));
  for (const file of requiredFiles) {
    writeFileSync(path.join(root, file), readFileSync(path.join(repoRoot, file)));
  }
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Swarm Ledger Test'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'swarm-ledger-test@example.invalid'], { cwd: root });
  execFileSync('git', ['add', ...requiredFiles], { cwd: root });
  execFileSync('git', ['commit', '-qm', 'baseline ledger'], { cwd: root });
  execFileSync('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], { cwd: root });
  return root;
}

function runValidator(cwd, baselineRef) {
  return spawnSync(process.execPath, [validator], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, SWARM_LEDGER_BASELINE_REF: baselineRef },
  });
}

test('swarm ledger validation rejects committed removal of historical receipts', () => {
  const root = createGitFixture();
  try {
    const ledgerPath = path.join(root, 'kai_ledger.json');
    const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
    ledger.entries = ledger.entries.slice(0, 3);
    writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    execFileSync('git', ['add', 'kai_ledger.json'], { cwd: root });
    execFileSync('git', ['commit', '-qm', 'remove historical receipts'], { cwd: root });

    const result = runValidator(root, 'origin/main');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /append-only baseline origin\/main entry 3 was removed or modified/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('swarm ledger validation rejects uncommitted removal of historical receipts', () => {
  const root = createGitFixture();
  try {
    const ledgerPath = path.join(root, 'kai_ledger.json');
    const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
    ledger.entries = ledger.entries.slice(0, 3);
    writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);

    const result = runValidator(root, 'HEAD');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /append-only baseline HEAD entry 3 was removed or modified/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('swarm ledger validation rejects modification of a historical receipt', () => {
  const root = createGitFixture();
  try {
    const ledgerPath = path.join(root, 'kai_ledger.json');
    const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
    ledger.entries[3].next_delta = 'Modified historical receipt.';
    writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);

    const result = runValidator(root, 'HEAD');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /append-only baseline HEAD entry 3 was removed or modified/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('swarm ledger validation accepts new receipts appended to the baseline', () => {
  const root = createGitFixture();
  try {
    const ledgerPath = path.join(root, 'kai_ledger.json');
    const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
    const latestTimestamp = Math.max(...ledger.entries.map((entry) => Date.parse(entry.timestamp)));
    ledger.entries.push({
      agent_id: 'copilot-test',
      branch: 'agent/copilot-test/ledger-test',
      status: 'UNKNOWN',
      files_touched: ['scripts/validate-swarm-ledger.test.mjs'],
      tests_passed: null,
      evidence_hash: null,
      next_delta: 'No follow-up; this receipt is an isolated test fixture.',
      timestamp: new Date(latestTimestamp + 1_000).toISOString(),
    });
    writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    execFileSync('git', ['add', 'kai_ledger.json'], { cwd: root });
    execFileSync('git', ['commit', '-qm', 'append new receipt'], { cwd: root });

    const result = runValidator(root, 'origin/main');
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes(`validated ${ledger.entries.length} swarm ledger receipt`));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('swarm ledger validation accepts chronologically interleaved receipts from concurrent branches', () => {
  const root = createGitFixture();
  try {
    const ledgerPath = path.join(root, 'kai_ledger.json');
    const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
    const lastIndex = ledger.entries.length - 1;
    const previousTimestamp = Date.parse(ledger.entries[lastIndex - 1].timestamp);
    const latestTimestamp = Date.parse(ledger.entries[lastIndex].timestamp);
    const interleavedTimestamp = new Date(previousTimestamp + Math.floor((latestTimestamp - previousTimestamp) / 2));
    ledger.entries.splice(lastIndex, 0, {
      agent_id: 'copilot-test',
      branch: 'agent/copilot-test/concurrent-ledger',
      status: 'UNKNOWN',
      files_touched: ['scripts/validate-swarm-ledger.test.mjs'],
      tests_passed: null,
      evidence_hash: null,
      next_delta: 'No follow-up; this receipt is an isolated test fixture.',
      timestamp: interleavedTimestamp.toISOString(),
    });
    writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);

    const result = runValidator(root, 'origin/main');
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes(`validated ${ledger.entries.length} swarm ledger receipt`));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
