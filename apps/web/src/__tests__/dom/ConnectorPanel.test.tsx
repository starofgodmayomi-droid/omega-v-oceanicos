import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { ConnectorPanel } from '../../ConnectorPanel';
import { installFetch, json } from './harness';

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
});
