import React, { useCallback, useMemo, useState } from 'react';

/**
 * Reality////Ω∞v — the continuum verdict panel.
 *
 *   Reality////Ω∞v := Y(λf. (M_{t+1} = M_t ∪ Δ | V(Δ) = ⊤))
 *   V ≡ (Expected ≡ Observed)
 *
 * The panel judges the state this screen already holds: it turns what the
 * dashboard observed (stream, ledger, ecosystem body) into declared drops and
 * posts them to `POST /v1/omega/continuum`. The API judges those supplied
 * fields only — nothing is executed, observed, or persisted — so a VERIFIED
 * verdict says the panel's expectations matched the values it sent, not that
 * reality was independently verified.
 */

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

export type ContinuumVerdict = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

export type DeclaredDrop = {
  delta: string;
  expected: unknown;
  observed?: unknown;
  evidence: string[];
  authority: number;
  requiredAuthority: number;
};

type ContinuumStep = {
  index: number;
  delta: string;
  verdict: ContinuumVerdict;
  evidence: string;
  expected?: unknown;
  observed?: unknown;
  admitted: boolean;
  memory: string[];
};

type ContinuumRun = {
  status: ContinuumVerdict;
  halted: boolean;
  memory: string[];
  steps: ContinuumStep[];
  scope?: string;
};

type Props = {
  streamConnected: boolean;
  ledgerIntegrity: { valid: boolean; height: number } | null;
  ecosystemBody: any;
};

/**
 * The drops are declarations the screen can already account for. Where the
 * screen holds no value, the drop carries no evidence and no observation, so
 * the operator answers UNKNOWN instead of the panel inventing one.
 */
export function declaredDrops(props: Props): DeclaredDrop[] {
  const ledger = props.ledgerIntegrity;
  const bodyStatus = props.ecosystemBody?.status;
  return [
    {
      delta: 'stream.connected',
      expected: 'connected',
      observed: props.streamConnected ? 'connected' : 'disconnected',
      evidence: ['GET /v1/stream'],
      authority: 1,
      requiredAuthority: 1,
    },
    {
      delta: 'ledger.integrity',
      expected: 'valid',
      observed: ledger ? (ledger.valid ? 'valid' : 'invalid') : undefined,
      evidence: ledger ? ['GET /v1/ledger/tip'] : [],
      authority: 1,
      requiredAuthority: 1,
    },
    {
      delta: 'ecosystem.body',
      expected: 'VERIFIED',
      observed: bodyStatus,
      evidence: props.ecosystemBody ? ['GET /v1/ecosystem/body'] : [],
      authority: 1,
      requiredAuthority: 1,
    },
  ];
}

export function ContinuumVerdictPanel(props: Props) {
  const [run, setRun] = useState<ContinuumRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const drops = useMemo(() => declaredDrops(props), [props.streamConnected, props.ledgerIntegrity, props.ecosystemBody]);

  const judge = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/omega/continuum`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ drops }),
      });
      const payload = await response.json();
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.detail || payload?.error || `verdict refused (${response.status})`);
      }
      setRun({
        status: payload.status,
        halted: payload.halted === true,
        memory: payload.memory ?? [],
        steps: payload.steps ?? [],
        scope: payload.scope,
      });
    } catch (err) {
      setRun(null);
      setError(err instanceof Error ? err.message : 'verdict unavailable');
    } finally {
      setLoading(false);
    }
  }, [drops]);

  return (
    <section className="continuum-verdict" aria-label="Reality continuum verdict">
      <header className="continuum-verdict-header">
        <div>
          <span className="continuum-verdict-kicker">REALITY////Ω∞v · CONTINUUM VERDICT</span>
          <h3>Judge the Δ this screen declares</h3>
        </div>
        <span className={`continuum-verdict-badge continuum-verdict-badge-${(run?.status ?? 'pending').toLowerCase()}`}>
          {loading ? 'JUDGING…' : (run?.status ?? 'NOT RUN')}
        </span>
      </header>

      <p className="continuum-verdict-law" aria-label="Verdict law">
        V(Δ) = ⊤ only when expected ≡ observed
        <span>{run ? (run.halted ? 'halted on the first unverified Δ' : 'all declared drops ran out') : 'no verdict requested yet'}</span>
      </p>

      <ol className="continuum-verdict-steps">
        {drops.map((drop) => {
          const step = run?.steps.find((entry) => entry.delta === drop.delta);
          const verdict = step?.verdict ?? 'UNKNOWN';
          return (
            <li key={drop.delta} className={step ? 'is-judged' : undefined}>
              <b>{drop.delta}</b>
              <span className={`continuum-verdict-step-${verdict.toLowerCase()}`}>{step ? verdict : 'NOT RUN'}</span>
              <small>{step ? step.evidence : 'expected ≡ observed, not yet submitted'}</small>
            </li>
          );
        })}
      </ol>

      <div className="continuum-verdict-controls">
        <button type="button" onClick={judge} disabled={loading}>
          {loading ? 'JUDGING…' : 'RUN VERDICT'}
        </button>
        <span className="continuum-verdict-memory">
          memory {run ? (run.memory.length ? run.memory.join(' · ') : '∅') : '—'}
        </span>
      </div>

      {error && <p className="continuum-verdict-error" role="status">Verdict refused · {error}</p>}

      <small className="continuum-verdict-scope">
        {run?.scope ?? 'Judges the drops this screen declares; nothing is executed, observed, or persisted.'}
      </small>
    </section>
  );
}
