import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TensorDavVisualizer } from '../../components/TensorDavVisualizer';

describe('TensorDavVisualizer', () => {
  afterEach(() => {
    cleanup();
    delete (globalThis as unknown as { fetch?: unknown }).fetch;
  });

  it('renders a verified checksum and switches projections', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const size = Number(String(input).split('/').at(-1));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          status: 'VERIFIED',
          size,
          projection: { rows: size ** 2, columns: size ** 2 },
          values: Array.from({ length: size ** 2 }, () => Array.from({ length: size ** 2 }, () => 0)),
          invariants: { min: 0, max: 4 * (size - 1), mean: 2 * (size - 1), checksum: size === 4 ? 1536 : 12960 },
          sha256: 'a'.repeat(64),
        }),
      } as Response;
    });
    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;

    render(<TensorDavVisualizer />);
    expect(await screen.findByLabelText('SHA-256 verified')).toBeInTheDocument();
    expect(screen.getByText('1,536')).toBeInTheDocument();
    const cell0 = screen.getByLabelText('row 0, column 0, value 0 plus 0 plus 0 plus 0 equals 0');
    expect(cell0).toBeInTheDocument();

    await userEvent.click(cell0);
    expect(await screen.findByLabelText('Selected tensor coordinate')).toBeInTheDocument();
    expect(screen.getByText('T[0, 0, 0, 0]')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '6×6×6×6' }));
    await waitFor(() => expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('/api/tensor/6'));
    expect(await screen.findByText('Requested: 36 × 36 projection')).toBeInTheDocument();
    expect(screen.getByText('Observed receipt: 6×6×6×6 · 36×36 projection')).toBeInTheDocument();
    expect(screen.queryByLabelText('Selected tensor coordinate')).not.toBeInTheDocument();
  });

  it('keeps UNKNOWN visible and does not show a verified badge on API failure', async () => {
    (globalThis as unknown as { fetch: unknown }).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ success: false, status: 'UNKNOWN', error: 'UNKNOWN_TENSOR_SIZE' }),
    });
    render(<TensorDavVisualizer />);
    expect(await screen.findByRole('alert')).toHaveTextContent('UNKNOWN');
    expect(screen.queryByLabelText('SHA-256 verified')).not.toBeInTheDocument();
  });

  it('keeps a mismatched observed receipt divergent and unverified', async () => {
    (globalThis as unknown as { fetch: unknown }).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        status: 'VERIFIED',
        size: 4,
        projection: { rows: 16, columns: 16 },
        values: [[0]],
        invariants: { min: 0, max: 12, mean: 6, checksum: 1536 },
        sha256: 'b'.repeat(64),
      }),
    });
    render(<TensorDavVisualizer />);
    await userEvent.click(await screen.findByRole('button', { name: '6×6×6×6' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('DIVERGENT');
    expect(screen.getByRole('alert')).toHaveTextContent('RECEIPT_SIZE_MISMATCH');
    expect(screen.queryByLabelText('SHA-256 verified')).not.toBeInTheDocument();
  });
});
