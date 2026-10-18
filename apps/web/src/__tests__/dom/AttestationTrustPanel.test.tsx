import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { AttestationTrustPanel } from '../../AttestationTrustPanel';
import { installFetch, json } from './harness';

const policy = {
  success: true,
  policy: {
    authMode: 'required',
    revocationEnabled: true,
    revocationRevision: 1,
    revocationConsistency: 'single-process',
    attestationAlgorithm: 'HMAC-SHA256',
  },
};

const ledger = {
  success: true,
  data: [
    {
      id: 'rev-1',
      attestationId: 'att-1',
      reason: 'stale evidence after review',
      revokedBy: 'operator-7',
      revokedAt: '2026-10-18T10:30:00.000Z',
    },
  ],
  meta: { integrity: 'intact', revision: 1, consistency: 'single-process', verified: false },
};

describe('attestation trust panel', () => {
  it('renders exact API-reported policy and revocation ledger fields without overclaiming integrity', async () => {
    installFetch({
      '/api/attest/policy': () => json(policy),
      '/api/attest/revocations': () => json(ledger),
    });

    render(<AttestationTrustPanel />);

    expect(await screen.findByText('Attestation algorithm: HMAC-SHA256')).toBeInTheDocument();
    expect(screen.getByText('Auth mode: required')).toBeInTheDocument();
    expect(screen.getByText('Revocation enabled: enabled')).toBeInTheDocument();
    expect(screen.getByText('Revocation revision: 1')).toBeInTheDocument();
    const region = screen.getByRole('group', { name: 'API-reported revocation ledger' });
    expect(region.textContent).toContain('API-reported ledger integrity: intact');
    expect(region.textContent).toContain('Durable-store flag: not configured');
    expect(region.textContent).toContain('att-1');
    expect(region.textContent).toContain('stale evidence after review');
    expect(screen.getByText(/API-reported values are not independent cryptographic validation/)).toBeInTheDocument();
  });

  it('reports protected endpoint access denial without inferring policy or ledger contents', async () => {
    installFetch({
      '/api/attest/policy': () => json({ error: 'READ_ACCESS_REQUIRED' }, { status: 403 }),
      '/api/attest/revocations': () => json({ error: 'READ_ACCESS_REQUIRED' }, { status: 403 }),
    });

    render(<AttestationTrustPanel />);

    await screen.findAllByText(/Read access unavailable/);
    const policyGroup = screen.getByRole('group', { name: 'API-reported attestation policy' });
    const ledgerGroup = screen.getByRole('group', { name: 'API-reported revocation ledger' });
    expect(policyGroup.textContent).toContain('Read access unavailable');
    expect(ledgerGroup.textContent).toContain('Read access unavailable');
    expect(policyGroup.textContent).not.toContain('HMAC-SHA256');
    expect(ledgerGroup.textContent).not.toContain('att-1');
    expect(document.body.textContent).not.toContain('READ_ACCESS_REQUIRED');
  });
});