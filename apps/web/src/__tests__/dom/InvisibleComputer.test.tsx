import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { InvisibleComputer } from '../../InvisibleComputer';
import { installFetch, json } from './harness';

const hash = 'a'.repeat(64);

const memoryEnvelope = (records: unknown[]) => () =>
  json({ success: true, total: records.length, records });

describe('ECHOFRAME memory ledger', () => {
  it('shows the contract each row was verified against, and NONE when unbound', async () => {
    installFetch({
      '/api/kai/memory?limit=5': memoryEnvelope([
        {
          id: 'mem-bound',
          timestamp: '2026-10-31T00:00:00.000Z',
          intent: 'bound probe',
          evidence_hash: hash,
          status: 'VERIFIED',
          contract_id: 'c0ffee12-3456-7890-abcd-ef1234567890',
          contract: {
            id: 'c0ffee12-3456-7890-abcd-ef1234567890',
            authority_level: 'READ_ONLY',
            expected_outcome: 'A bounded answer that states what was observed.',
          },
        },
        {
          id: 'mem-unbound',
          timestamp: '2026-10-30T00:00:00.000Z',
          intent: 'legacy probe',
          evidence_hash: hash,
          status: 'VERIFIED',
          contract_id: null,
          contract: null,
        },
      ]),
    });
    render(<InvisibleComputer />);

    expect(await screen.findByText('CONTRACT · READ_ONLY · c0ffee12')).toBeInTheDocument();
    expect(
      screen.getByText('EXPECTED · A bounded answer that states what was observed.')
    ).toBeInTheDocument();
    expect(screen.getByText('CONTRACT · NONE')).toBeInTheDocument();
  });
});
