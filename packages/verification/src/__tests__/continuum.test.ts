import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalizeContinuumTransition, evaluateContinuumTransition } from '../continuum.ts';

test('LucidContinuum converges to VERIFIED with complete evidence and authorization', () => {
  const result = evaluateContinuumTransition({
    transitionId: 'delta-001',
    baseline: 'observed-main',
    candidate: 'worker-branch',
    evidence: ['branch-created', 'scope-preserved'],
    authorized: true,
  });

  assert.equal(result.state, 'VERIFIED');
  assert.equal(result.verified, true);
  assert.equal(result.delta, 'STATE_DELTA');
  assert.match(canonicalizeContinuumTransition(result), /"state":"VERIFIED"/);
});

test('LucidContinuum preserves DIVERGENT when an authorized guard fails', () => {
  const result = evaluateContinuumTransition({
    transitionId: 'delta-002',
    baseline: 'observed-main',
    candidate: '',
    evidence: ['candidate-missing'],
    authorized: true,
  });

  assert.equal(result.state, 'DIVERGENT');
  assert.equal(result.verified, false);
});

test('LucidContinuum preserves NOT_EXECUTED without authorization', () => {
  const result = evaluateContinuumTransition({
    transitionId: 'delta-003',
    baseline: 'observed-main',
    candidate: 'proposed-change',
    evidence: ['proposal-only'],
    authorized: false,
  });

  assert.equal(result.state, 'NOT_EXECUTED');
  assert.equal(result.verified, false);
});
