import { describe, expect, it } from '@jest/globals';
import type { OmegaConnectorDeclaration } from '../connector-admission';
import { admitOmegaConnector } from '../connector-admission';

const connector: OmegaConnectorDeclaration = {
  id: 'github.read-repository',
  version: '1.0.0',
  system: 'github',
  capability: 'read repository metadata',
  authRef: 'secret-ref:github-readonly',
  scope: ['repo:starofgodmayomi-droid/omega-v-oceanicos'],
  mode: 'read-only',
  policyRefs: ['policy:connector-read.v1'],
  stopCondition: 'stop after one bounded repository read',
  expectedObservation: 'repository metadata returned with source and timestamp',
  timeoutMs: 5000,
  maxAttempts: 1,
  rollbackSupported: false,
};

describe('Ω connector admission boundary', () => {
  it('admits a complete bounded declaration without executing it', () => {
    const result = admitOmegaConnector({
      connector,
      authorityVerified: true,
      policySatisfied: true,
      approvalVerified: false,
    });

    expect(result).toEqual({ decision: 'ADMIT', admitted: true, issues: [] });
  });

  it('denies when authority or policy evidence is absent', () => {
    const result = admitOmegaConnector({
      connector,
      authorityVerified: false,
      policySatisfied: true,
      approvalVerified: true,
    });

    expect(result.decision).toBe('DENY');
    expect(result.admitted).toBe(false);
    expect(result.issues).toContain('connector authority evidence is missing');
  });

  it('requires explicit approval for external-consequence connectors', () => {
    const result = admitOmegaConnector({
      connector: { ...connector, mode: 'external-consequence' },
      authorityVerified: true,
      policySatisfied: true,
      approvalVerified: false,
    });

    expect(result.decision).toBe('REVIEW');
    expect(result.admitted).toBe(false);
    expect(result.issues).toContain('external-consequence connector requires explicit approval evidence');
  });

  it('rejects incomplete bounds before any connector could run', () => {
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

    expect(result.decision).toBe('REVIEW');
    expect(result.admitted).toBe(false);
    expect(result.issues.length).toBeGreaterThanOrEqual(6);
  });
});
