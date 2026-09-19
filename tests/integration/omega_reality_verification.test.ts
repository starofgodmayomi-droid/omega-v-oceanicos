import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { executeAuthorizedTransition, resolveChangeAdmission, verifyExecutedReality } from '../../packages/mini/dist/index.js';

const record = {
  id: 'change-reality',
  subject: 'reality-test',
  intent: 'advance state',
  stateBefore: 'S0',
  evidence: ['verified-evidence'],
  authority: 'human:reality',
  policy: 'policy:reality',
  decision: 'REVIEW' as const,
  authorized: false,
  provenance: { source: 'integration', observedAt: '2026-01-01T00:00:00.000Z', attributedTo: null, lineage: [] },
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('Ω∞v reality verification boundary', () => {
  it('distinguishes execution from verified reality and records matching evidence', () => {
    const allowed = resolveChangeAdmission(record, { authorityVerified: true, policySatisfied: true });
    const execution = executeAuthorizedTransition(allowed, () => ({ stateAfter: 'S1' }));
    const memory: unknown[] = [];
    const verification = verifyExecutedReality(execution, () => 'S1', {
      memory: { append: (entry) => memory.push(entry) },
      now: () => '2026-01-01T00:02:00.000Z',
    });
    assert.equal(execution.status, 'EXECUTED');
    assert.equal(verification.status, 'VERIFIED');
    assert.equal(verification.expectedState, 'S1');
    assert.equal(verification.observedState, 'S1');
    assert.match(verification.evidence, /^sha256:[a-f0-9]{64}$/);
    assert.equal(memory.length, 1);
  });

  it('preserves UNKNOWN when reality observation fails', () => {
    const allowed = resolveChangeAdmission(record, { authorityVerified: true, policySatisfied: true });
    const execution = executeAuthorizedTransition(allowed, () => ({ stateAfter: 'S1' }));
    const memory: unknown[] = [];
    const verification = verifyExecutedReality(
      execution,
      () => {
        throw new Error('observer unavailable');
      },
      {
        memory: { append: (entry) => memory.push(entry) },
        now: () => '2026-01-01T00:03:00.000Z',
      },
    );
    assert.equal(verification.status, 'UNKNOWN');
    assert.equal(verification.expectedState, 'S1');
    assert.equal(verification.observedState, undefined);
    assert.equal(verification.evidence, 'observation unavailable; reality could not be verified');
    assert.equal(memory.length, 1);
  });

  it('records divergence when observed reality differs', () => {
    const allowed = resolveChangeAdmission(record, { authorityVerified: true, policySatisfied: true });
    const execution = executeAuthorizedTransition(allowed, () => ({ stateAfter: 'S1' }));
    const verification = verifyExecutedReality(execution, () => 'S2');
    assert.equal(verification.status, 'DIVERGENT');
    assert.equal(verification.expectedState, 'S1');
    assert.equal(verification.observedState, 'S2');
  });
});
