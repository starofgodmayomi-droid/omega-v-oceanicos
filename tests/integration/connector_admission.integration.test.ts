import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { admitOmegaConnector } from '../../packages/mini/dist/index.js';

const connector = {
  id: 'github.read-repository',
  version: '1.0.0',
  system: 'github',
  capability: 'read repository metadata',
  authRef: 'secret-ref:github-readonly',
  scope: ['repo:starofgodmayomi-droid/omega-v-oceanicos'],
  mode: 'read-only' as const,
  policyRefs: ['policy:connector-read.v1'],
  stopCondition: 'stop after one bounded repository read',
  expectedObservation: 'repository metadata returned with source and timestamp',
  timeoutMs: 5000,
  maxAttempts: 1,
  rollbackSupported: false,
};

describe('Ω connector admission boundary', () => {
  it('admits complete bounded declarations without executing them', () => {
    const result = admitOmegaConnector({
      connector,
      authorityVerified: true,
      policySatisfied: true,
      approvalVerified: false,
    });

    assert.deepEqual(result, { decision: 'ADMIT', admitted: true, issues: [] });
  });

  it('denies when authority evidence is absent', () => {
    const result = admitOmegaConnector({
      connector,
      authorityVerified: false,
      policySatisfied: true,
      approvalVerified: true,
    });

    assert.equal(result.decision, 'DENY');
    assert.equal(result.admitted, false);
    assert.ok(result.issues.includes('connector authority evidence is missing'));
  });

  it('requires explicit approval for external-consequence connectors', () => {
    const result = admitOmegaConnector({
      connector: { ...connector, mode: 'external-consequence' },
      authorityVerified: true,
      policySatisfied: true,
      approvalVerified: false,
    });

    assert.equal(result.decision, 'REVIEW');
    assert.equal(result.admitted, false);
    assert.ok(result.issues.includes('external-consequence connector requires explicit approval evidence'));
  });

  it('fails closed on incomplete bounds', () => {
    const result = admitOmegaConnector({
      connector: {
        ...connector,
        authRef: '',
        scope: [],
        policyRefs: [],
        stopCondition: '',
        expectedObservation: '',
        timeoutMs: 0,
        maxAttempts: 0,
      },
      authorityVerified: true,
      policySatisfied: true,
      approvalVerified: true,
    });

    assert.equal(result.decision, 'REVIEW');
    assert.equal(result.admitted, false);
    assert.ok(result.issues.length >= 6);
  });

  it('rejects unbounded scope and inline secret-shaped auth references', () => {
    const result = admitOmegaConnector({
      connector: { ...connector, scope: ['*'], authRef: 'ghp_inline-secret-value' },
      authorityVerified: true,
      policySatisfied: true,
      approvalVerified: true,
    });

    assert.equal(result.decision, 'REVIEW');
    assert.equal(result.admitted, false);
    assert.ok(result.issues.includes('connector scope must not use an unbounded wildcard'));
    assert.ok(result.issues.includes('connector authRef must identify secret configuration without containing secret material'));
  });
});
