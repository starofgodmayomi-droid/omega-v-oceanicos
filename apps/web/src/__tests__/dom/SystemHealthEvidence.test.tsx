import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { SystemHealthPanel } from '../../SystemHealthPanel';
import { installFetch, json } from './harness';

const healthSnapshot = (overrides: Record<string, unknown> = {}) => ({
  status: 'ok',
  service: 'omega-v-oceanicos-api',
  readiness: 'degraded',
  checks: {
    observer: 'ready',
    verifier: 'ready',
    attester: 'degraded',
    memory: { status: 'ready', integrity: true, height: 9, encryption: 'disabled' },
    persistence: {
      mode: 'file',
      source: 'restored',
      keySource: 'current',
      currentKeyFingerprint: 'sha256:current-fingerprint',
      previousKeyFingerprint: 'sha256:previous-fingerprint',
      previousKeyConfigured: true,
      eventLogSource: 'restored',
      eventLogReason: 'Recovered 3 entries from an encrypted snapshot after restart',
      eventLogKeySource: 'mixed',
      rotationPending: true,
      operatorAction: 'review-key-rotation',
      skippedLogEntries: 3,
      recoveryPolicy: {
        mode: 'manual-restore',
        reference: 'runbook://recovery/manual-restore',
        reason: 'manual approval remains required',
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
          { name: 'snapshot', encryption: 'aes-256-gcm', keySource: 'current', evidence: 'observed' },
        ],
        unverifiedSurfaces: ['event-log-backfill'],
        unverifiedReasons: ['backfill window not yet observed'],
      },
    },
  },
  policy: {
    authMode: 'token',
    readAuthConfigured: true,
    adminAuthConfigured: false,
    revocationEnabled: true,
    persistenceEncryption: 'aes-256-gcm',
  },
  timestamp: '2026-10-18T00:00:00.000Z',
  ...overrides,
});

describe('system health evidence', () => {
  it('renders structured degraded evidence returned with HTTP 503 instead of discarding it', async () => {
    installFetch({ '/api/health': () => json(healthSnapshot(), { status: 503 }) });

    render(<SystemHealthPanel />);

    expect(await screen.findByText('DEGRADED')).toBeInTheDocument();
    expect(screen.getByText(/Current key fingerprint: sha256:current-fingerprint/)).toBeInTheDocument();
    expect(screen.getByText(/Previous key fingerprint: sha256:previous-fingerprint/)).toBeInTheDocument();
    expect(screen.getByText(/Recovered 3 entries from an encrypted snapshot after restart/)).toBeInTheDocument();
    expect(screen.getByText(/Skipped log entries: 3/)).toBeInTheDocument();
    const declarations = screen.getByRole('group', { name: 'Persistence policy declarations' });
    expect(declarations.textContent).toContain('Deletion policy: secure-wipe');
    expect(declarations.textContent).toContain('API verified flag: false');
    expect(declarations.textContent).toContain('Coordination policy: single-node');
    expect(declarations.textContent).toContain('no cross-process coordination');
    expect(screen.getByText(/Coverage complete: no/)).toBeInTheDocument();
    expect(screen.getByText(/Unverified surfaces: event-log-backfill/)).toBeInTheDocument();
    const policySummary = screen.getByText('auth mode:').parentElement;
    expect(policySummary?.textContent).toContain('read access: configured');
    expect(policySummary?.textContent).toContain('admin access: not configured');
    expect(screen.queryByText(/HTTP 503/)).not.toBeInTheDocument();
  });

  it('keeps missing optional evidence explicitly unknown rather than inventing policy values', async () => {
    const sparse = healthSnapshot();
    const checks = sparse.checks as Record<string, any>;
    delete checks.persistence.previousKeyConfigured;
    delete checks.persistence.custodyPolicy;
    delete checks.persistence.unverifiedReasons;
    checks.persistence.currentKeyFingerprint = null;
    checks.persistence.previousKeyFingerprint = null;
    checks.persistence.coverage.unverifiedSurfaces = undefined;
    const policy = sparse.policy as Record<string, any>;
    delete policy.readAuthConfigured;
    delete policy.adminAuthConfigured;
    installFetch({ '/api/health': () => json({ ...sparse, readiness: 'ready' }) });

    render(<SystemHealthPanel />);

    expect(await screen.findByText('READY')).toBeInTheDocument();
    expect(screen.getByText(/Current key fingerprint: UNKNOWN/)).toBeInTheDocument();
    expect(screen.getByText(/Previous key configured: UNKNOWN/)).toBeInTheDocument();
    const declarations = screen.getByRole('group', { name: 'Persistence policy declarations' });
    expect(declarations.textContent).toContain('Key custody policy: UNKNOWN — field not supplied by API');
    expect(screen.getByText(/Unverified surfaces: UNKNOWN — not supplied by API/)).toBeInTheDocument();
    const policySummary = screen.getByText('auth mode:').parentElement;
    expect(policySummary?.textContent).toContain('read access: UNKNOWN — field not supplied by API');
    expect(policySummary?.textContent).toContain('admin access: UNKNOWN — field not supplied by API');
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
  });
});
