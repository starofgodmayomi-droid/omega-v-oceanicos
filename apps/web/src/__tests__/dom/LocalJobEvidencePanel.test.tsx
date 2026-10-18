import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { LocalJobEvidencePanel } from '../../LocalJobEvidencePanel';
import { installFetch, json } from './harness';

const response = {
  success: true,
  jobs: [
    {
      id: 'job-observe-1',
      kind: 'synthetic-observe',
      state: 'succeeded',
      actor: 'operator-7',
      sourceUri: 'local://observations/one',
      workerId: 'worker-local-1',
      attempt: 1,
      createdAt: '2026-10-18T09:00:00.000Z',
      updatedAt: '2026-10-18T09:00:02.000Z',
      finishedAt: '2026-10-18T09:00:02.000Z',
      resultSummary: 'Observed a bounded fixture',
      errorClass: null,
      payloadDigest: 'sha256:fixture-digest',
      provenance: {
        source: 'api', actor: 'operator-7', requestId: 'request-8',
        correlationId: 'correlation-9', observedAt: '2026-10-18T09:00:02.000Z', schemaVersion: '1',
      },
    },
  ],
  ledger: {
    enabled: true,
    durable: true,
    source: 'file',
    encryption: 'aes-256-gcm',
    counts: { queued: 0, running: 0, succeeded: 1, failed: 0, unknown: 0 },
    recentWindow: 40,
  },
};

describe('read-only local job evidence panel', () => {
  it('renders job state, provenance, and ledger status without mutation controls', async () => {
    const fetchMock = installFetch({ '/api/jobs?limit=20': () => json(response) });

    render(<LocalJobEvidencePanel />);

    const region = screen.getByRole('region', { name: 'Read-only local job evidence' });
    expect(await screen.findByText('job-observe-1')).toBeInTheDocument();
    expect(region.textContent).toContain('succeeded: 1');
    const ledgerStatus = screen.getByRole('group', { name: 'Local job ledger status' });
    expect(ledgerStatus.textContent).toContain('Encryptionaes-256-gcm');
    expect(region.textContent).toContain('Result: Observed a bounded fixture');
    expect(region.textContent).toContain('Request ID: request-8');
    expect(region.textContent).toContain('Correlation ID: correlation-9');
    expect(screen.queryByRole('button', { name: /claim job|complete job|fail job|execute/i })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.every(([, init]) => !init?.method || init.method === 'GET')).toBe(true);
  });

  it('reports read access unavailable without leaking protected endpoint details', async () => {
    installFetch({ '/api/jobs?limit=20': () => json({ error: 'READ_ACCESS_REQUIRED' }, { status: 403 }) });

    render(<LocalJobEvidencePanel />);

    expect(await screen.findByText(/Read access unavailable/)).toBeInTheDocument();
    expect(screen.queryByText('job-observe-1')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain('READ_ACCESS_REQUIRED');
    expect(document.body.textContent).not.toContain('No job records returned');
  });

  it('distinguishes an explicitly disabled ledger from an empty ledger', async () => {
    installFetch({ '/api/jobs?limit=20': () => json({ error: 'LOCAL_JOB_LEDGER_DISABLED' }, { status: 503 }) });

    render(<LocalJobEvidencePanel />);

    expect(await screen.findByText(/LOCAL_JOB_LEDGER_DISABLED/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('No job records returned');
  });

  it('reports malformed or unavailable jobs payloads as unknown', async () => {
    installFetch({ '/api/jobs?limit=20': () => json({ success: true, jobs: [] }) });

    render(<LocalJobEvidencePanel />);

    expect(await screen.findByText(/Job evidence unavailable/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('No job records returned');
  });
});