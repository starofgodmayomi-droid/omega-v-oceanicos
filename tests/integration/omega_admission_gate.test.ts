import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  observeCandidateChange,
  resolveChangeAdmission,
} from '../../packages/mini/dist/index.js';

describe('Ω∞v admission gate', () => {
  it('denies when either upstream gate is not verified', () => {
    const record = observeCandidateChange({
      subject: 'admission-test',
      intent: 'exercise deny path',
      stateBefore: 'known-state',
    });

    const admitted = resolveChangeAdmission(
      {
        ...record,
        authority: 'authority-proof-ref',
        policy: 'policy-proof-ref',
      },
      { authorityVerified: true, policySatisfied: false },
    );

    assert.strictEqual(admitted.decision, 'DENY');
    assert.strictEqual(admitted.authorized, false);
  });

  it('allows only when evidence, authority, and policy gates are explicit', () => {
    const record = observeCandidateChange({
      subject: 'admission-test',
      intent: 'exercise allow path',
      stateBefore: 'known-state',
    });

    const admitted = resolveChangeAdmission(
      {
        ...record,
        authority: 'authority-proof-ref',
        policy: 'policy-proof-ref',
      },
      { authorityVerified: true, policySatisfied: true },
    );

    assert.strictEqual(admitted.decision, 'ALLOW');
    assert.strictEqual(admitted.authorized, true);
    assert.strictEqual(admitted.transition, undefined);
    assert.strictEqual(admitted.stateAfter, undefined);
  });

  it('fails closed to REVIEW when references are incomplete', () => {
    const record = observeCandidateChange({
      subject: 'admission-test',
      intent: 'exercise incomplete evidence path',
      stateBefore: 'known-state',
    });

    const admitted = resolveChangeAdmission(
      { ...record, authority: 'authority-proof-ref', policy: null },
      { authorityVerified: true, policySatisfied: true },
    );

    assert.strictEqual(admitted.decision, 'REVIEW');
    assert.strictEqual(admitted.authorized, false);
  });
});
