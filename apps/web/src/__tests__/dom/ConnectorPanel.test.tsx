import { describe, expect, it } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectorPanel } from '../../ConnectorPanel';
import { installFetch, json } from './harness';

const deniedObservation = {
  status: 'NOT_EXECUTED' as const,
  authorized: false,
  executed: false,
  observed: false,
  expectedObservation: 'github:starofgodmayomi-droid/omega-v-oceanicos:metadata',
  evidence: 'connector authority evidence is missing',
  issues: ['connector authority evidence is missing'],
  observedAt: '2026-10-16T03:15:00.000Z',
  admission: { decision: 'DENY', admitted: false },
  liveAdapter: null,
};

function observeBodies(fetchMock: { mock: { calls: unknown[][] } }): Record<string, unknown>[] {
  return fetchMock.mock.calls
    .filter((call) => String(call[0]).includes('/v1/omega/connectors/observe'))
    .map((call) => JSON.parse(String((call[1] as RequestInit).body)) as Record<string, unknown>);
}

describe('connector observation panel', () => {
  it('renders the count from the API entries envelope', async () => {
    installFetch({
      '/api/v1/omega/connectors/observations': () =>
        json({
          success: true,
          entries: [
            {
              id: 'connector-observation-dom-test',
              status: 'NOT_EXECUTED',
              authorized: false,
              executed: false,
              observed: false,
              expectedObservation: 'read-only repository metadata',
              evidence: 'No connector execution was performed.',
              issues: [],
              observedAt: '2026-10-15T00:00:00.000Z',
              admission: { decision: 'REVIEW', admitted: false },
            },
          ],
          total: 1,
          truncated: false,
          integrity: 'verified-local-hash-chain',
          limitation: 'local journal only',
        }),
    });
    render(<ConnectorPanel />);

    expect(
      await screen.findByText('memory 1 · in-process only · not deployment · not revenue')
    ).toBeInTheDocument();
  });

  it('records an observation without sending client admission evidence', async () => {
    const fetchMock = installFetch({
      '/api/v1/omega/connectors/observe': () => json(deniedObservation),
    });
    const user = userEvent.setup();
    render(<ConnectorPanel />);

    await screen.findByText('memory 0 · in-process only · not deployment · not revenue');
    await user.click(screen.getByRole('button', { name: 'RECORD DECLARATION' }));

    expect(await screen.findByText(/admitted false/)).toBeInTheDocument();
    expect(screen.getByText('NOT_EXECUTED')).toBeInTheDocument();
    expect(screen.queryByText(/CONNECTOR_ADMISSION_EVIDENCE_NOT_ACCEPTED/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'LIVE GITHUB OBSERVE' }));

    await waitFor(() => expect(observeBodies(fetchMock)).toHaveLength(2));
    expect(screen.getByText('NOT_EXECUTED')).toBeInTheDocument();
    expect(screen.queryByText(/CONNECTOR_ADMISSION_EVIDENCE_NOT_ACCEPTED/)).not.toBeInTheDocument();

    const bodies = observeBodies(fetchMock);
    for (const body of bodies) {
      expect(body).not.toHaveProperty('authorityVerified');
      expect(body).not.toHaveProperty('policySatisfied');
      expect(body).not.toHaveProperty('approvalVerified');
      expect(body.connector).toMatchObject({ id: 'github.read-repository', mode: 'read-only' });
    }
    expect(bodies[0]).not.toHaveProperty('liveAdapter');
    expect(bodies[1]).toMatchObject({ liveAdapter: 'github-public-repository' });
  });
});