import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { advanceOmegaSourceState, executeAuthorizedTransition, normalizeOmegaSource, resolveChangeAdmission, verifyExecutedReality } from '../../packages/mini/dist/index.js';

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

  it('preserves retrieved source state without promoting it to trust or verification', () => {
    const source = normalizeOmegaSource({
      id: 'source-1',
      kind: 'api',
      locator: 'https://example.test/data',
      state: 'RETRIEVED',
      provenance: 'integration-test',
    });
    assert.equal(source.state, 'RETRIEVED');
    assert.equal(source.authority, undefined);
    assert.equal(source.evidenceRef, undefined);
  });

  it('fails closed when source state claims exceed supplied authority or evidence', () => {
    assert.throws(
      () => normalizeOmegaSource({ id: 'source-2', kind: 'api', locator: 'example', state: 'AUTHORIZED', provenance: 'test' }),
      /authorized source requires explicit source authority/,
    );
    assert.throws(
      () => normalizeOmegaSource({ id: 'source-3', kind: 'api', locator: 'example', state: 'VERIFIED', provenance: 'test' }),
      /verified source requires an evidence reference/,
    );
  });

  it('allows source states to advance but rejects epistemic regression', () => {
    assert.equal(advanceOmegaSourceState('RETRIEVED', 'TRUSTED'), 'TRUSTED');
    assert.equal(advanceOmegaSourceState('OBSERVED', 'VERIFIED'), 'VERIFIED');
    assert.throws(
      () => advanceOmegaSourceState('VERIFIED', 'RETRIEVED'),
      /source state cannot regress from VERIFIED to RETRIEVED/,
    );
  });
});
