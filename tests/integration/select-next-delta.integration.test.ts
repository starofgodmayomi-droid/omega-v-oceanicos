import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { observeEcosystemDeltas, selectNextDelta } from '../../scripts/select-next-delta.mjs';

const root = process.cwd();

const proposal = (overrides: Record<string, unknown>) => ({
  intent: 'one finite change',
  authority: 'ALLOW',
  bounded: true,
  policyChecked: true,
  privacyChecked: true,
  acceptanceCriteria: 'a named check passes',
  rollback: 'revert the commit',
  estimatedValue: 2,
  evidenceQuality: 1,
  risk: 1,
  cost: 1,
  evidence: 'STATED',
  acceptanceMet: false,
  alreadyApplied: false,
  ...overrides,
});

test('an eligible estimate outranks a larger denied expansion', () => {
  const result = selectNextDelta([
    proposal({ id: 'expand-everything', authority: 'DENY', estimatedValue: 1000, evidence: 'STATED' }),
    proposal({ id: 'small-proven-fix', estimatedValue: 2, evidence: 'VERIFIED', acceptanceMet: false }),
    proposal({ id: 'already-done', estimatedValue: 9, evidence: 'VERIFIED', alreadyApplied: true }),
  ]);
  assert.equal(result.decision, 'SELECT');
  assert.equal(result.status, 'PROPOSED');
  assert.equal(result.execution, 'NOT_EXECUTED');
  assert.equal(result.selected, 'small-proven-fix');
  assert.equal(result.verifiedValue, null);
  assert.ok(Math.abs(result.priorityScore - 2 / 2) < 1e-9);
  assert.ok(result.rejected.some((item) => item.id === 'expand-everything' && item.reason === 'DENY'));
  assert.ok(result.rejected.some((item) => item.id === 'already-done' && item.reason === 'ALREADY_APPLIED'));
});

test('review and missing authority are held, not executed', () => {
  const result = selectNextDelta([
    proposal({ id: 'deploy-cloud', authority: 'DENY', estimatedValue: 100, evidence: 'NOT_EXECUTED' }),
    proposal({ id: 'production-resolver', authority: 'REVIEW', estimatedValue: 80, evidence: 'UNKNOWN' }),
  ]);
  assert.equal(result.decision, 'NONE');
  assert.equal(result.status, 'NOT_EXECUTED');
  assert.equal(result.selected, null);
  assert.equal(result.verifiedValue, null);
  assert.ok(result.held.some((item) => item.id === 'production-resolver' && item.reason === 'REVIEW'));
});

test('equal scores prefer the larger safety reduction', () => {
  const result = selectNextDelta([
    proposal({ id: 'polish', estimatedValue: 2, safetyReduction: 0 }),
    proposal({ id: 'close-admission-gap', estimatedValue: 2, safetyReduction: 3, closesEvidenceGap: true }),
  ]);
  assert.equal(result.selected, 'close-admission-gap');
});

test('verified value is recorded only after acceptance', () => {
  const result = selectNextDelta([
    proposal({
      id: 'accepted-fix',
      evidence: 'VERIFIED',
      acceptanceMet: true,
      verifiedValue: 2,
    }),
  ]);
  assert.equal(result.verifiedValue, 2);
  assert.equal(result.execution, 'NOT_EXECUTED');
});

test('this checkout does not select deploy, promotion, or the production resolver', () => {
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
  assert.equal(observed.next.execution, 'NOT_EXECUTED');
  assert.ok(observed.next.rejected.some((item) => item.id === 'deploy-cloud' && item.reason === 'DENY'));
  assert.ok(observed.next.rejected.some((item) => item.id === 'promote-off-workspace-packages' && item.reason === 'DENY'));
  assert.ok(observed.next.held.some((item) => item.id === 'wire-production-admission-resolver' && item.reason === 'REVIEW'));
  const output = execFileSync(process.execPath, ['scripts/select-next-delta.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });
  const printed = JSON.parse(output);
  assert.equal(printed.next.decision, 'NONE');
  assert.equal(printed.next.selected, null);
});
