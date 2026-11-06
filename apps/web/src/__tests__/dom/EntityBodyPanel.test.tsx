import { describe, expect, it } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntityBodyPanel } from '../../EntityBodyPanel';
import { installFetch, json, type FakeResponse } from './harness';

const law = {
  success: true,
  engine: 'ΩVØØS',
  checksum_symbol: '30013030',
  statuses: ['VERIFIED', 'DIVERGENT', 'UNKNOWN'],
  emitted_statuses: ['DIVERGENT', 'UNKNOWN'],
  phases: [
    { name: 'SPROUT', min: 0 },
    { name: 'BLOOM', min: 0.25 },
    { name: 'PLATEAU', min: 0.55 },
    { name: 'WILT', min: 0.82 },
  ],
  ease_law: 'Ease(t) = (1 - cos(t * π)) / 2',
  receipt_fields: ['engine', 'status', 'phase_t', 'evidence_hash', 'action', 'reason', 'next_delta'],
  ledgerMutation: false,
  limitation:
    'A hash of a locally composed sentence is not an independent observation. VERIFIED is never emitted here.',
};

const receipt = {
  engine: 'ΩVØØS',
  status: 'DIVERGENT',
  phase_t: 0,
  evidence_hash: 'b'.repeat(64),
  action: 'HALT ⊢ DIVERGENT',
  reason: 'KAI Shield blocked this intent. Matched: urgent.',
  next_delta: 'Restate the intent without urgency, a money demand, a guarantee, or a secret.',
};

describe('ΩVØØS three-pane ocean surface', () => {
  it('loads the law, sends the intent, and renders the returned receipt', async () => {
    const fetchMock = installFetch();
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit): Promise<FakeResponse> => {
      if (init?.method === 'POST') {
        return json({ success: true, receipt, phase: 'SPROUT', ledgerMutation: false });
      }
      return json(law);
    });
    const user = userEvent.setup();
    render(<EntityBodyPanel />);

    expect(screen.getByRole('region', { name: 'ΩVØØS entity body' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/checksum 30013030/)).toBeInTheDocument());

    await user.type(
      screen.getByRole('textbox', { name: 'State an intent for the ΩVØØS entity' }),
      'urgent private key'
    );
    await user.click(screen.getByRole('button', { name: 'RECEIPT' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/ovoos/entity',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ intent: 'urgent private key', phaseT: 0 }),
        })
      );
    });

    expect(await screen.findByText('DIVERGENT')).toBeInTheDocument();
    expect(screen.getByText(receipt.evidence_hash)).toBeInTheDocument();
    expect(screen.getByText(receipt.reason)).toBeInTheDocument();
    expect(screen.getByText(/LEDGER MUTATION: FALSE · AUTHORIZED: FALSE/)).toBeInTheDocument();
  });
});
