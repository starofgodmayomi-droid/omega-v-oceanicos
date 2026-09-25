import { describe, expect, it } from '@jest/globals';
import type { OmegaChangeRecord } from '@oceanicos/types';
import { executeAuthorizedTransition } from '../transition';
import { resolveChangeAdmission } from '../admission';

const baseRecord = (decision: OmegaChangeRecord['decision'] = 'REVIEW'): OmegaChangeRecord => ({
  id: 'change-test',
  subject: 'test-subject',
  intent: 'advance test state',
  stateBefore: 'S0',
  evidence: ['verified-evidence'],
  authority: 'human:alice',
  policy: 'policy:test',
  decision,
  authorized: decision === 'ALLOW',
  provenance: {
    source: 'test',
    observedAt: '2026-01-01T00:00:00.000Z',
    attributedTo: null,
    lineage: ['observation-1'],
  },
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('Ω authorized transition boundary', () => {
  it('fails closed when authority or policy evidence is missing', () => {
    const admitted = resolveChangeAdmission(baseRecord(), {
      authorityVerified: true,
      policySatisfied: false,
    });
    expect(admitted.decision).toBe('DENY');
    expect(admitted.authorized).toBe(false);
  });

  it('executes ALLOW, captures state/consequence, attests, and remembers', () => {
    const entries: OmegaChangeRecord[] = [];
    const admitted = resolveChangeAdmission(baseRecord(), {
      authorityVerified: true,
      policySatisfied: true,
    });
    const result = executeAuthorizedTransition(
      admitted,
      () => ({ stateAfter: 'S1', consequence: 'state advanced' }),
      { memory: { append: (record) => entries.push(record) }, now: () => '2026-01-01T00:01:00.000Z' },
    );

    expect(result.status).toBe('EXECUTED');
    expect(result.record.stateAfter).toBe('S1');
    expect(result.record.consequence).toBe('state advanced');
    expect(result.attestationId).toMatch(/^attestation-[a-f0-9]{64}$/);
    expect(result.record.provenance.attributedTo).toBe('human:alice');
    expect(entries).toHaveLength(1);
    expect(entries[0].attestationId).toBe(result.attestationId);
  });

  it('does not call the handler for DENY or REVIEW', () => {
    let calls = 0;
    const handler = () => {
      calls += 1;
      return { stateAfter: 'unsafe' };
    };
    const denied = executeAuthorizedTransition(baseRecord('DENY'), handler);
    const review = executeAuthorizedTransition(baseRecord('REVIEW'), handler);
    expect(denied.status).toBe('REFUSED');
    expect(review.status).toBe('REVIEW_REQUIRED');
    expect(calls).toBe(0);
  });
});
