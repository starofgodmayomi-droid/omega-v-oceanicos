import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryReconcile } from '../../MemoryReconcile';
import { installFetch, json } from './harness';

const RECONCILE_URL = '/api/kai/memory/mem-dom-1/reconcile';

const checks = (digestPassed: boolean) => [
  {
    id: 'PREIMAGE_SUPPLIED',
    label: 'The observed output was supplied for recomputation',
    passed: true,
    detail: '12 characters',
  },
  {
    id: 'DIGEST_MATCHES',
    label: 'SHA-256 of the output matches the remembered digest',
    passed: digestPassed,
    detail: digestPassed
      ? 'digest recomputed from the supplied output'
      : 'digest recomputed but did not match',
  },
  {
    id: 'CONTRACT_BOUND',
    label: 'The expectation the digest was verified against still exists',
    passed: true,
    detail: 'contract present',
  },
];

const renderSurface = () =>
  render(<MemoryReconcile memoryId="mem-dom-1" apiBaseUrl="/api" />);

describe('memory reconciliation control', () => {
  it('sends the supplied output and renders the server verdict VERIFIED', async () => {
    const fetchMock = installFetch({
      [RECONCILE_URL]: () =>
        json({
          success: true,
          status: 'VERIFIED',
          memory_id: 'mem-dom-1',
          evidence_hash: 'a'.repeat(64),
          contract_id: 'contract-dom-1',
          checks: checks(true),
          reason: null,
          evaluated_at: '2026-10-31T00:00:00.000Z',
        }),
    });
    const user = userEvent.setup();
    renderSurface();

    await user.click(screen.getByRole('button', { name: 'RECONCILE' }));
    await user.type(screen.getByLabelText('Output to reconcile'), 'stored output');
    await user.click(screen.getByRole('button', { name: 'RECOMPUTE DIGEST' }));

    expect(await screen.findByText('VERIFIED')).toBeInTheDocument();
    expect(
      screen.getByText(/SHA-256 of the output matches the remembered digest/)
    ).toBeInTheDocument();

    const [url, init] = fetchMock.mock.calls.at(-1) as [string, { method: string; body: string }];
    expect(url).toBe(RECONCILE_URL);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ output: 'stored output' });
  });

  it('renders DIVERGENT and the failing check when the digest does not match', async () => {
    installFetch({
      [RECONCILE_URL]: () =>
        json({
          success: true,
          status: 'DIVERGENT',
          memory_id: 'mem-dom-1',
          evidence_hash: 'a'.repeat(64),
          contract_id: 'contract-dom-1',
          checks: checks(false),
          reason: 'The supplied output does not reproduce the remembered digest.',
          evaluated_at: '2026-10-31T00:00:00.000Z',
        }),
    });
    const user = userEvent.setup();
    renderSurface();

    await user.click(screen.getByRole('button', { name: 'RECONCILE' }));
    await user.type(screen.getByLabelText('Output to reconcile'), 'tampered output');
    await user.click(screen.getByRole('button', { name: 'RECOMPUTE DIGEST' }));

    expect(await screen.findByText('DIVERGENT')).toBeInTheDocument();
    expect(
      screen.getByText('The supplied output does not reproduce the remembered digest.')
    ).toBeInTheDocument();
    expect(screen.getByText(/✕ SHA-256 of the output matches the remembered digest/)).toBeInTheDocument();
  });

  it('cannot be submitted without an output because the digest needs its preimage again', async () => {
    installFetch();
    const user = userEvent.setup();
    renderSurface();

    await user.click(screen.getByRole('button', { name: 'RECONCILE' }));
    expect(screen.getByRole('button', { name: 'RECOMPUTE DIGEST' })).toBeDisabled();

    await user.type(screen.getByLabelText('Output to reconcile'), 'x');
    expect(screen.getByRole('button', { name: 'RECOMPUTE DIGEST' })).toBeEnabled();
  });
});
