import { useEffect, useState, type CSSProperties } from 'react';
import './TensorDavVisualizer.css';

type TensorSize = 4 | 6 | 8;
type TensorReceipt = {
  success: true;
  status: 'VERIFIED';
  size: TensorSize;
  projection: { rows: number; columns: number };
  values: number[][];
  invariants: { min: number; max: number; mean: number; checksum: number };
  sha256: string;
};

type ErrorReceipt = { success: false; status: 'UNKNOWN' | 'DIVERGENT'; error?: string; issues?: string[] };
const sizes: TensorSize[] = [4, 6, 8];
const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

function playHarmonicCellTone(frequencyHz = 432, durationSeconds = 0.35) {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequencyHz, ctx.currentTime);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSeconds);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationSeconds);
  } catch {
    // Non-blocking harmonic audio synthesis
  }
}

export interface TensorDavVisualizerProps {
  onCellSelect?: (cell: { row: number; column: number; i: number; j: number; k: number; l: number; value: number }) => void;
  enableHarmonicResonance?: boolean;
}

export function TensorDavVisualizer({ onCellSelect, enableHarmonicResonance = true }: TensorDavVisualizerProps = {}) {
  const [size, setSize] = useState<TensorSize>(4);
  const [receipt, setReceipt] = useState<TensorReceipt | null>(null);
  const [failure, setFailure] = useState<ErrorReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    column: number;
    i: number;
    j: number;
    k: number;
    l: number;
    value: number;
  } | null>(null);

  const handleCellSelect = (cell: { row: number; column: number; i: number; j: number; k: number; l: number; value: number }) => {
    setSelectedCell(cell);
    if (enableHarmonicResonance) {
      const maxVal = receipt?.invariants.max || 1;
      const freq = Math.round(432 * (1 + cell.value / (2 * maxVal)));
      playHarmonicCellTone(freq, 0.35);
    }
    onCellSelect?.(cell);
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailure(null);
    setReceipt(null);
    setSelectedCell(null);
    fetch(`${API_BASE_URL}/tensor/${size}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as TensorReceipt | ErrorReceipt;
        if (!response.ok || body.success !== true) {
          setFailure(body.success === false ? body : { success: false, status: 'UNKNOWN', error: 'INVALID_API_RESPONSE' });
          return;
        }
        setReceipt(body);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        setFailure({ success: false, status: 'UNKNOWN', error: 'TENSOR_SERVICE_UNAVAILABLE' });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [size]);

  return (
    <section className="tensor-dav" aria-labelledby="tensor-dav-title">
      <div className="tensor-dav__heading">
        <div>
          <p className="tensor-dav__eyebrow">DETERMINISTIC VERIFICATION · READ ONLY</p>
          <h2 id="tensor-dav-title">Entity tensor projection</h2>
          <p className="tensor-dav__description">T[i,j,k,l] = i + j + k + l · projected with row = i × N + j and column = k × N + l.</p>
        </div>
        {!loading && receipt && <span className="tensor-dav__badge" aria-label="SHA-256 verified">🔒 Verified · SHA-256</span>}
      </div>

      <div className="tensor-dav__controls" role="group" aria-label="Tensor dimensions">
        {sizes.map((candidate) => (
          <button
            type="button"
            key={candidate}
            aria-pressed={size === candidate}
            onClick={() => setSize(candidate)}
          >
            {candidate}×{candidate}×{candidate}×{candidate}
          </button>
        ))}
        <span className="tensor-dav__projection">{size ** 2} × {size ** 2} projection</span>
      </div>

      {loading && <p className="tensor-dav__state" role="status">Computing and verifying tensor…</p>}
      {!loading && failure && (
        <div className={`tensor-dav__error tensor-dav__error--${failure.status.toLowerCase()}`} role="alert">
          <strong>{failure.status}</strong><span>{failure.error ?? failure.issues?.join('; ') ?? 'Tensor verification failed closed.'}</span>
        </div>
      )}

      {!loading && receipt && (
        <>
          <div className="tensor-dav__summary" aria-label="Verified tensor invariants">
            <span>MIN <strong>{receipt.invariants.min}</strong></span>
            <span>MAX <strong>{receipt.invariants.max}</strong></span>
            <span>MEAN <strong>{receipt.invariants.mean}</strong></span>
            <span>CHECKSUM <strong>{receipt.invariants.checksum.toLocaleString('en-US')}</strong></span>
          </div>
          {selectedCell && (
            <div className="tensor-dav__inspector" aria-label="Selected tensor coordinate">
              <span>COORDINATE: <strong>T[{selectedCell.i}, {selectedCell.j}, {selectedCell.k}, {selectedCell.l}]</strong></span>
              <span>PROJECTION: <strong>row {selectedCell.row}, col {selectedCell.column}</strong></span>
              <span>VALUE: <strong>{selectedCell.value}</strong></span>
              <span>RESONANCE: <strong>{Math.round(432 * (1 + selectedCell.value / (2 * (receipt.invariants.max || 1))))} Hz</strong></span>
              <button
                type="button"
                className="tensor-dav__inspector-close"
                onClick={() => setSelectedCell(null)}
                aria-label="Clear coordinate selection"
              >
                ✕
              </button>
            </div>
          )}
          <div className="tensor-dav__heatmap-wrap" aria-label={`${size ** 2} by ${size ** 2} tensor projection heatmap`}>
            <div className="tensor-dav__heatmap" style={{ '--tensor-columns': receipt.projection.columns } as CSSProperties}>
              {receipt.values.flatMap((values, row) => values.map((cellValue, column) => {
                const i = Math.floor(row / size);
                const j = row % size;
                const k = Math.floor(column / size);
                const l = column % size;
                const hue = 164 - (cellValue / receipt.invariants.max) * 145;
                const isSelected = selectedCell?.row === row && selectedCell?.column === column;
                return (
                  <span
                    key={`${row}-${column}`}
                    className={`tensor-dav__cell${isSelected ? ' tensor-dav__cell--selected' : ''}`}
                    style={{ backgroundColor: `hsl(${hue} 68% ${24 + (cellValue / receipt.invariants.max) * 27}%)` }}
                    title={`row ${row}, column ${column} · T[${i},${j},${k},${l}] = ${i}+${j}+${k}+${l} = ${cellValue}`}
                    aria-label={`row ${row}, column ${column}, value ${i} plus ${j} plus ${k} plus ${l} equals ${cellValue}`}
                    tabIndex={0}
                    onClick={() => handleCellSelect({ row, column, i, j, k, l, value: cellValue })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCellSelect({ row, column, i, j, k, l, value: cellValue });
                      }
                    }}
                  >
                    {cellValue}
                  </span>
                );
              }))}
            </div>
          </div>
          <p className="tensor-dav__digest"><span>SHA-256 receipt</span><code>{receipt.sha256}</code></p>
        </>
      )}
      <p className="tensor-dav__boundary">This badge verifies the displayed deterministic result against the kernel's declared invariants. It is not a signature, deployment claim, or ledger write.</p>
    </section>
  );
}
