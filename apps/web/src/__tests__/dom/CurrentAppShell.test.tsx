import { describe, expect, it, jest } from '@jest/globals';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { WorkerCoordinationPanel } from '../../WorkerCoordinationPanel';
import { installFetch, json, type FakeResponse } from './harness';

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

  it('renders the worker API contract without claiming inaccessible lease details', async () => {
    installFetch({
      '/api/v1/omega/workers': () =>
        json({
          success: true,
          activeWorkers: [{
            workerId: 'worker-a',
            capabilities: ['FILE_READ', 'VERIFY'],
            status: 'BUSY',
            lastHeartbeatAt: '2026-11-14T02:00:00.000Z',
            leaseCount: 1,
          }],
        }),
    });
    render(<WorkerCoordinationPanel />);

    const panel = await screen.findByRole('region', { name: 'Worker coordination observation' });
    expect(await within(panel).findByText('OBSERVED')).toBeInTheDocument();
    expect(within(panel).getByText('worker-a')).toBeInTheDocument();
    expect(within(panel).getByText(/capabilities: FILE_READ, VERIFY/)).toBeInTheDocument();
    expect(within(panel).getByText('Recorded lease count').parentElement).toHaveTextContent('1');
    expect(within(panel).queryByText(/role: UNKNOWN|LEASED/)).not.toBeInTheDocument();
  });

  it('marks a malformed worker response DIVERGENT instead of observing an empty fleet', async () => {
    installFetch({
      '/api/v1/omega/workers': () => json({ success: true, activeWorkers: [{ workerId: 'worker-a' }] }),
    });
    render(<WorkerCoordinationPanel />);

    const panel = await screen.findByRole('region', { name: 'Worker coordination observation' });
    expect(await within(panel).findByText(/DIVERGENT · worker response does not match the expected schema/)).toBeInTheDocument();
    expect(within(panel).queryByText('No worker instances observed.')).not.toBeInTheDocument();
  });

  it('does not overlap worker refreshes while an earlier observation is pending', async () => {
    let poll: (() => void) | undefined;
    let resolveFirst: ((response: FakeResponse) => void) | undefined;
    let calls = 0;
    const intervalSpy = jest.spyOn(window, 'setInterval').mockImplementation((callback, delay) => {
      if (delay === 10000 && typeof callback === 'function') poll = callback as () => void;
      return 1;
    });
    const fetchMock = installFetch({
      '/api/v1/omega/workers': () => {
        calls += 1;
        if (calls === 1) return new Promise<FakeResponse>((resolve) => { resolveFirst = resolve; });
        return json({ success: true, activeWorkers: [] });
      },
    });
    const { unmount } = render(<WorkerCoordinationPanel />);

    try {
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      expect(poll).toBeDefined();
      act(() => poll?.());
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveFirst?.(json({ success: true, activeWorkers: [] }));
      });
      expect(await screen.findByText('No worker instances observed.')).toBeInTheDocument();

      act(() => poll?.());
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    } finally {
      unmount();
      intervalSpy.mockRestore();
    }
  });
});
