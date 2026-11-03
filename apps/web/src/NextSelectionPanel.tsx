import React, { useState } from 'react';

/**
 * Ω∞v NEXT — one finite transition, or STOP.
 *
 *   NEXT = argmax_{Δ ∈ Authorized} EvidenceBackedValue(Δ) / (Risk(Δ) + Cost(Δ) + ε)
 *
 * Every number below is an operator estimate, not an observation. The API
 * ranks the authorized candidates and answers with one selection or STOP.
 * A selection is not permission: `execution` stays NOT_STARTED and nothing in
 * the repository, the ledger, or the runtime changes.
 */

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

type CandidateRow = {
  id: string;
  authorized: boolean;
  evidenceBackedValue: string;
  risk: string;
  cost: string;
};

type RankedEntry = { id: string; score: number };

type Issue = { code: string; field: string; message: string };

type Selection = {
  status: 'SELECTED' | 'STOP' | 'INVALID';
  execution: string;
  evidence: string;
  authority: string;
  selected: { id: string; authorized: boolean } | null;
  score: number | null;
  considered: number;
  excludedUnauthorized: number;
  ranking: RankedEntry[];
  issues: Issue[];
};

const SEED_CANDIDATES: CandidateRow[] = [
  { id: 'observe-a-claimed-state', authorized: true, evidenceBackedValue: '8', risk: '2', cost: '1' },
  { id: 'compress-next-slice', authorized: true, evidenceBackedValue: '5', risk: '1', cost: '2' },
  { id: 'unrequested-expansion', authorized: false, evidenceBackedValue: '40', risk: '1', cost: '1' },
];

const emptyRow = (index: number): CandidateRow => ({
  id: `candidate-${index}`,
  authorized: true,
  evidenceBackedValue: '1',
  risk: '1',
  cost: '1',
});

const formatScore = (score: number | null) =>
  score === null ? '—' : score >= 1000 ? score.toExponential(3) : score.toFixed(3);

