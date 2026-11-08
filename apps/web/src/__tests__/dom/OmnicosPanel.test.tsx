import { describe, expect, it } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OmnicosPanel } from '../../OmnicosPanel';
import { installFetch, json } from './harness';

const HASH = 'b'.repeat(64);

describe('THE OMNICOS singularity eye', () => {
  it('renders the receipt the API returned and reports no connected tool', async () => {
    const fetchMock = installFetch({
      '/api/omnicos': () =>
        json({
          entity: 'THE_OMNICOS',
          tool_used: 'CODE',
          status: 'UNKNOWN',
          game_detected: false,
          phase_t: 0.35,
          evidence_hash: HASH,
          action: 'No tool called. BLOOM. Local composition of three ordered steps for: Draft the tide plan',
          next_delta: 'A local composition is not Expected ≡ Observed.',
        }),
    });
    const user = userEvent.setup();
    render(<OmnicosPanel />);

    await user.type(
      screen.getByRole('textbox', { name: 'OMNICOS intent' }),
      'Draft the tide plan'
    );
    await user.click(screen.getByRole('button', { name: 'OBSERVE' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/omnicos',
        expect.objectContaining({
          body: JSON.stringify({ intent: 'Draft the tide plan', phaseT: 0.35 }),
        })
      );
    });

    const receipt = await screen.findByTestId('omnicos-receipt');
    expect(receipt).toBeInTheDocument();
    expect(receipt.textContent).toContain('THE_OMNICOS');
    expect(receipt.textContent).toContain('CODE · no Glober tool connected');
    expect(receipt.textContent).toContain('UNKNOWN');
    expect(receipt.textContent).toContain(HASH);
    expect(receipt.textContent).toContain('Expected ≡ Observed');
    expect(receipt.textContent).not.toContain('VERIFIED');
  });
});
