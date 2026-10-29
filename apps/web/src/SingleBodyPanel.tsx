import React, { useMemo, useState } from 'react';

/**
 * Ω∞v Single Body — visual 4×4×4×4 compression / expansion.
 *
 * The body is addressed by four axes of four coordinates:
 *   layer    reality | system | evidence | authority
 *   organ    sense   | verify | remember | express
 *   form     runtime | contract | intent   | boundary
 *   evidence VERIFIED | SUPPORTED | UNVERIFIED | UNKNOWN
 *
 * 4 × 4 × 4 × 4 = 256 cells. The grid below draws every cell; the compress
 * view lists the filled cells, and expand asks the API to restore the
 * records so the round trip is observed rather than assumed.
 *
 * Evidence boundary: a digest and a VERIFIED round trip are statements about
 * this local representation, not about deployment or real-world outcome.
 */

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

const AXES = {
  layer: ['reality', 'system', 'evidence', 'authority'],
  organ: ['sense', 'verify', 'remember', 'express'],
  form: ['runtime', 'contract', 'intent', 'boundary'],
  evidence: ['VERIFIED', 'SUPPORTED', 'UNVERIFIED', 'UNKNOWN'],
} as const;

const EVIDENCE_COLOR: Record<string, string> = {
  VERIFIED: '#06b6d4',
  SUPPORTED: '#38bdf8',
  UNVERIFIED: '#f59e0b',
  UNKNOWN: '#64748b',
};

type CellEntry = { index: number; id: string; name: string; source: string; status: string };
type Cell = { address: number[]; key: string; digest: string; entries: CellEntry[] };
type Compression = {
  space?: { notation: string; capacity: number };
  filled?: number;
  count?: number;
  digest?: string;
  cells?: Cell[];
  expansion?: { status: string; digestMatches?: boolean; lossless?: boolean };
};

type FixpointBranch = { when: string; then: string };
type Fixpoint = {
  law: string;
  truth: string;
  branches: FixpointBranch[];
  observed: string;
  source: string;
};

type Props = { body: any };

const keyFor = (layer: string, organ: string, form: string, evidence: string) =>
  [layer, organ, form, evidence].join('/');

