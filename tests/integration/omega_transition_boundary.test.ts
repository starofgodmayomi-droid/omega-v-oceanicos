import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { executeAuthorizedTransition, resolveChangeAdmission } from '../../packages/mini/dist/index.js';

describe('Ω∞v authorized transition boundary', () => {
  const record = {
    id: 'change-integration',
    subject: 'integration-test',
    intent: 'advance state',
    stateBefore: 'S0',
    evidence: ['verified-evidence'],
    authority: 'human:integration',
    policy: 'policy:integration',
    decision: 'REVIEW' as const,
    authorized: false,
    provenance: {
      source: 'integration',
      observedAt: '2026-01-01T00:00:00.000Z',
      attributedTo: null,
      lineage: ['observation-integration'],
    },
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('refuses DENY without invoking the transition handler', () => {
    const denied = resolveChangeAdmission(record, { authorityVerified: true, policySatisfied: false });
    let invoked = false;
    const result = executeAuthorizedTransition(denied, () => {
      invoked = true;
      return { stateAfter: 'unsafe' };
    });
    assert.equal(denied.decision, 'DENY');
    assert.equal(result.status, 'REFUSED');
    assert.equal(invoked, false);
  });

  it('executes ALLOW and records before/after, consequence, attestation, and memory', () => {
    const allowed = resolveChangeAdmission(record, { authorityVerified: true, policySatisfied: true });
    const memory: typeof record[] = [];
    const result = executeAuthorizedTransition(
      allowed,
      () => ({ stateAfter: 'S1', consequence: 'state advanced' }),
      { memory: { append: (entry) => memory.push(entry as typeof record) }, now: () => '2026-01-01T00:01:00.000Z' },
    );
    assert.equal(result.status, 'EXECUTED');
    assert.equal(result.record.stateAfter, 'S1');
    assert.equal(result.record.consequence, 'state advanced');
    assert.match(result.attestationId ?? '', /^attestation-[a-f0-9]{64}$/);
    assert.equal(result.record.provenance.attributedTo, 'human:integration');
    assert.equal(memory.length, 1);
  });
});
