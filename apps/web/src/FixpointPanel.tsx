import React, { useEffect, useState } from 'react';
import { apiRequest } from './api';

type Verdict = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

interface FixpointStateRef {
  root: string;
  size: number;
}

interface FixpointStep {
  verdict: Verdict;
  halted: boolean;
  haltReason: string | null;
  committed: boolean;
  deltaHash: string;
  expected: string;
  observed: string | null;
  consequence: string;
  evaluatedAt: string;
  state: FixpointStateRef;
}

interface FixpointSnapshot {
  operator: string[];
  law: string;
  state: FixpointStateRef;
  verdicts: Record<Verdict, number>;
  last: FixpointStep | null;
}

interface StepResponse {
  success: boolean;
  step: FixpointStep;
  state: FixpointStateRef;
  verdicts: Record<Verdict, number>;
}

type Probe = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

const PROBES: { probe: Probe; label: string }[] = [
  { probe: 'VERIFIED', label: 'VERIFY' },
  { probe: 'DIVERGENT', label: 'KNOWN SCAM' },
  { probe: 'UNKNOWN', label: 'NO EVIDENCE' },
  { probe: 'NOT_EXECUTED', label: 'NO AUTHORITY' },
];

/** One delta per branch of the operator, so every halt is reachable from the UI. */
function deltaFor(probe: Probe, tipHash?: string) {
  const anchor = tipHash ? `tip:${tipHash}` : 'tip:genesis';
  switch (probe) {
    case 'VERIFIED':
      return {
        expected: anchor,
        observed: anchor,
        evidence: [`block:${tipHash ?? 'genesis'}`],
        authority: 1,
        requiredAuthority: 1,
        consequence: 'observed chain tip reproduced',
      };
    case 'DIVERGENT':
      return {
        expected: 'state:verified-tip',
        observed: 'state:verified-tip',
        evidence: ['knowledge:known-scam'],
        authority: 1,
        requiredAuthority: 1,
        knownScam: true,
        consequence: 'change is already known to be a scam',
      };
    case 'UNKNOWN':
      return {
        expected: 'state:verified-tip',
        observed: 'state:verified-tip',
        evidence: [],
        authority: 1,
        requiredAuthority: 1,
        consequence: 'observation offered without evidence',
      };
    case 'NOT_EXECUTED':
      return {
        expected: 'state:verified-tip',
        evidence: ['plan:authority-missing'],
        authority: 0,
        requiredAuthority: 1,
        consequence: 'authority below the required threshold',
      };
  }
}

const short = (value: string, length = 14): string =>
  value.length > length ? `${value.slice(0, length)}…` : value;

export function FixpointPanel({ tipHash }: { tipHash?: string }) {
  const [snapshot, setSnapshot] = useState<FixpointSnapshot | null>(null);
  const [last, setLast] = useState<FixpointStep | null>(null);
  const [pending, setPending] = useState<Probe | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    apiRequest<FixpointSnapshot>('/v1/reality/state')
      .then((data) => {
        if (!disposed) setSnapshot(data);
      })
      .catch(() => {
        /* the loop is optional for the dashboard; leave it idle */
      });
    return () => {
      disposed = true;
    };
  }, []);

  const step = async (probe: Probe) => {
    setPending(probe);
    setError(null);
    try {
      const data = await apiRequest<StepResponse>('/v1/reality/step', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(deltaFor(probe, tipHash)),
      });
      setLast(data.step);
      setSnapshot((previous) => ({
        operator: previous?.operator ?? [],
        law: previous?.law ?? 'Mₜ₊₁ = Mₜ ∪ Δ ⟺ Expected ≡ Observed',
        state: data.state,
        verdicts: data.verdicts,
        last: data.step,
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPending(null);
    }
  };

  const sigma = snapshot?.state;
  const verdicts = snapshot?.verdicts;
  const step2 = last ?? snapshot?.last ?? null;

  return (
    <section className="oceanicos-fixpoint">
      <div className="fixpoint-head">
        <span className="panel-title">Ω∞v FIXPOINT</span>
        <span className={`fixpoint-verdict ${step2 ? step2.verdict.toLowerCase().replace('_', '-') : 'idle'}`}>
          {step2 ? step2.verdict : 'AWAITING Δ'}
        </span>
      </div>

      <div className="fixpoint-body">
        <div className="fixpoint-law">
          {(snapshot?.operator ?? ['Ω∞v = Y(λf.λx. …)']).map((line) => (
            <code key={line}>{line}</code>
          ))}
        </div>

        <div className="fixpoint-state">
          <div className="panel-row">
            <span>Σ</span>
            <strong>{sigma ? `${sigma.size} Δ` : '—'}</strong>
          </div>
          <div className="panel-row">
            <span>Root</span>
            <strong>{sigma ? short(sigma.root, 16) : 'Ø'}</strong>
          </div>
          <div className="panel-row">
            <span>Halt</span>
            <strong>{step2?.haltReason ?? '—'}</strong>
          </div>
          <div className="panel-row">
            <span>Δ</span>
            <strong>{step2?.committed ? 'REMEMBERED' : step2 ? 'NOT REMEMBERED' : '—'}</strong>
          </div>

          <div className="fixpoint-tally">
            <span>V {verdicts?.VERIFIED ?? 0}</span>
            <span>D {verdicts?.DIVERGENT ?? 0}</span>
            <span>U {verdicts?.UNKNOWN ?? 0}</span>
            <span>N {verdicts?.NOT_EXECUTED ?? 0}</span>
          </div>

          <div className="fixpoint-actions">
            {PROBES.map(({ probe, label }) => (
              <button
                key={probe}
                type="button"
                className="fixpoint-btn"
                onClick={() => step(probe)}
                disabled={pending !== null}
                data-probe={probe}
              >
                {pending === probe ? '…' : label}
              </button>
            ))}
          </div>

          {error && <div className="oceanicos-error">⚠ {error}</div>}
        </div>
      </div>
    </section>
  );
}

export default FixpointPanel;
