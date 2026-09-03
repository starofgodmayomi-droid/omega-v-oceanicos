import { render, screen, within, act } from '@testing-library/react';
import { App } from '../../App';
import { installFetch, json } from './harness';

/**
 * The runtime-health metrics row (`section.metrics-row`) reads a large,
 * mostly-optional `checks.persistence` object off `/api/health` and a
 * `RuntimePolicy` off `/api/attest/policy`, then renders roughly twenty
 * independent "evidence present vs. evidence absent" fallbacks: rotation
 * pending vs. current, a recorded reason vs. none, a key fingerprint vs.
 * none, an acknowledgement vs. none, and so on.
 *
 * Every other test in this suite either omits `checks.persistence` entirely
 * (the default fixture) or supplies a single flat `attestationTtlMs`/`policy`
 * pair, so the "operator actually did something and the API says so" side of
 * every one of those ternaries was untested: an operator who acknowledged a
 * partial recovery, or a re-encryption job that ran, or a rotation still
 * pending, would render identically to an operator who did nothing, and
 * nothing here would fail. These tests supply the full evidence shape once,
 * and the sparse/alternate shape once, so both sides of each fallback are
 * pinned to real rendered text rather than to whichever fallback happens to
 * be the default.
 */

const metricsRow = (): HTMLElement => document.querySelector('.metrics-row') as HTMLElement;

/** All `<strong>` values for a given `<span>` label, in document order. */
const valuesFor = (label: string): string[] =>
  within(metricsRow())
    .getAllByText(label)
    .map((span) => span.nextElementSibling?.textContent?.trim() ?? '');

const renderApp = async (): Promise<void> => {
  await act(async () => {
    render(<App />);
  });
};

