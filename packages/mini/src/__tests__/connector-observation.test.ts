import { describe, expect, it } from '@jest/globals';
import type { OmegaConnectorDeclaration } from '../connector-admission';
import { admitOmegaConnector } from '../connector-admission';
import { executeAdmittedConnector, observeAdmittedConnector } from '../connector-observation';

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
  expectedObservation: 'github:starofgodmayomi-droid/omega-v-oceanicos:metadata',
  timeoutMs: 5000,
  maxAttempts: 1,
  rollbackSupported: false,
};

const now = () => '2026-09-29T03:40:00.000Z';

describe('Ω connector observation receipt', () => {
  it('keeps an admitted connector NOT_EXECUTED until a handler runs', async () => {
    const result = await executeAdmittedConnector({
      connector,
      authorityVerified: true,
      policySatisfied: true,
      approvalVerified: false,
      now,
    });

    expect(result.admission.admitted).toBe(true);
    expect(result.status).toBe('NOT_EXECUTED');
    expect(result.authorized).toBe(true);
    expect(result.executed).toBe(false);
    expect(result.observed).toBe(false);
    expect(result.verificationScope).toBe('admitted-connector-observation-only');
    expect(result.issues).toContain('connector was admitted but not executed');
  });

  it('does not invoke a handler when admission is denied', async () => {
    let called = false;
    const result = await executeAdmittedConnector({
      connector,
      authorityVerified: false,
      policySatisfied: true,
      approvalVerified: true,
      now,
      handler: () => {
        called = true;
        return { attempted: true, executed: true, actualObservation: connector.expectedObservation };
      },
    });

    expect(called).toBe(false);
    expect(result.admission.admitted).toBe(false);
    expect(result.status).toBe('NOT_EXECUTED');
    expect(result.executed).toBe(false);
    expect(result.actualObservation).toBeUndefined();
    expect(result.issues).toContain('connector is not admitted; execution is refused');
  });

  it('verifies only when expected observation matches actual observation', async () => {
    const result = await executeAdmittedConnector({
      connector,
      authorityVerified: true,
      policySatisfied: true,
      approvalVerified: false,
      now,
      handler: () => ({
        attempted: true,
        executed: true,
        actualObservation: 'github:starofgodmayomi-droid/omega-v-oceanicos:metadata',
      }),
    });

    expect(result.status).toBe('VERIFIED');
    expect(result.authorized).toBe(true);
    expect(result.executed).toBe(true);
    expect(result.observed).toBe(true);
    expect(result.evidence).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(result.issues).toEqual([]);
  });

  it('marks mismatched observations DIVERGENT', async () => {
    const result = await executeAdmittedConnector({
      connector,
      authorityVerified: true,
      policySatisfied: true,
      approvalVerified: false,
      now,
      handler: () => ({
        attempted: true,
        executed: true,
        actualObservation: 'github:other/repo:metadata',
      }),
    });

    expect(result.status).toBe('DIVERGENT');
    expect(result.executed).toBe(true);
    expect(result.observed).toBe(true);
  });

  it('keeps thrown handlers UNKNOWN rather than verified', async () => {
    const result = await executeAdmittedConnector({
      connector,
      authorityVerified: true,
      policySatisfied: true,
      approvalVerified: false,
      now,
      handler: () => {
        throw new Error('transport unavailable');
      },
    });

    expect(result.status).toBe('UNKNOWN');
    expect(result.executed).toBe(false);
    expect(result.issues).toContain('transport unavailable');
  });

  it('discards execution evidence supplied for an unadmitted connector', () => {
    const admission = admitOmegaConnector({
      connector,
      authorityVerified: false,
      policySatisfied: true,
      approvalVerified: true,
    });
    const result = observeAdmittedConnector({
      connector,
      admission,
      now,
      execution: {
        attempted: true,
        executed: true,
        actualObservation: connector.expectedObservation,
      },
    });

    expect(result.status).toBe('NOT_EXECUTED');
    expect(result.actualObservation).toBeUndefined();
    expect(result.executed).toBe(false);
  });
});
