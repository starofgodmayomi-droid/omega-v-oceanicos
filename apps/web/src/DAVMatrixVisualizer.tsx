import { useEffect, useMemo, useState } from 'react';
import './DAVMatrixVisualizer.css';

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');
const SIZES = [4, 6, 8] as const;
type Size = (typeof SIZES)[number];
type TensorResponse = {
  success: boolean;
  status: string;
  source?: string;
  sourceStatus?: string;
  observation: {
    size: Size;
    shape_4d: number[];
    shape_2d: number[];
    min_val: number;
    max_val: number;
    checksum: number;
    matrix_2d: number[][];
  };
  verification: {
    status: string;
    digest: string;
    passedRules: string[];
    failedRules: string[];
  };
  memory: { status: string; blockIndex: number | null };
};

function cellAddress(row: number, column: number, size: number): string {
  return `i${Math.floor(row / size)},j${Math.floor(column / size)},k${row % size},l${column % size}`;
}

export function DAVMatrixVisualizer() {
  const [size, setSize] = useState<Size>(4);
  const [payload, setPayload] = useState<TensorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE_URL}/tensor/${size}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error || `tensor request failed (${response.status})`);
        return body as TensorResponse;
      })
      .then((body) => { if (active) setPayload(body); })
      .catch((reason: unknown) => {
        if (active) {
          setPayload(null);
          setError(reason instanceof Error ? reason.message : 'tensor evidence unavailable');
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [size]);

  const cells = useMemo(() => payload?.observation.matrix_2d.flatMap((row, rowIndex) => row.map((value, columnIndex) => ({ value, rowIndex, columnIndex }))) ?? [], [payload]);
  const maxValue = payload?.observation.max_val ?? 1;

  return (
    <section className="dav-panel" aria-label="4D Tensor DAV matrix visualizer">
      <header className="dav-header">
        <div>
          <span className="dav-kicker">DAV MATRIX · 4D TENSOR OBSERVATION</span>
          <h2>T[i,j,k,l] = i + j + k + l</h2>
          <p>Reshaped 4D tensor → 2D heatmap. Hover a cell to inspect its four coordinates.</p>
        </div>
        <div className="dav-controls" aria-label="Tensor size selector">
          {SIZES.map((candidate) => (
            <button key={candidate} type="button" aria-pressed={size === candidate} onClick={() => setSize(candidate)}>
              {candidate}×{candidate}×{candidate}×{candidate}
            </button>
          ))}
        </div>
      </header>
      {loading && <div className="dav-state">OBSERVING tensor/{size}…</div>}
      {error && <div className="dav-state dav-error">UNKNOWN · {error}</div>}
      {payload && (
        <>
          <div className="dav-metrics">
            <span><b>{payload.verification.status}</b> verification</span>
            <span>shape {payload.observation.shape_2d.join('×')}</span>
            <span>checksum {payload.observation.checksum}</span>
            <span>source {payload.source ?? 'UNKNOWN'} · memory {payload.memory.status}</span>
          </div>
          <div
            className="dav-grid"
            style={{ gridTemplateColumns: `repeat(${payload.observation.shape_2d[1]}, minmax(0, 1fr))` }}
            aria-label={`${payload.observation.shape_2d.join(' by ')} tensor heatmap`}
          >
            {cells.map(({ value, rowIndex, columnIndex }) => (
              <span
                className="dav-cell"
                key={`${rowIndex}-${columnIndex}`}
                title={`${cellAddress(rowIndex, columnIndex, size)} = ${value}`}
                aria-label={`${cellAddress(rowIndex, columnIndex, size)} equals ${value}`}
                style={{ backgroundColor: `hsl(${190 - (value / Math.max(maxValue, 1)) * 150} 78% ${32 + (value / Math.max(maxValue, 1)) * 28}%)` }}
              />
            ))}
          </div>
          <small className="dav-boundary">Local deterministic math and receipt only · digest {payload.verification.digest.slice(0, 16)}… · no deployment claim</small>
        </>
      )}
    </section>
  );
}
