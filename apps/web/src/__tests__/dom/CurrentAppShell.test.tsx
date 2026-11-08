import { describe, expect, it } from '@jest/globals';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { installFetch, json } from './harness';

const observedBody = {
  success: true,
  bodyVersion: 'omega.fullstack.body.v1',
  status: 'VERIFIED',
  layers: {
    sensory: { status: 'OBSERVED' },
    verification: { status: 'VERIFIED' },
    memory: { status: 'INTEGRITY_VERIFIED' },
    mesh: { status: 'CONVERGED_PASS' },
    kernel: { status: 'READY' },
    governance: { status: 'HUMAN_GATE_REQUIRED' },
    interface: { status: 'READY' },
  },
  expansion: { bounded: true, readOnly: true, appendOnly: true },
};

describe('current OceanicOS app shell', () => {
  it('renders the whole-ecosystem surface without promoting unqueried sources to verified', async () => {
    const user = userEvent.setup();
    installFetch({
      '/api/v1/ecosystem/body': () => json(observedBody),
      '/api/v1/block/tip': () => json({ success: true, status: 'OK' }),
    });
    render(<App />);

    const frontier = await screen.findByRole('region', { name: 'Compressed whole ecosystem front view' });
    expect(within(frontier).getByText('BODY · VERIFIED')).toBeInTheDocument();
    expect(within(frontier).getByText('7 layers')).toBeInTheDocument();
    expect(within(frontier).getByText('verification')).toBeInTheDocument();
    expect(within(frontier).getByText('REST reachable · SSE pending')).toBeInTheDocument();
    expect(within(frontier).getByText(/not an external-world scan/i)).toBeInTheDocument();
    expect(within(frontier).getByRole('button', { name: /open background full-stack/i })).toHaveAttribute('aria-expanded', 'false');

    await user.click(within(frontier).getByRole('button', { name: /open background full-stack/i }));
    const dashboard = await screen.findByRole('region', { name: 'Whole ecosystem command surface' });
    expect(within(dashboard).getByRole('img', { name: /conceptual OCEANICOS system map/i })).toBeInTheDocument();
    expect(within(dashboard).getByText(/relationships shown, not live topology/i)).toBeInTheDocument();
    expect(within(dashboard).getByText(/1 of 5 listed signals are marked VERIFIED in this view/i)).toBeInTheDocument();
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
});
