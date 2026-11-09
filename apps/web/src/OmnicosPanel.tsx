import { useState } from 'react';

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

type OmnicosTool = 'BROWSER' | 'API' | 'CODE' | 'LLM' | 'COMMS' | 'DB';
type OmnicosStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';

type Receipt = {
  entity: 'THE_OMNICOS';
  tool_used: OmnicosTool;
  status: OmnicosStatus;
  game_detected: boolean;
  phase_t: number;
  evidence_hash: string | null;
  action: string;
  next_delta: string;
};

type PhaseState = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED' | 'PENDING' | 'UNRECORDED';

const TOOLS: { id: OmnicosTool; label: string }[] = [
  { id: 'BROWSER', label: 'web' },
  { id: 'API', label: 'api' },
  { id: 'CODE', label: 'code' },
  { id: 'LLM', label: 'llm' },
  { id: 'COMMS', label: 'comms' },
  { id: 'DB', label: 'db' },
];

const PHASES = [
  { id: 'PERCEIVE', label: 'PERCEIVE & ALIGN', actor: 'KAI SHIELD' },
  { id: 'CONNECT', label: 'CONNECT & GROW', actor: 'ELION' },
  { id: 'SYNCHRONIZE', label: 'SYNCHRONIZE', actor: 'OMEGA GATE' },
  { id: 'REMEMBER', label: 'EVOLVE & REMEMBER', actor: 'KAI LEDGER' },
] as const;

const PHASE_COLORS: Record<PhaseState, string> = {
  VERIFIED: '#8ce8c8',
  DIVERGENT: '#ffc28f',
  UNKNOWN: '#94a3b8',
  NOT_EXECUTED: '#4d6b70',
  PENDING: '#7fb7c9',
  UNRECORDED: '#ffb3a7',
};

/** The four phases as the receipt proves them — nothing is claimed a step ahead. */
function derivePhases(receipt: Receipt | null, remembered: boolean | null): PhaseState[] {
  if (!receipt) return ['PENDING', 'PENDING', 'PENDING', 'PENDING'];
  if (receipt.status === 'DIVERGENT') return ['DIVERGENT', 'NOT_EXECUTED', 'NOT_EXECUTED', 'NOT_EXECUTED'];
  if (receipt.status === 'UNKNOWN') return ['VERIFIED', 'VERIFIED', 'UNKNOWN', 'NOT_EXECUTED'];
  return ['VERIFIED', 'VERIFIED', 'VERIFIED', remembered === null ? 'PENDING' : remembered ? 'VERIFIED' : 'UNRECORDED'];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
    ...init,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
  return data as T;
}

const paneStyle = {
  border: '1px solid #1d4048',
  borderRadius: '6px',
  background: 'linear-gradient(160deg, #061318, #071c1e)',
  padding: '12px',
  minWidth: 0,
} as const;

const labelStyle = {
  color: '#5f8f96',
  font: '600 9px DM Mono, monospace',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
} as const;