describe('runtime health / persistence evidence panel', () => {
  beforeEach(() => {
    installFetch();
  });

  it('renders every persistence, revocation, and policy field when the API reports operator activity', async () => {
    installFetch({
      '/api/state': () =>
        json({
          data: {
            mode: 'observe',
            trust: 0.72,
            trustBasis: {
              evidenceQuality: 0.72,
              verificationCoverage: 1,
              attestationValidity: 1,
              serviceReadiness: 0,
              recentFailures: 1,
            },
            persistence: 'file',
            attestationTtlMs: null,
            services: [{ status: 'ready' }, { status: 'degraded' }],
          },
        }),
      '/api/health': () =>
        json({
          data: {
            status: 'ok',
            readiness: 'degraded',
            checks: {
              memory: { integrity: true },
              persistence: {
                eventLogSource: 'restored',
                eventLogReason: 'Recovered 3 entries from an encrypted snapshot after restart',
                eventLogKeySource: 'mixed',
                currentKeyFingerprint: 'sha256:current-fingerprint',
                previousKeyFingerprint: 'sha256:previous-fingerprint',
                rotationPending: true,
                operatorAction: 'review-key-rotation',
                acknowledgement: {
                  operatorId: 'operator-primary',
                  reason: 'Partial recovery reviewed and accepted',
                  action: 'acknowledge-partial-recovery',
                  acknowledgedAt: '2026-08-16T09:00:00.000Z',
                  requestId: 'req-ack-1',
                },
                reencrypt: {
                  operatorId: 'operator-primary',
                  reason: 'Scheduled key rotation',
                  action: 'reencrypt',
                  reencryptedAt: '2026-08-16T09:05:00.000Z',
                  requestId: 'req-reenc-1',
                  snapshotRecords: 8,
                  eventRecords: 21,
                  snapshotKeySource: 'current',
                  eventLogKeySource: 'current',
                },
                reencryptionRecovery: { status: 'blocked', reason: 'manual review required' },
                recoveryPolicy: {
                  mode: 'manual-restore',
                  reference: 'runbook://recovery/manual-restore',
                  reason: null,
                },
                deletionPolicy: {
                  mode: 'secure-wipe',
                  reason: 'awaiting third-party audit sign-off',
                  verified: false,
                },
                custodyPolicy: {
                  mode: 'split-key',
                  reference: 'runbook://custody/split-key',
                  reason: 'dual control required for recovery',
                  verified: false,
                },
                coordinationPolicy: {
                  mode: 'single-node',
                  reference: 'runbook://coordination/single-node',
                  reason: 'no distributed lock manager is deployed',
                  evidence: 'runtime-observed',
                  scope: 'single-process',
                  limitations: ['no cross-process coordination', 'no leader election'],
                  verified: false,
                },
                coverage: {
                  complete: false,
                  surfaces: [
                    {
                      name: 'snapshot',
                      encryption: 'aes-256-gcm',
                      keySource: 'current',
                      evidence: 'observed',
                    },
                  ],
                  unverifiedSurfaces: ['event-log-backfill'],
                  unverifiedReasons: ['backfill window not yet observed'],
                },
                skippedLogEntries: 3,
              },
            },
          },
        }),
      '/api/attest/revocations': () =>
        json({
          data: [],
          meta: { integrity: 'intact', digest: 'sha256:revocation-digest', revision: 4 },
        }),
      '/api/attest/policy': () =>
        json({
          data: {
            attestationAlgorithm: 'Ed25519',
            attestationTtlMs: null,
            // authMode intentionally omitted: the panel must fall back to
            // 'unknown' rather than crash on a missing field.
            readAuthConfigured: true,
            adminAuthConfigured: true,
            adminOperatorAllowlistConfigured: true,
            adminOperatorAllowlistRequired: true,
            revocationEnabled: false,
            persistenceEncryption: 'aes-256-gcm',
            persistenceEncryptionKeySource: 'current',
            persistencePreviousKeyConfigured: true,
            memoryEncryption: 'aes-256-gcm',
          },
        }),
    });

    await renderApp();
    // Settle on evidence unique to this fixture, not on any of the "no data
    // yet" defaults every field starts from.
    await screen.findByText('REVIEW-KEY-ROTATION');

    expect(valuesFor('STATE READINESS')).toEqual(['DEGRADED']);
    expect(valuesFor('EVENT LOG')).toEqual(['RESTORED / 3', 'RESTORED / 3 SKIPPED']);
    expect(valuesFor('LOG REASON')).toEqual([
      'Recovered 3 entries from an encrypted snapshot after restart',
    ]);
    expect(valuesFor('LOG KEY')).toEqual(['MIXED', 'MIXED']);
    expect(valuesFor('ROTATION')).toEqual(['PENDING']);
    expect(valuesFor('ACTION')).toEqual(['REVIEW-KEY-ROTATION']);
    expect(valuesFor('SECURE DELETION')).toEqual([
      'SECURE-WIPE / VERIFIED=false / awaiting third-party audit sign-off',
    ]);
    expect(valuesFor('KEY CUSTODY')).toEqual([
      'SPLIT-KEY / runbook://custody/split-key / VERIFIED=false / dual control required for recovery',
    ]);
    expect(valuesFor('COORDINATION')).toEqual([
      'SINGLE-NODE / single-process / runtime-observed / VERIFIED=false / no distributed lock manager is deployed / LIMITS=no cross-process coordination | no leader election',
    ]);
    expect(valuesFor('AT-REST COVERAGE')).toEqual([
      'snapshot:aes-256-gcm / UNVERIFIED: event-log-backfill / WHY: backfill window not yet observed',
    ]);
    expect(valuesFor('KEY IDENTITY')).toEqual([
      'sha256:current-fingerprint / sha256:previous-fingerprint / UNVERIFIED LOCAL',
    ]);
    expect(valuesFor('ACKNOWLEDGED')).toEqual(['operator-primary / ACKNOWLEDGE-PARTIAL-RECOVERY']);
    expect(valuesFor('REENCRYPTED')).toEqual(['8 SNAPSHOT / 21 EVENTS / operator-primary']);
    expect(valuesFor('RECOVERY POLICY')).toEqual([
      'MANUAL-RESTORE / runbook://recovery/manual-restore / DECLARATION ONLY',
    ]);
    // reencryptionRecovery.status === 'blocked': the row is rendered, and it
    // is rendered in the 'red' warning state rather than 'green'.
    const rotationRecoveryLabel = within(metricsRow()).getByText('ROTATION RECOVERY');
    const rotationRecoveryValue = rotationRecoveryLabel.nextElementSibling as HTMLElement;
    expect(rotationRecoveryValue.textContent).toBe('BLOCKED');
    expect(rotationRecoveryValue.className).toBe('red');
    expect(valuesFor('REVOCATION INTEGRITY')).toEqual(['INTACT']);
    // revocationEnabled: false, adminOperatorAllowlistRequired: true.
    expect(valuesFor('POLICY')).toEqual(['NO REVOCATION / ADMIN / ALLOWLIST REQUIRED']);
    // authMode omitted from the fixture on purpose: must fall back, not crash.
    expect(valuesFor('AUTH MODE')).toEqual(['UNKNOWN']);
    expect(valuesFor('PERSISTENCE KEY')).toEqual(['CURRENT / PREVIOUS']);
  });

  it('falls back to the absent-evidence text for every optional persistence and policy field', async () => {
    installFetch({
      '/api/health': () =>
        json({
          data: {
            status: 'ok',
            readiness: 'ready',
            checks: {
              memory: { integrity: true },
              persistence: {
                eventLogSource: 'partial',
                eventLogReason: null,
                eventLogKeySource: 'none',
                currentKeyFingerprint: null,
                previousKeyFingerprint: null,
                rotationPending: false,
                operatorAction: 'none',
                acknowledgement: null,
                reencrypt: null,
                reencryptionRecovery: { status: 'none', reason: null },
                recoveryPolicy: { mode: 'none', reference: null, reason: null },
                deletionPolicy: { mode: 'none', reason: null, verified: false },
                custodyPolicy: { mode: 'none', reference: null, reason: null, verified: false },
                coordinationPolicy: {
                  mode: 'none',
                  reference: null,
                  reason: null,
                  evidence: 'runtime-observed',
                  scope: 'single-process',
                  limitations: [],
                  verified: false,
                },
                coverage: {
                  complete: false,
                  surfaces: [],
                  unverifiedSurfaces: [],
                  unverifiedReasons: [],
                },
                skippedLogEntries: 0,
              },
            },
          },
        }),
      '/api/attest/policy': () =>
        json({
          data: {
            attestationAlgorithm: 'HMAC-SHA256',
            attestationTtlMs: null,
            authMode: 'local',
            readAuthConfigured: false,
            adminAuthConfigured: false,
            adminOperatorAllowlistConfigured: true,
            adminOperatorAllowlistRequired: false,
            revocationEnabled: true,
            persistenceEncryption: 'disabled',
            persistenceEncryptionKeySource: 'none',
            persistencePreviousKeyConfigured: false,
            memoryEncryption: 'disabled',
          },
        }),
    });

    await renderApp();
    await screen.findByText('REVOCATION / LOCAL / IDENTITY OPTIONAL');

    expect(valuesFor('ROTATION')).toEqual(['CURRENT']);
    expect(valuesFor('SECURE DELETION')).toEqual(['NONE / VERIFIED=false / CAPABILITY ONLY']);
    expect(valuesFor('KEY CUSTODY')).toEqual([
      'NONE / NO REFERENCE / VERIFIED=false / DECLARATION ONLY',
    ]);
    expect(valuesFor('COORDINATION')).toEqual([
      'NONE / single-process / runtime-observed / VERIFIED=false / DECLARATION ONLY / LIMITS=',
    ]);
    expect(valuesFor('KEY IDENTITY')).toEqual(['NONE / NONE / UNVERIFIED LOCAL']);
    expect(valuesFor('RECOVERY POLICY')).toEqual(['NONE / NONE / DECLARATION ONLY']);
    // A LOG REASON row only exists when there is a reason to show.
    expect(within(metricsRow()).queryByText('LOG REASON')).not.toBeInTheDocument();
    // reencryptionRecovery.status === 'none': the row is omitted entirely.
    expect(within(metricsRow()).queryByText('ROTATION RECOVERY')).not.toBeInTheDocument();
    // acknowledgement/reencrypt both null: those rows are omitted too.
    expect(within(metricsRow()).queryByText('ACKNOWLEDGED')).not.toBeInTheDocument();
    expect(within(metricsRow()).queryByText('REENCRYPTED')).not.toBeInTheDocument();
    // eventLogSource === 'partial': the *second* EVENT LOG row (the one with
    // a className fallback) renders 'red' instead of 'green'. The first
    // EVENT LOG row carries no className at all.
    const [topEventLogValue, bottomEventLogValue] = within(metricsRow())
      .getAllByText('EVENT LOG')
      .map((span) => span.nextElementSibling as HTMLElement);
    expect(topEventLogValue.textContent).toBe('PARTIAL / 0');
    expect(bottomEventLogValue.textContent).toBe('PARTIAL / 0 SKIPPED');
    expect(bottomEventLogValue.className).toBe('red');
    // adminOperatorAllowlistRequired: false, adminOperatorAllowlistConfigured: true.
    expect(valuesFor('POLICY')).toEqual(['REVOCATION / LOCAL / IDENTITY OPTIONAL']);
    expect(valuesFor('PERSISTENCE KEY')).toEqual(['NONE']);
  });
});
