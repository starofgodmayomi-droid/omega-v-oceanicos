import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { installFetch, json } from './harness';

const COMMAND_ID = 'cmd-current-contract-1';
const EXPECTED_STATE = 'state-after-proposal';

const commandResponse = (status: string, terminalStatus?: 'VERIFIED' | 'UNKNOWN') => ({
  command: {
    commandId: COMMAND_ID,
    intent: 'Reconcile a bounded ecosystem proposal',
    status,
    change: {
      evidence: 'fixture-backed proposed change',
      stateBefore: 'state-before-proposal',
      stateAfter: EXPECTED_STATE,
    },
    workers: ['planner', 'tester'],
  },
  ...(terminalStatus
    ? {
        reality: {
          classification: terminalStatus,
          observedState: terminalStatus === 'VERIFIED' ? EXPECTED_STATE : 'unavailable',
          evidence:
            terminalStatus === 'VERIFIED'
              ? 'test fixture supplied matching observed state'
              : 'test fixture supplies no admissible observation',
        },
      }
    : {}),
});

const mountFlow = (terminalStatus: 'VERIFIED' | 'UNKNOWN') => {
  const fetchMock = installFetch({
    '/api/v1/omega/commands': () => json(commandResponse('PROPOSED')),
    [`/api/v1/omega/commands/${COMMAND_ID}/approve`]: () =>
      json(commandResponse('AUTHORIZED')),
    [`/api/v1/omega/commands/${COMMAND_ID}/execute`]: () =>
      json(commandResponse('EXECUTED')),
    [`/api/v1/omega/commands/${COMMAND_ID}/observe`]: () =>
      json(commandResponse(terminalStatus, terminalStatus)),
  });

  render(<App />);
  return fetchMock;
};

const propose = async () => {
  const user = userEvent.setup();
  const input = await screen.findByPlaceholderText("Tell me what you're trying to do…");
  await user.type(input, 'Reconcile a bounded ecosystem proposal');
  await user.keyboard('{Enter}');
  return user;
};

const lifecycleUrls = (fetchMock: ReturnType<typeof installFetch>) =>
  fetchMock.mock.calls
    .map(([input]) => String(input))
    .filter((url) => url.startsWith('/api/v1/omega/commands'));

describe('current command lifecycle contract', () => {
  it('requires authorization before execution and reconciles only after observation', async () => {
    const fetchMock = mountFlow('VERIFIED');
    const user = await propose();

    expect(await screen.findByRole('button', { name: 'Authorize' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Execute bounded action' })).not.toBeInTheDocument();
    expect(lifecycleUrls(fetchMock)).toEqual(['/api/v1/omega/commands']);

    await user.click(screen.getByRole('button', { name: 'Authorize' }));
    expect(await screen.findByRole('button', { name: 'Execute bounded action' })).toBeInTheDocument();
    expect(lifecycleUrls(fetchMock)).toEqual([
      '/api/v1/omega/commands',
      `/api/v1/omega/commands/${COMMAND_ID}/approve`,
    ]);

    await user.click(screen.getByRole('button', { name: 'Execute bounded action' }));
    expect(await screen.findByRole('button', { name: 'Observe & verify reality' })).toBeInTheDocument();
    expect(lifecycleUrls(fetchMock)).toEqual([
      '/api/v1/omega/commands',
      `/api/v1/omega/commands/${COMMAND_ID}/approve`,
      `/api/v1/omega/commands/${COMMAND_ID}/execute`,
    ]);

    await user.click(screen.getByRole('button', { name: 'Observe & verify reality' }));
    expect(await screen.findByText('✓ Change reconciled')).toBeInTheDocument();
    expect(screen.getByText('STATUS: VERIFIED')).toBeInTheDocument();
    expect(screen.getAllByText(EXPECTED_STATE).length).toBeGreaterThan(0);
    expect(lifecycleUrls(fetchMock)).toEqual([
      '/api/v1/omega/commands',
      `/api/v1/omega/commands/${COMMAND_ID}/approve`,
      `/api/v1/omega/commands/${COMMAND_ID}/execute`,
      `/api/v1/omega/commands/${COMMAND_ID}/observe`,
    ]);
  });

  it('preserves UNKNOWN when the observation does not support a verified outcome', async () => {
    const fetchMock = mountFlow('UNKNOWN');
    const user = await propose();

    await user.click(await screen.findByRole('button', { name: 'Authorize' }));
    await user.click(await screen.findByRole('button', { name: 'Execute bounded action' }));
    await user.click(await screen.findByRole('button', { name: 'Observe & verify reality' }));

    expect(await screen.findByText('? Change unknown')).toBeInTheDocument();
    expect(screen.getByText('STATUS: UNKNOWN')).toBeInTheDocument();
    expect(screen.queryByText('✓ Change reconciled')).not.toBeInTheDocument();
    expect(screen.getByText('unavailable')).toBeInTheDocument();
    expect(lifecycleUrls(fetchMock)).toEqual([
      '/api/v1/omega/commands',
      `/api/v1/omega/commands/${COMMAND_ID}/approve`,
      `/api/v1/omega/commands/${COMMAND_ID}/execute`,
      `/api/v1/omega/commands/${COMMAND_ID}/observe`,
    ]);
  });
});
