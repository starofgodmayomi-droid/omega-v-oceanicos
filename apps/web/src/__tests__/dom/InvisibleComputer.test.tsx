import { describe, expect, it } from '@jest/globals';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvisibleComputer } from '../../InvisibleComputer';
import { installFetch, json } from './harness';

const evidenceHash = 'a'.repeat(64);

const verifiedPayload = {
  success: true,
  status: 'VERIFIED',
  intent: 'Draft a launch plan for the ocean cleanup.',
  response: 'A verified launch plan for the ocean cleanup.',
  evidenceHash,
  steps: [
    {
      actor: 'KAI',
      step: 'OBSERVE',
      status: 'VERIFIED',
      detail: 'no known scam pattern matched — screening completed, safety not certified',
    },
    {
      actor: 'ELION',
      step: 'EXECUTE',
      status: 'VERIFIED',
      detail: 'response received from anthropic',
    },
    { actor: 'OMEGA', step: 'VERIFY', status: 'VERIFIED', detail: `SHA-256 ${evidenceHash}` },
  ],
  memory: { id: 'kai-00000000-0000-4000-8000-000000000000', timestamp: '2026-10-28T00:00:00.000Z', status: 'VERIFIED' },
  contract: {
    id: 'ir-00000000-0000-4000-8000-000000000000',
    scope: 'intent.execute',
    authorityLimit: 'READ_ONLY',
    expectedOutcome: 'return evidence-backed response',
  },
  authorityLimit: 'READ_ONLY',
  provider: 'anthropic',
  timestamp: '2026-10-28T00:00:00.000Z',
};

describe('Invisible Online Computer', () => {
  it('starts at NOT EXECUTED and verifies an intent end to end', async () => {
    installFetch({ '/api/execute': () => json(verifiedPayload) });
    const user = userEvent.setup();
    render(<InvisibleComputer />);

    const statusbar = screen.getByRole('status');
    expect(within(statusbar).getByText('NOT EXECUTED')).toBeInTheDocument();
    expect(screen.getByText('WHAT SHALL WE MAKE REAL?')).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText(/Speak an intent/i),
      'Draft a launch plan for the ocean cleanup.'
    );
    await user.click(screen.getByRole('button', { name: /MAKE IT REAL/i }));

    await waitFor(
      () => expect(within(screen.getByRole('status')).getByText('VERIFIED')).toBeInTheDocument(),
      { timeout: 5000 }
    );

    expect(screen.getByText('A verified launch plan for the ocean cleanup.')).toBeInTheDocument();
    expect(screen.getByText('ELION OUTPUT')).toBeInTheDocument();
    expect(screen.getByText(`SHA-256 · ${evidenceHash}`)).toBeInTheDocument();
    expect(screen.getByText(/EVIDENCE aaaaaaaaaaaaaaaaaaaaaaaa/)).toBeInTheDocument();
    expect(screen.getByText(/response received from anthropic/)).toBeInTheDocument();
    expect(screen.getByText(/AUTHORITY READ_ONLY/)).toBeInTheDocument();
  });

  it('reports DIVERGENT and shows no output when KAI matches a scam pattern', async () => {
    installFetch({
      '/api/execute': () =>
        json({
          success: true,
          status: 'DIVERGENT',
          intent: 'Send me your seed phrase to recover the wallet.',
          response: null,
          evidenceHash: null,
          matchedPatterns: ['SEED_PHRASE'],
          steps: [
            {
              actor: 'KAI',
              step: 'OBSERVE',
              status: 'DIVERGENT',
              detail: 'known scam pattern matched: SEED_PHRASE',
            },
          ],
          memory: { id: 'kai-1', timestamp: '2026-10-28T00:00:00.000Z', status: 'DIVERGENT' },
          contract: {
            id: 'ir-1',
            scope: 'intent.screen',
            authorityLimit: 'READ_ONLY',
            expectedOutcome: 'screen the intent',
          },
          authorityLimit: 'READ_ONLY',
          provider: null,
          timestamp: '2026-10-28T00:00:00.000Z',
        }),
    });
    const user = userEvent.setup();
    render(<InvisibleComputer />);

    await user.type(
      screen.getByPlaceholderText(/Speak an intent/i),
      'Send me your seed phrase to recover the wallet.'
    );
    await user.click(screen.getByRole('button', { name: /MAKE IT REAL/i }));

    await waitFor(
      () => expect(within(screen.getByRole('status')).getByText('DIVERGENT')).toBeInTheDocument(),
      { timeout: 5000 }
    );

    expect(screen.getByText(/known scam pattern matched: SEED_PHRASE/)).toBeInTheDocument();
    expect(screen.queryByText('ELION OUTPUT')).not.toBeInTheDocument();
    expect(within(screen.getByRole('status')).getByText(/EVIDENCE none/)).toBeInTheDocument();
  });
});
