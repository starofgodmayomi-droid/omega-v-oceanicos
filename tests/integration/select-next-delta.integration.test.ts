import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { observeEcosystemDeltas, selectNextDelta } from '../../scripts/select-next-delta.mjs';

const root = process.cwd();

test('verified value outranks a larger unverified expansion', () => {
  const result = selectNextDelta([
    { id: 'expand-everything', verifiedValue: 1000, risk: 1, cost: 1, evidence: 'STATED', alreadyApplied: false },
    { id: 'small-proven-fix', verifiedValue: 2, risk: 1, cost: 1, evidence: 'VERIFIED', alreadyApplied: false },
    { id: 'already-done', verifiedValue: 9, risk: 1, cost: 1, evidence: 'VERIFIED', alreadyApplied: true },
  ]);
  assert.equal(result.decision, 'SELECT');
  assert.equal(result.status, 'PROPOSED');
  assert.equal(result.selected, 'small-proven-fix');
  assert.equal(result.score, 1);
  assert.ok(result.rejected.some((item) => item.id === 'expand-everything' && item.reason === 'EVIDENCE_NOT_VERIFIED'));
  assert.ok(result.rejected.some((item) => item.id === 'already-done' && item.reason === 'ALREADY_APPLIED'));
});

test('no verified candidate stays NOT_EXECUTED', () => {
  const result = selectNextDelta([
    { id: 'deploy-cloud', verifiedValue: 100, risk: 1, cost: 1, evidence: 'NOT_EXECUTED', alreadyApplied: false },
  ]);
  assert.equal(result.decision, 'NONE');
  assert.equal(result.status, 'NOT_EXECUTED');
  assert.equal(result.selected, null);
});

test('this checkout does not select deploy or off-workspace promotion', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  const testPath = './tests/integration/select-next-delta.integration.test.ts';
  assert.equal(manifest.scripts['select:next'], 'node scripts/select-next-delta.mjs');
  for (const script of ['test', 'test:e2e']) {
    assert.ok(manifest.scripts[script]?.includes(testPath), `${script} must run ${testPath}`);
  }
  const observed = observeEcosystemDeltas(root);
  assert.equal(observed.receipt.deployment, 'NOT_EXECUTED');
  assert.equal(observed.next.decision, 'NONE');
  assert.equal(observed.next.status, 'NOT_EXECUTED');
  assert.ok(observed.next.rejected.some((item) => item.id === 'deploy-cloud'));
  assert.ok(observed.next.rejected.some((item) => item.id === 'promote-off-workspace-packages'));
  const output = execFileSync(process.execPath, ['scripts/select-next-delta.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });
  const printed = JSON.parse(output);
  assert.equal(printed.next.decision, 'NONE');
});
