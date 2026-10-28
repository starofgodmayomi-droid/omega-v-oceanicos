import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SingleBodyPanel } from '../../SingleBodyPanel';

const fixture = {
  compression: {
    space: { notation: '4×4×4×4', rank: 4, shape: [4, 4, 4, 4], capacity: 256 },
    projection: 'body.layers.v1',
    count: 2,
    filled: 2,
    empty: 254,
    digest: 'a'.repeat(64),
    cells: [
      {
        address: [0, 0, 0, 1],
        key: 'reality/sense/runtime/SUPPORTED',
        digest: 'b'.repeat(64),
        entries: [{ index: 0, id: 'sensory', name: 'Sensory runtime', source: 'observer-runtime', status: 'OBSERVED' }],
      },
      {
        address: [2, 1, 0, 0],
        key: 'evidence/verify/runtime/VERIFIED',
        digest: 'c'.repeat(64),
        entries: [{ index: 1, id: 'verification', name: 'Verification receipt', source: 'declarative-verification', status: 'VERIFIED' }],
      },
    ],
    expansion: { status: 'VERIFIED', entries: 2, digestMatches: true, lossless: true },
  },
};

describe('single body 4×4×4×4 panel', () => {
  it('draws every address and reports the observed compression, not a guess', () => {
    const { container } = render(<SingleBodyPanel body={fixture} />);

    expect(screen.getByText(/2 records in 2 cells · 254 empty/)).toBeInTheDocument();
    expect(screen.getByText(/ROUND TRIP VERIFIED/)).toBeInTheDocument();
    // 4 layers × 4 organs × 4 forms; evidence is the fourth pip in each cell.
    expect(container.querySelectorAll('.single-body-cell')).toHaveLength(64);
    expect(container.querySelectorAll('.single-body-cell.is-filled')).toHaveLength(2);
    expect(screen.getByText('reality/sense/runtime/SUPPORTED')).toBeInTheDocument();
  });

  it('expands through the API and shows the restored records', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        status: 'EXPANDED',
        entries: [
          { index: 0, id: 'sensory', name: 'Sensory runtime', source: 'observer-runtime', status: 'OBSERVED' },
          { index: 1, id: 'verification', name: 'Verification receipt', source: 'declarative-verification', status: 'VERIFIED' },
        ],
        digestMatches: true,
      }),
    }));
    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
    const user = userEvent.setup();
    render(<SingleBodyPanel body={fixture} />);

    await user.click(screen.getByRole('button', { name: 'EXPAND' }));

    expect(await screen.findByText('Verification receipt')).toBeInTheDocument();
    expect(screen.getByText(/restored by API/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { method?: string }];
    expect(url).toContain('/v1/ecosystem/body/expand');
    expect(init.method).toBe('POST');
  });

  it('states UNKNOWN rather than inventing a body it has not observed', () => {
    render(<SingleBodyPanel body={null} />);

    expect(screen.getByText(/ROUND TRIP UNKNOWN/)).toBeInTheDocument();
    expect(screen.getByText(/No compressed body observed/)).toBeInTheDocument();
  });
});