export function OmnicosPanel() {
  const [intent, setIntent] = useState('describe what the singularity eye should verify');
  const [authorityLevel, setAuthorityLevel] = useState<'READ_ONLY' | 'AUTONOMOUS'>('READ_ONLY');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [remembered, setRemembered] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runPass = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await request<Receipt>('/v1/omnios/intent', {
        method: 'POST',
        body: JSON.stringify({ intent, authorityLevel }),
      });
      setReceipt(next);
      setRemembered(null);
      if (next.status === 'VERIFIED' && next.evidence_hash) {
        const memory = await request<{ records: { evidence_hash: string }[] }>('/kai/memory?limit=1');
        setRemembered(memory.records?.[0]?.evidence_hash === next.evidence_hash);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OMNICOS pass failed');
    } finally {
      setBusy(false);
    }
  };

  const phases = derivePhases(receipt, remembered);
  const phaseT = receipt ? receipt.phase_t : 0;
  const statusColor = receipt ? PHASE_COLORS[receipt.status] : '#7fb7c9';

  return (
    <section
      aria-label="The Omnicos singularity eye"
      style={{ marginBottom: '22px', border: '1px solid #1f4c5a', borderRadius: '8px', background: 'linear-gradient(135deg, #04101a, #06201f)', padding: '16px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: '#8ecdf0', fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em' }}>
            👁️ THE OMNICOS · SINGULARITY EYE
          </div>
          <div style={{ color: '#87aaa2', fontSize: '11px', marginTop: '4px' }}>
            OCEANICOS (fluid) · GAIACOS (planetary) · COSMICOS (cosmic) — one pass, four phases, one receipt
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ ...labelStyle, border: '1px solid #2b5560', borderRadius: '999px', padding: '3px 8px', letterSpacing: '0.12em' }}>
            {receipt ? receipt.entity : '30013030'}
          </span>
          <span
            style={{
              font: '700 10px DM Mono, monospace',
              color: statusColor,
              border: `1px solid ${statusColor}55`,
              background: `${statusColor}11`,
              borderRadius: '4px',
              padding: '4px 8px',
            }}
          >
            {receipt ? receipt.status : 'AWAITING INTENT'}
          </span>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: '10px', color: '#ffb3a7', font: '11px DM Mono, monospace' }}>{error}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '10px', marginTop: '14px' }}>
        {/* Pane 1 — INTENT */}
        <div style={paneStyle}>
          <div style={labelStyle}>I · intent</div>
          <textarea
            aria-label="Omnicos intent"
            value={intent}
            onChange={(event) => setIntent(event.target.value)}
            rows={3}
            style={{
              width: '100%',
              marginTop: '8px',
              resize: 'vertical',
              border: '1px solid #24505a',
              borderRadius: '4px',
              background: '#04121a',
              color: '#d8f3ec',
              font: '11px DM Mono, monospace',
              padding: '7px 8px',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            {(['READ_ONLY', 'AUTONOMOUS'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setAuthorityLevel(level)}
                style={{
                  flex: 1,
                  border: `1px solid ${authorityLevel === level ? '#3f8ea0' : '#234750'}`,
                  background: authorityLevel === level ? '#0d2b30' : 'transparent',
                  color: authorityLevel === level ? '#9fe0dc' : '#6f949a',
                  borderRadius: '4px',
                  padding: '5px 6px',
                  font: '600 9px DM Mono, monospace',
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                }}
              >
                {level.replace('_', '-')}
              </button>
            ))}
          </div>
          <div style={{ ...labelStyle, marginTop: '10px' }}>limbs</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
            {TOOLS.map((tool) => {
              const active = receipt?.tool_used === tool.id;
              return (
                <span
                  key={tool.id}
                  title={`${tool.id} — declared routing limb`}
                  style={{
                    border: `1px solid ${active ? '#4f9fb2' : '#1f4149'}`,
                    background: active ? '#0e3038' : 'transparent',
                    color: active ? '#a9e6ff' : '#5f8f96',
                    borderRadius: '999px',
                    padding: '2px 7px',
                    font: '9px DM Mono, monospace',
                    letterSpacing: '0.1em',
                  }}
                >
                  {tool.label}
                </span>
              );
            })}
          </div>
          <button
            onClick={runPass}
            disabled={busy || !intent.trim()}
            style={{
              width: '100%',
              marginTop: '10px',
              border: '1px solid #4a9aae',
              background: busy ? '#0a2228' : 'linear-gradient(90deg, #0d3a44, #124d4a)',
              color: busy ? '#6f949a' : '#c9f5ee',
              borderRadius: '4px',
              padding: '7px 10px',
              font: '700 10px DM Mono, monospace',
              letterSpacing: '0.14em',
              cursor: busy ? 'default' : 'pointer',
            }}
          >
            {busy ? 'PERCEIVING…' : 'PERCEIVE'}
          </button>
        </div>

        {/* Pane 2 — FSM */}
        <div style={paneStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={labelStyle}>II · finite state machine</div>
            <span style={{ color: '#7fb7c9', font: '10px DM Mono, monospace' }}>Ease(t) {phaseT.toFixed(4)}</span>
          </div>
          <div style={{ height: '3px', background: '#0d262c', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.round(phaseT * 100)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #2d7f8c, #8ce8c8)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {PHASES.map((phase, index) => {
              const state = phases[index];
              return (
                <div key={phase.id} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span
                    aria-hidden
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: PHASE_COLORS[state],
                      boxShadow: state === 'PENDING' ? 'none' : `0 0 6px ${PHASE_COLORS[state]}66`,
                      flex: '0 0 auto',
                    }}
                  />
                  <span style={{ color: '#c2e2dc', font: '10px DM Mono, monospace', flex: 1, minWidth: 0 }}>
                    {phase.label}
                  </span>
                  <span style={{ color: '#54787f', font: '8px DM Mono, monospace', letterSpacing: '0.08em' }}>{phase.actor}</span>
                  <span style={{ color: PHASE_COLORS[state], font: '700 8px DM Mono, monospace', letterSpacing: '0.06em' }}>
                    {state}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ ...labelStyle, marginTop: '10px' }}>next Δ</div>
          <div style={{ color: '#9fc4c0', font: '10px DM Mono, monospace', lineHeight: 1.5, marginTop: '4px' }}>
            {receipt ? receipt.next_delta : 'nothing runs unattended — an empty pass is not a pass'}
          </div>
        </div>

        {/* Pane 3 — RECEIPT */}
        <div style={paneStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={labelStyle}>III · receipt</div>
            <span style={{ color: receipt?.game_detected ? '#ffc28f' : '#54787f', font: '9px DM Mono, monospace' }}>
              game_detected: {receipt ? String(receipt.game_detected) : '—'}
            </span>
          </div>
          <pre
            aria-label="Omnicos receipt"
            style={{
              margin: '8px 0 0',
              padding: '8px',
              minHeight: '150px',
              maxHeight: '220px',
              overflow: 'auto',
              borderRadius: '4px',
              background: '#04121a',
              border: '1px solid #17343c',
              color: '#9fe0dc',
              font: '9.5px DM Mono, monospace',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {receipt
              ? JSON.stringify(receipt, null, 2)
              : '{\n  "entity": "THE_OMNICOS",\n  "status": "AWAITING_INTENT"\n}'}
          </pre>
          <div style={{ color: '#54787f', font: '8.5px DM Mono, monospace', marginTop: '6px', lineHeight: 1.5 }}>
            BROWSER performs one bounded read of the URL in the intent; every other limb is a declared route. Only a VERIFIED receipt is appended to the KAI ledger.
          </div>
        </div>
      </div>
    </section>
  );
}
