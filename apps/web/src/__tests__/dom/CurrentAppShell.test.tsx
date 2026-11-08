import { describe, expect, it } from '@jest/globals';
import { render, screen, waitFor, within } from '@testing-library/react';
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
    expect(within(receipt).getByText('Command Proposed — not executed')).toBeInTheDocument();
    expect(within(receipt).getByText('Map AI SOUL.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Tell me what you're trying to do…")).toHaveValue('');
    expect(workspace).toHaveStyle({ display: 'none' });

    await user.click(within(receipt).getByRole('button', { name: /review & authorize/i }));
    expect(workspace).toHaveStyle({ display: 'block' });
    await waitFor(() =>
      expect(document.activeElement).toBe(document.getElementById('intent-flow'))
    );
  });

  it('resumes the newest pending command the server still remembers after a reload', async () => {
    installFetch({
      '/api/v1/omega/commands?limit=20': () =>
        json({
          success: true,
          count: 2,
          commands: [
            { commandId: 'omega-done-2', status: 'VERIFIED', intent: 'Already proved.' },
            { commandId: 'omega-pending-1', status: 'AUTHORIZED', intent: 'Build the bridge.' },
          ],
        }),
      '/api/v1/omega/commands/omega-pending-1': () =>
        json({
          success: true,
          command: { commandId: 'omega-pending-1', status: 'AUTHORIZED', intent: 'Build the bridge.' },
          status: 'AUTHORIZED',
        }),
    });
    render(<App />);

    const receipt = await screen.findByRole('status', { name: 'Command receipt' });
    expect(within(receipt).getByText('Command Authorized — not executed')).toBeInTheDocument();
    expect(within(receipt).getByRole('button', { name: /review & execute/i })).toBeInTheDocument();
  });

  it('does not resurrect a command that has no next step', async () => {
    const fetchMock = installFetch({
      '/api/v1/omega/commands?limit=20': () =>
        json({
          success: true,
          count: 1,
          commands: [{ commandId: 'omega-done-1', status: 'VERIFIED', intent: 'Already proved.' }],
        }),
    });
    render(<App />);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/v1/omega/commands?limit=20', undefined)
    );
    expect(screen.queryByRole('status', { name: 'Command receipt' })).toBeNull();
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
