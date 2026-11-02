import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateEcosystemFixpoint, hashFixpointDelta } from '../../packages/mini/src/ecosystem-fixpoint.ts';

const prior = 'a'.repeat(64);
const base = {
  expectedObserved: true,
  scam: false,
  evidenceEmpty: false,
  authority: 1,
  requiredAuthority: 1,
  memory: [prior],
  delta: 'finite-delta',
};

test('a verified delta is appended once and does not mutate the prior list', () => {
  const step = evaluateEcosystemFixpoint(base);
  assert.equal(step.status, 'VERIFIED');
  assert.equal(step.halt, false);
  assert.equal(step.ledgerMutation, false);
  assert.equal(step.appended, true);
  assert.equal(step.deltaHash, hashFixpointDelta('finite-delta'));
  assert.deepEqual(step.memory, [prior, step.deltaHash]);
  assert.deepEqual(base.memory, [prior]);
  const again = evaluateEcosystemFixpoint({ ...base, memory: step.memory });
  assert.equal(again.appended, false);
  assert.equal(again.remembered, true);
  assert.equal(again.memory.length, 2);
});

test('scam halts divergent before a verified flag can append', () => {
  const step = evaluateEcosystemFixpoint({ ...base, scam: true });
  assert.equal(step.status, 'DIVERGENT');
  assert.equal(step.reason, 'SCAM');
  assert.equal(step.halt, true);
  assert.equal(step.appended, false);
  assert.deepEqual(step.memory, [prior]);
});

test('empty evidence stays unknown', () => {
  const step = evaluateEcosystemFixpoint({ ...base, evidenceEmpty: true, expectedObserved: true });
  assert.equal(step.status, 'UNKNOWN');
  assert.equal(step.reason, 'EMPTY_EVIDENCE');
  assert.equal(step.deltaHash, null);
});

test('insufficient authority is not executed', () => {
  const step = evaluateEcosystemFixpoint({ ...base, authority: 0, requiredAuthority: 1 });
  assert.equal(step.status, 'NOT_EXECUTED');
  assert.equal(step.reason, 'AUTHORITY');
  assert.equal(step.appended, false);
});

test('expected not observed is divergent and an invalid record stays unknown', () => {
  const divergent = evaluateEcosystemFixpoint({ ...base, expectedObserved: false });
  assert.equal(divergent.status, 'DIVERGENT');
  assert.equal(divergent.reason, 'EXPECTED_NOT_OBSERVED');
  const invalid = evaluateEcosystemFixpoint({ ...base, memory: ['not-a-hash'], delta: '' });
  assert.equal(invalid.status, 'UNKNOWN');
  assert.equal(invalid.reason, 'INVALID_INPUT');
  assert.deepEqual(invalid.memory, []);
});