export function NextSelectionPanel() {
  const [rows, setRows] = useState<CandidateRow[]>(SEED_CANDIDATES);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [boundary, setBoundary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (index: number, patch: Partial<CandidateRow>) =>
    setRows((current) => current.map((row, position) => (position === index ? { ...row, ...patch } : row)));

  const remove = (index: number) =>
    setRows((current) => current.filter((_, position) => position !== index));

  const select = async () => {
    setLoading(true);
    setError(null);
    try {
      const candidates = rows.map((row) => ({
        id: row.id.trim(),
        authorized: row.authorized,
        evidenceBackedValue: Number(row.evidenceBackedValue),
        risk: Number(row.risk),
        cost: Number(row.cost),
      }));
      const response = await fetch(`${API_BASE_URL}/v1/ecosystem/next`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ candidates }),
      });
      const payload = await response.json();
      const answer: Selection | undefined = payload?.selection;
      if (!answer) throw new Error(`selection unavailable (${response.status})`);
      setSelection(answer);
      setBoundary(payload?.evidenceBoundary ?? null);
    } catch (err) {
      setSelection(null);
      setBoundary(null);
      setError(err instanceof Error ? err.message : 'selection unavailable');
    } finally {
      setLoading(false);
    }
  };

  const status = selection?.status ?? 'UNREAD';
  const selectedId = selection?.selected?.id ?? null;

  return (
    <section className="next-select" aria-label="Ω∞v next selection · one transition or stop">
      <header className="next-select-header">
        <div>
          <span className="next-select-kicker">NEXT · ONE TRANSITION OR STOP</span>
          <h3>What is the next most important thing?</h3>
        </div>
        <span className={`next-select-badge next-select-badge-${status.toLowerCase()}`}>
          {status === 'SELECTED' ? `SELECTED · ${selectedId}` : status}
        </span>
      </header>

      <p className="next-select-formula" aria-label="Selection formula">
        NEXT = argmax <strong>EvidenceBackedValue</strong> / (<strong>Risk</strong> + <strong>Cost</strong> + ε)
        <span>over authorized candidates only · equal scores break toward the smaller id</span>
      </p>

      <div className="next-select-table" role="table" aria-label="Candidate estimates">
        <div className="next-select-row next-select-row-head" role="row">
          <span role="columnheader">CANDIDATE</span>
          <span role="columnheader">VALUE</span>
          <span role="columnheader">RISK</span>
          <span role="columnheader">COST</span>
          <span role="columnheader">AUTH</span>
          <span role="columnheader" aria-label="Remove" />
        </div>
        {rows.map((row, index) => (
          <div className="next-select-row" role="row" key={index}>
            <input
              aria-label={`Candidate ${index + 1} id`}
              value={row.id}
              onChange={(event) => update(index, { id: event.target.value })}
              spellCheck={false}
            />
            <input
              aria-label={`Candidate ${index + 1} evidence-backed value`}
              type="number"
              min="0"
              step="any"
              value={row.evidenceBackedValue}
              onChange={(event) => update(index, { evidenceBackedValue: event.target.value })}
            />
            <input
              aria-label={`Candidate ${index + 1} risk`}
              type="number"
              min="0"
              step="any"
              value={row.risk}
              onChange={(event) => update(index, { risk: event.target.value })}
            />
            <input
              aria-label={`Candidate ${index + 1} cost`}
              type="number"
              min="0"
              step="any"
              value={row.cost}
              onChange={(event) => update(index, { cost: event.target.value })}
            />
            <label className="next-select-auth">
              <input
                aria-label={`Candidate ${index + 1} authorized`}
                type="checkbox"
                checked={row.authorized}
                onChange={(event) => update(index, { authorized: event.target.checked })}
              />
              <span>{row.authorized ? 'YES' : 'NO'}</span>
            </label>
            <button
              type="button"
              className="next-select-remove"
              aria-label={`Remove candidate ${index + 1}`}
              onClick={() => remove(index)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="next-select-controls">
        <button type="button" onClick={() => setRows((current) => [...current, emptyRow(current.length + 1)])}>
          ADD CANDIDATE
        </button>
        <button type="button" onClick={select} disabled={loading || rows.length === 0}>
          {loading ? 'RANKING…' : 'SELECT NEXT'}
        </button>
        <span className="next-select-boundary">
          SELECTION ≠ PERMISSION · EXECUTION {selection?.execution ?? 'NOT_STARTED'}
        </span>
      </div>

      {error && <p className="next-select-error" role="status">Selection unavailable · {error}</p>}

      {selection && selection.status !== 'INVALID' && (
        <div className="next-select-result" role="status" aria-live="polite">
          <div className="next-select-answer">
            <b>{selection.status === 'SELECTED' ? selection.selected?.id : 'STOP'}</b>
            <span>
              {selection.status === 'SELECTED'
                ? `score ${formatScore(selection.score)}`
                : 'no authorized candidate was supplied'}
            </span>
            <small>
              {selection.considered} considered · {selection.excludedUnauthorized} excluded as unauthorized ·{' '}
              {selection.evidence}
            </small>
          </div>
          {selection.ranking.length > 0 && (
            <ol className="next-select-ranking">
              {selection.ranking.map((entry) => (
                <li key={entry.id} className={entry.id === selectedId ? 'is-selected' : undefined}>
                  <span>{entry.id}</span>
                  <b>{formatScore(entry.score)}</b>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {selection?.status === 'INVALID' && (
        <ul className="next-select-issues" role="status">
          {selection.issues.map((issue) => (
            <li key={`${issue.code}-${issue.field}`}>
              <b>{issue.code}</b> <span>{issue.field}</span> {issue.message}
            </li>
          ))}
        </ul>
      )}

      <p className="next-select-note">
        {boundary ?? 'Estimates are yours, not observed. The selector ranks them and starts nothing.'}
      </p>
    </section>
  );
}
