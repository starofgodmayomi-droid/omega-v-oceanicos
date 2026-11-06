import React, { useCallback, useEffect, useState } from 'react';

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

type VoosStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';

type Receipt = {
  engine: string;
  entity: string;
  status: VoosStatus;
  game_detected: boolean;
  intervention_action: string;
  phase_t: number;
  evidence_hash: string;
  action: string;
  reason: string;
  next_delta: string;
};

type LedgerRow = {
  sequence: number;
  timestamp: string;
  intent: string;
  phase_t: number;
  status: VoosStatus;
  evidence_hash: string;
  prev_hash: string;
  reason: string;
  authorized: boolean;
  row_hash: string;
};

type Integrity = {
  valid: boolean;
  height: number;
  genesisHash: string | null;
  tipHash: string | null;
  brokenAt?: number;
  reason?: string;
};

/** The directive's surface: #030812 depth with #00e5ff cyan. */
const OCEAN = {
  bg: '#030812',
  panel: '#050d1c',
  border: 'rgba(0, 229, 255, 0.22)',
  borderBright: 'rgba(0, 229, 255, 0.5)',
  cyan: '#00e5ff',
  text: '#e2e8f0',
  muted: '#7c8ba1',
  mono: "'JetBrains Mono', 'DM Mono', ui-monospace, monospace",
};

const STATUS_COLOR: Record<VoosStatus, string> = {
  VERIFIED: '#00e5ff',
  DIVERGENT: '#f87171',
  UNKNOWN: '#facc15',
};

const PHASES = ['SPROUT', 'BLOOM', 'PLATEAU', 'WILT'] as const;

function ease(t: number): number {
  return (1 - Math.cos(Math.min(1, Math.max(0, t)) * Math.PI)) / 2;
}

function phaseName(t: number): (typeof PHASES)[number] {
  if (t < 0.25) return 'SPROUT';
  if (t < 0.55) return 'BLOOM';
  if (t < 0.82) return 'PLATEAU';
  return 'WILT';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`API returned invalid JSON (${response.status})`);
  }
  if (!response.ok) throw new Error(payload?.error || `API request failed (${response.status})`);
  return payload as T;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: OCEAN.muted,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: OCEAN.bg,
  color: OCEAN.text,
  border: `1px solid ${OCEAN.border}`,
  borderRadius: 6,
  padding: '9px 10px',
  fontSize: 12,
  fontFamily: OCEAN.mono,
  outline: 'none',
};

/**
 * ΩVØØS — the cosmic mirror surface.
 *
 * One intent in; the API runs PERCEIVE → CONNECT → SYNCHRONIZE → EVOLVE and
 * returns the output contract. The panel shows the receipt exactly as the
 * endpoint emitted it and the append-only KAI Ledger beneath it, so an UNKNOWN
 * verdict is displayed as UNKNOWN rather than dressed up as completion.
 */
