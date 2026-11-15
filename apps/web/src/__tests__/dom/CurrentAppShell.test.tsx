import { describe, expect, it } from '@jest/globals';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { installFetch, json } from './harness';

describe('current OceanicOS app shell', () => {
  it('renders the whole-ecosystem surface without promoting unqueried sources to verified', async () => {
    installFetch();
    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: /open background full-stack/i }));
    const dashboard = await screen.findByRole('region', { name: 'Whole ecosystem command surface' });
    expect(within(dashboard).getByRole('img', { name: /conceptual OCEANICOS system map/i })).toBeInTheDocument();
    expect(within(dashboard).getByText(/relationships shown, not live topology/i)).toBeInTheDocument();
    expect(within(dashboard).getByText(/0 of 5 listed signals are marked VERIFIED in this view/i)).toBeInTheDocument();
    expect(within(dashboard).getByText('hosted CI is not queried by this screen')).toBeInTheDocument();
    expect(within(dashboard).getByText('no external authority inferred')).toBeInTheDocument();
  });

  it('shows the command the front prompt created and opens the workspace on request', async () => {
    installFetch({
      '/api/v1/omega/commands': () =>
        json({
          success: true,
          command: { commandId: 'omega-front-receipt-1', status: 'PROPOSED', intent: 'Map AI SOUL.' },
          status: 'PROPOSED',
          nextAction: 'admit the command with explicit authority and policy evidence',
        }),
    });
    const user = userEvent.setup();
    render(<App />);

    const workspace = document.getElementById('background-full-stack-workspace');
    expect(workspace).not.toBeNull();
    expect(workspace).toHaveStyle({ display: 'none' });

    await user.type(
      screen.getByPlaceholderText("Tell me what you're trying to do…"),
      'Map AI SOUL.'
    );
    await user.click(screen.getByRole('button', { name: '→' }));

    const receipt = await screen.findByRole('status', { name: 'Command receipt' });
    expect(within(receipt).getByText('omega-front-receipt-1')).toBeInTheDocument();
    expect(within(receipt).getByText(/command proposed/i)).toBeInTheDocument();
    expect(workspace).toHaveStyle({ display: 'none' });

    await user.click(within(receipt).getByRole('button', { name: /review & authorize/i }));
    expect(workspace).toHaveStyle({ display: 'block' });
  });

  it('turns an organ choice into a draft prompt without submitting an action', async () => {
    const fetchMock = installFetch();
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /open background full-stack/i }));
    await user.click(await screen.findByRole('button', { name: /AI SOUL/i }));

    expect(screen.getByPlaceholderText("Tell me what you're trying to do…")).toHaveValue('Map AI SOUL.');
    expect(
      fetchMock.mock.calls.some(([, init]) => {
        const options = init as { method?: string } | undefined;
        return options?.method?.toUpperCase() === 'POST';
      })
    ).toBe(false);
  });

  it('runs the bounded scene locally and keeps the cosmological boundary visible', async () => {
    const user = userEvent.setup();
    installFetch({
      '/api/scene/simulate': () => ({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            id: 'scene-test',
            seed: 'test-scene',
            equation: 'DARKNESS→RETURN',
            states: ['darkness', 'return'],
            terminalState: 'return',
            trace: [
              { sequence: 0, state: 'darkness', from: null, to: 'darkness', transition: 'origin', status: 'observed', evidence: 'scene:darkness:one' },
              { sequence: 1, state: 'return', from: 'darkness', to: 'return', transition: 'advance', status: 'verified', evidence: 'scene:return:two' },
            ],
            branches: [{ id: 'branch-1', perspective: 'point-of-view-1', states: ['darkness', 'return'], terminalState: 'return' }],
            branchCount: 1,
            continuation: 'bounded-sample-of-infinite-potential',
            provenance: { source: 'local-simulation', ruleVersion: 'scene-equation.v2', deterministic: true, verified: false, note: 'Bounded symbolic perspectives only; this is not a claim about physical multiverses, cosmology, or consciousness.' },
          },
        }),
        text: async () => '',
        headers: { get: () => 'application/json' },
      }),
    });
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /open background full-stack/i }));
    await user.click(await screen.findByRole('button', { name: /run bounded scene/i }));

    expect(await screen.findByLabelText('terminal state return')).toBeInTheDocument();
    expect(screen.getByText(/not a claim about physical multiverses/i)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Scene trace' })).toBeInTheDocument();
  });
});