export function SingleBodyPanel({ body }: Props) {
  const [view, setView] = useState<'compressed' | 'expanded'>('compressed');
  const [expansion, setExpansion] = useState<{ status: string; entries: CellEntry[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const compression: Compression | undefined = body?.compression;
  const cells = compression?.cells ?? [];
  const capacity = compression?.space?.capacity ?? 256;
  const filled = compression?.filled ?? 0;
  const count = compression?.count ?? 0;
  const roundTrip = compression?.expansion?.status ?? 'UNKNOWN';
  const fixpoint: Fixpoint | undefined = body?.fixpoint;

  const cellMap = useMemo(() => {
    const map = new Map<string, Cell>();
    cells.forEach((cell) => map.set(cell.key, cell));
    return map;
  }, [cells]);

  const records = useMemo(
    () => [...cells.flatMap((cell) => cell.entries)].sort((a, b) => a.index - b.index),
    [cells],
  );

  const expand = async () => {
    if (!compression) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/ecosystem/body/expand`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ compression }),
      });
      const payload = await response.json();
      if (!response.ok || payload?.status !== 'EXPANDED') {
        throw new Error(payload?.issues?.[0]?.message || `expansion refused (${response.status})`);
      }
      setExpansion({ status: payload.status, entries: payload.entries ?? [] });
      setView('expanded');
    } catch (err) {
      setExpansion(null);
      setError(err instanceof Error ? err.message : 'expansion unavailable');
    } finally {
      setLoading(false);
    }
  };

  const shown = expansion?.entries ?? records;

  return (
    <section className="single-body" aria-label="Ω∞v single body · 4×4×4×4 compression">
      <header className="single-body-header">
        <div>
          <span className="single-body-kicker">Ω∞v SINGLE BODY · 4 × 4 × 4 × 4</span>
          <h3>One body, 256 addresses</h3>
        </div>
        <span className={`single-body-badge single-body-badge-${roundTrip.toLowerCase()}`}>
          ROUND TRIP {roundTrip}
        </span>
      </header>

      <div className="single-body-fixpoint" aria-label="Absolute Fixpoint Equation">
        <code>{fixpoint?.law ?? 'Ω∞v := Y( λf. ( M_{t+1} = M_t ∪ Δ | V(Δ) = ⊤ ) ) | V ≡ (Expected ≡ Observed)'}</code>
        <ul>
          {(fixpoint?.branches ?? []).map((branch) => (
            <li key={branch.when}>
              <b>{branch.then}</b>
              <span>if {branch.when}</span>
            </li>
          ))}
          {!fixpoint && <li><b>UNKNOWN</b><span>the API has not reported the fixpoint yet</span></li>}
        </ul>
        <small>
          {fixpoint
            ? `${fixpoint.source} · truth ${fixpoint.truth} · observed ${fixpoint.observed}`
            : 'Source: ECOSYSTEM_BODY.md'}
        </small>
      </div>

      <p className="single-body-equation" aria-label="Compression equation">
        {AXES.layer.length} layer × {AXES.organ.length} organ × {AXES.form.length} form × {AXES.evidence.length} evidence
        <strong>= {capacity} cells</strong>
        <span>{count} records in {filled} cells · {capacity - filled} empty</span>
      </p>

      <div className="single-body-meter" role="img" aria-label={`${filled} of ${capacity} cells filled`}>
        <span style={{ width: `${(filled / capacity) * 100}%` }} />
      </div>

      <div className="single-body-space">
        {AXES.layer.map((layer) => (
          <article className="single-body-layer" key={layer}>
            <span className="single-body-label">{layer}</span>
            <div className="single-body-matrix">
              <span className="single-body-corner" />
              {AXES.form.map((form) => (
                <span className="single-body-col" key={form}>{form.slice(0, 4)}</span>
              ))}
              {AXES.organ.map((organ) => (
                <React.Fragment key={organ}>
                  <span className="single-body-row">{organ}</span>
                  {AXES.form.map((form) => {
                    const hits = AXES.evidence.map((evidence) => cellMap.get(keyFor(layer, organ, form, evidence)));
                    const names = hits.flatMap((cell) => cell?.entries ?? []);
                    return (
                      <div
                        className={`single-body-cell${names.length ? ' is-filled' : ''}`}
                        key={`${organ}/${form}`}
                        title={names.length
                          ? names.map((entry) => `${entry.name} · ${entry.status}`).join('\n')
                          : `${keyFor(layer, organ, form, '*')} — empty`}
                      >
                        {AXES.evidence.map((evidence, index) => (
                          <i key={evidence} style={{ background: hits[index] ? EVIDENCE_COLOR[evidence] : undefined }} />
                        ))}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="single-body-legend">
        {AXES.evidence.map((evidence) => (
          <span key={evidence}><i style={{ background: EVIDENCE_COLOR[evidence] }} />{evidence}</span>
        ))}
        <small>Coordinates are a declared projection of each runtime layer, not inferred truth.</small>
      </div>

      <div className="single-body-controls">
        <button type="button" aria-pressed={view === 'compressed'} onClick={() => setView('compressed')}>COMPRESS</button>
        <button type="button" aria-pressed={view === 'expanded'} onClick={expand} disabled={loading || !compression}>
          {loading ? 'EXPANDING…' : 'EXPAND'}
        </button>
        <span className="single-body-digest">
          digest {compression?.digest ? `${compression.digest.slice(0, 16)}…` : 'UNKNOWN'}
          {expansion ? ' · restored by API' : ' · body read'}
        </span>
      </div>

      {error && <p className="single-body-error" role="status">Expansion refused · {error}</p>}

      {view === 'compressed' ? (
        <div className="single-body-cells">
          {cells.map((cell) => (
            <div className="single-body-chip" key={cell.key}>
              <b>{cell.key}</b>
              <span>{cell.entries.map((entry) => entry.status).join(' · ')}</span>
              <small>{cell.digest.slice(0, 8)}</small>
            </div>
          ))}
          {!cells.length && <small className="single-body-empty">No compressed body observed — the API has not answered yet.</small>}
        </div>
      ) : (
        <ol className="single-body-records">
          {shown.map((entry, index) => (
            <li key={`${entry.id}-${index}`}>
              <b>{entry.name}</b>
              <span>{entry.status}</span>
              <small>{entry.source}</small>
            </li>
          ))}
          {!shown.length && <li className="single-body-empty">Nothing expanded yet — select EXPAND.</li>}
        </ol>
      )}
    </section>
  );
}