export function VoosPanel() {
  const [intent, setIntent] = useState('');
  const [phaseT, setPhaseT] = useState(0);
  const [observed, setObserved] = useState('');
  const [source, setSource] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [entries, setEntries] = useState<LedgerRow[]>([]);
  const [integrity, setIntegrity] = useState<Integrity | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const data = await request<{ success: true; entries: LedgerRow[]; integrity: Integrity }>(
        '/v1/voos/ledger?limit=8'
      );
      setEntries(data.entries);
      setIntegrity(data.integrity);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'KAI Ledger unavailable');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const execute = async () => {
    if (!intent.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const body: Record<string, unknown> = { intent: intent.trim(), phaseT };
      if (observed.trim()) {
        body.observed = observed;
        body.source = source.trim();
      }
      const data = await request<{ success: true; receipt: Receipt }>('/v1/voos/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setReceipt(data.receipt);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution rejected');
    } finally {
      setBusy(false);
    }
  };

  const activePhase = phaseName(phaseT);

  return (
    <section
      aria-label="ΩVØØS cosmic mirror engine"
      style={{
        background: OCEAN.bg,
        border: `1px solid ${OCEAN.border}`,
        borderRadius: 16,
        padding: '20px 22px 24px',
        margin: '32px 0',
        color: OCEAN.text,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h2
          style={{
            margin: 0,
            fontFamily: OCEAN.mono,
            fontSize: 18,
            letterSpacing: '0.22em',
            color: OCEAN.cyan,
          }}
        >
          ΩVØØS
        </h2>
        <span style={{ fontSize: 10, letterSpacing: '0.18em', color: OCEAN.muted, textTransform: 'uppercase' }}>
          Deus Ex Machina · 30013030
        </span>
        <span style={{ fontSize: 11, color: OCEAN.muted, marginLeft: 'auto' }}>
          ATTEST, DON&apos;T ASSERT · UNKNOWN PRESERVED
        </span>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 18 }}>
        {/* Pane 1 — intent and growth phase */}
        <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label htmlFor="voos-intent" style={labelStyle}>
              Intent
            </label>
            <textarea
              id="voos-intent"
              value={intent}
              onChange={(event) => setIntent(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="State one observable intent…"
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div>
            <label htmlFor="voos-phase" style={labelStyle}>
              phase_t · {phaseT.toFixed(2)} · {activePhase} · Ease {ease(phaseT).toFixed(3)}
            </label>
            <input
              id="voos-phase"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={phaseT}
              onChange={(event) => setPhaseT(Number(event.target.value))}
              style={{ width: '100%', accentColor: OCEAN.cyan }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: OCEAN.muted, letterSpacing: '0.12em' }}>
              {PHASES.map((phase) => (
                <span key={phase} style={{ color: phase === activePhase ? OCEAN.cyan : OCEAN.muted }}>
                  {phase}
                </span>
              ))}
            </div>
          </div>

          <details style={{ borderTop: `1px solid ${OCEAN.border}`, paddingTop: 10 }}>
            <summary style={{ cursor: 'pointer', fontSize: 11, color: OCEAN.muted, letterSpacing: '0.1em' }}>
              Attach an independent observation
            </summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              <input
                aria-label="Observation source"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                placeholder="Source (e.g. ledger-audit)"
                style={inputStyle}
              />
              <textarea
                aria-label="Observed text"
                value={observed}
                onChange={(event) => setObserved(event.target.value)}
                rows={3}
                maxLength={4000}
                placeholder="Bytes produced outside this engine…"
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
          </details>

          <button
            type="button"
            onClick={execute}
            disabled={busy || !intent.trim()}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: `1px solid ${OCEAN.cyan}`,
              background: busy || !intent.trim() ? 'transparent' : 'rgba(0, 229, 255, 0.12)',
              color: OCEAN.cyan,
              fontFamily: OCEAN.mono,
              fontSize: 12,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              cursor: busy || !intent.trim() ? 'not-allowed' : 'pointer',
              opacity: busy || !intent.trim() ? 0.45 : 1,
            }}
          >
            {busy ? 'Running loop…' : 'Run ΩVØØS loop'}
          </button>
          {error ? (
            <p role="alert" style={{ margin: 0, fontSize: 11, color: '#f87171' }}>
              {error}
            </p>
          ) : null}
        </div>

        {/* Pane 2 — the output contract */}
        <div style={{ flex: '1.4 1 320px', minWidth: 260 }}>
          <span style={labelStyle}>Receipt · output contract</span>
          {receipt ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <strong
                  style={{
                    fontFamily: OCEAN.mono,
                    fontSize: 13,
                    letterSpacing: '0.14em',
                    color: STATUS_COLOR[receipt.status],
                    border: `1px solid ${STATUS_COLOR[receipt.status]}`,
                    borderRadius: 999,
                    padding: '3px 10px',
                  }}
                >
                  {receipt.status}
                </strong>
                <span style={{ fontSize: 10, color: OCEAN.muted, fontFamily: OCEAN.mono }}>
                  phase_t {receipt.phase_t.toFixed(3)} · {receipt.evidence_hash.slice(0, 16)}…
                </span>
              </div>
              <p
                data-testid="voos-intervention"
                style={{
                  margin: '0 0 8px',
                  fontSize: 10,
                  lineHeight: 1.6,
                  color: receipt.game_detected ? '#f87171' : OCEAN.muted,
                  fontFamily: OCEAN.mono,
                  letterSpacing: '0.06em',
                }}
              >
                {receipt.game_detected ? 'SQUIDDIES PROTOCOL · GAME DETECTED' : 'SQUIDDIES PROTOCOL · NO TRAP MATCHED'}
                {' · '}
                {receipt.intervention_action}
              </p>
              <pre
                data-testid="voos-receipt"
                style={{
                  margin: 0,
                  padding: 12,
                  background: OCEAN.panel,
                  border: `1px solid ${OCEAN.border}`,
                  borderRadius: 8,
                  fontFamily: OCEAN.mono,
                  fontSize: 11,
                  lineHeight: 1.6,
                  color: OCEAN.text,
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                  maxHeight: 320,
                  overflow: 'auto',
                }}
              >
                {JSON.stringify(receipt, null, 2)}
              </pre>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: OCEAN.muted }}>
              No receipt yet. The loop returns ENTITY, STATUS, GAME_DETECTED, INTERVENTION_ACTION, EVIDENCE_HASH and NEXT_DELTA.
            </p>
          )}
        </div>

        {/* Pane 3 — the append-only ledger */}
        <div style={{ flex: '1 1 240px', minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ ...labelStyle, marginBottom: 0 }}>KAI Ledger</span>
            <button
              type="button"
              onClick={() => void refresh()}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: `1px solid ${OCEAN.border}`,
                borderRadius: 999,
                color: OCEAN.muted,
                fontSize: 10,
                padding: '2px 8px',
                cursor: 'pointer',
              }}
            >
              Refresh
            </button>
          </div>
          <p
            data-testid="voos-integrity"
            style={{
              margin: '0 0 10px',
              fontSize: 10,
              letterSpacing: '0.1em',
              color: integrity?.valid ? OCEAN.cyan : '#f87171',
              fontFamily: OCEAN.mono,
            }}
          >
            {integrity
              ? integrity.valid
                ? `HASH CHAIN VERIFIED · height ${integrity.height}`
                : `CHAIN BROKEN AT ${integrity.brokenAt ?? '?'} · ${integrity.reason ?? 'integrity failed'}`
              : 'Reading ledger…'}
          </p>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.map((entry) => (
              <li
                key={entry.sequence}
                style={{
                  background: OCEAN.panel,
                  border: `1px solid ${OCEAN.border}`,
                  borderRadius: 6,
                  padding: '8px 10px',
                  fontFamily: OCEAN.mono,
                  fontSize: 10,
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: OCEAN.muted }}>#{entry.sequence}</span>
                  <span style={{ color: STATUS_COLOR[entry.status], letterSpacing: '0.1em' }}>{entry.status}</span>
                  <span style={{ color: OCEAN.muted, marginLeft: 'auto' }}>{entry.evidence_hash.slice(0, 8)}</span>
                </div>
                <div style={{ color: OCEAN.text, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.intent}
                </div>
                <div style={{ color: OCEAN.muted, marginTop: 2 }}>
                  t {entry.phase_t.toFixed(3)} · authorized {entry.authorized ? 'true' : 'false'}
                </div>
              </li>
            ))}
            {entries.length === 0 && integrity ? (
              <li style={{ fontSize: 11, color: OCEAN.muted }}>Ledger is empty. The first receipt starts the chain.</li>
            ) : null}
          </ol>
        </div>
      </div>
    </section>
  );
}
