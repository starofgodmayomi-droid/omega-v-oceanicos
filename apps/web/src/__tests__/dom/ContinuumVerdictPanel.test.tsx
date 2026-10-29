import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContinuumVerdictPanel, declaredDrops } from '../../ContinuumVerdictPanel';

const props = {
  streamConnected: true,
  ledgerIntegrity: { valid: true, height: 7 },
  ecosystemBody: { status: 'VERIFIED' },
};

const installFetch = (body: unknown, status = 200) => {
  const mock = jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: { get: () => null },
  }));
  (globalThis as unknown as { fetch: unknown }).fetch = mock;
  return mock;
};

describe('continuum verdict panel', () => {
  it('declares only what the screen holds, and nothing it does not', () => {
    const drops = declaredDrops({ streamConnected: false, ledgerIntegrity: null, ecosystemBody: undefined });

    expect(drops.map((drop) => drop.delta)).toEqual(['stream.connected', 'ledger.integrity', 'ecosystem.body']);
    // No ledger and no body observed: no evidence, so the operator answers UNKNOWN.
    expect(drops[1].evidence).toEqual([]);
    expect(drops[1].observed).toBeUndefined();
    expect(drops[2].evidence).toEqual([]);
  });

  it('posts the declared drops and renders the returned verdict', async () => {
    const fetchMock = installFetch({
      success: true,
      status: 'DIVERGENT',
      halted: true,
      memory: ['stream.connected'],
      scope: 'judgement of the supplied drops; no execution, observation, or persistence was performed',
      steps: [
        { index: 0, delta: 'stream.connected', verdict: 'VERIFIED', evidence: 'Expected ≡ Observed', admitted: true, memory: ['stream.connected'] },
        { index: 1, delta: 'ledger.integrity', verdict: 'DIVERGENT', evidence: 'Expected ≠ Observed', admitted: false, memory: ['stream.connected'] },
      ],
    });
    const user = userEvent.setup();
    render(<ContinuumVerdictPanel {...props} />);

    // One badge plus one state per declared drop.
    expect(screen.getAllByText('NOT RUN')).toHaveLength(4);
    await user.click(screen.getByRole('button', { name: 'RUN VERDICT' }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { method: string; body: string }];
    expect(url).toBe('/api/v1/omega/continuum');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body).drops).toHaveLength(3);

    // The badge once, plus the step whose expectation and observation differ.
    expect(await screen.findAllByText('DIVERGENT')).toHaveLength(2);
    expect(screen.getByText('Expected ≠ Observed')).toBeInTheDocument();
    expect(screen.getByText(/memory stream.connected/)).toBeInTheDocument();
    expect(screen.getByText(/no execution, observation, or persistence/)).toBeInTheDocument();
  });

  it('reports a refused verdict instead of inventing one', async () => {
    installFetch({ success: false, error: 'CONTINUUM_DROP_INVALID', detail: 'drops[0].delta must be a non-empty string' }, 400);
    const user = userEvent.setup();
    render(<ContinuumVerdictPanel {...props} />);

    await user.click(screen.getByRole('button', { name: 'RUN VERDICT' }));

    expect(await screen.findByText(/Verdict refused · drops\[0\]\.delta must be a non-empty string/)).toBeInTheDocument();
    expect(screen.getAllByText('NOT RUN')).toHaveLength(4);
  });
});
