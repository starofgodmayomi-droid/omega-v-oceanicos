import { useCallback, useEffect, useRef, useState } from 'react';
import { theme } from './oceanicosTheme';

/*
 * ECHOFRAME — the face of the Invisible Online Computer.
 *
 * The command center is three panes:
 *   Left  — the intent input and the engine selector (Claude / GPT).
 *   Right — the KAI ledger: time, intent, hash, status of verified transitions.
 *   Bottom— the live execution log.
 *
 * Every line in the log is a step the API actually recorded; nothing is
 * narrated locally.
 */

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

export type Verdict = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';
export type EngineChoice = 'claude' | 'gpt';

type ExecutionStep = {
  actor: 'KAI' | 'ELION' | 'OMEGA';
  phase: string;
  status: string;
  detail: string;
  at: string;
  elapsedMs: number;
};

type ExecutionResult = {
  status: Verdict;
  intent: string;
  response: string | null;
  evidence_hash: string | null;
  reason: string | null;
  matched_patterns: string[];
  steps: ExecutionStep[];
  contract: { id: string; authority_level: string; expected_outcome: string } | null;
  memory: { id: string; timestamp: string } | null;
  engine: string | null;
  requested_engine: EngineChoice | 'auto' | null;
};

type MemoryRecord = {
  id: string;
  timestamp: string;
  intent: string;
  evidence_hash: string;
  status: string;
};

const LEDGER_LIMIT = 8;

const STATUS_TONE: Record<Verdict, string> = {
  VERIFIED: '#22c55e',
  DIVERGENT: '#ef4444',
  UNKNOWN: '#eab308',
  NOT_EXECUTED: '#64748b',
};

const ACTOR_TONE: Record<ExecutionStep['actor'], string> = {
  KAI: theme.accent,
  ELION: theme.accentWarm,
  OMEGA: '#a78bfa',
};

const ENGINES: { id: EngineChoice; label: string }[] = [
  { id: 'claude', label: 'CLAUDE' },
  { id: 'gpt', label: 'GPT' },
];

const STEP_REVEAL_MS = 240;

function clockOf(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '--:--:--' : date.toISOString().slice(11, 19);
}

function shortHash(hash: string | null): string {
  if (!hash) return '—';
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

const paneLabelStyle = {
  fontFamily: theme.fontMono,
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.18em',
  color: theme.textDim,
  textTransform: 'uppercase' as const,
  marginBottom: '10px',
};

const paneStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  minWidth: 0,
  padding: '14px 16px',
  background: 'rgba(2, 6, 23, 0.72)',
  border: `1px solid ${theme.border}`,
  borderRadius: theme.radiusSmall,
};

export function InvisibleComputer() {
  const [intent, setIntent] = useState('');
  const [engine, setEngine] = useState<EngineChoice>('gpt');
  const [running, setRunning] = useState(false);
  const [verdict, setVerdict] = useState<Verdict>('NOT_EXECUTED');
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [visibleSteps, setVisibleSteps] = useState<ExecutionStep[]>([]);
  const [memoryTotal, setMemoryTotal] = useState<number | null>(null);
  const [memoryRecords, setMemoryRecords] = useState<MemoryRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current = [];
  };

  const loadMemory = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/kai/memory?limit=${LEDGER_LIMIT}`);
      if (!response.ok) return;
      const payload = await response.json();
      setMemoryTotal(typeof payload?.total === 'number' ? payload.total : null);
      setMemoryRecords(Array.isArray(payload?.records) ? payload.records : []);
    } catch {
      /* memory is ambient — a read failure must not break the surface */
    }
  }, []);

  useEffect(() => {
    void loadMemory();
    return clearTimers;
  }, [loadMemory]);

  const execute = async () => {
    const trimmed = intent.trim();
    if (!trimmed || running) return;
    clearTimers();
    setRunning(true);
    setError(null);
    setResult(null);
    setVerdict('NOT_EXECUTED');
    setVisibleSteps([]);

    try {
      const response = await fetch(`${API_BASE_URL}/execute`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intent: trimmed, engine }),
      });
      const text = await response.text();
      const payload = text ? JSON.parse(text) : null;
      if (!response.ok) {
        throw new Error(payload?.error || `Execution failed (${response.status})`);
      }
      const execution = payload as ExecutionResult;
      const steps = Array.isArray(execution.steps) ? execution.steps : [];

      // Reveal the recorded steps in order so the log reads as execution.
      steps.forEach((step, index) => {
        timers.current.push(
          setTimeout(() => {
            setVisibleSteps((previous) => [...previous, step]);
            if (index === steps.length - 1) {
              setResult(execution);
              setVerdict(execution.status);
              setRunning(false);
              void loadMemory();
            }
          }, index * STEP_REVEAL_MS)
        );
      });

      if (steps.length === 0) {
        setResult(execution);
        setVerdict(execution.status);
        setRunning(false);
        void loadMemory();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution failed');
      setRunning(false);
    }
  };

  const badgeTone = STATUS_TONE[verdict];

  return (
    <section
      aria-label="Invisible Online Computer"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse 120% 90% at 50% -30%, rgba(6, 182, 212, 0.20) 0%, rgba(2, 6, 23, 0.94) 62%), #030a18',
        border: `1px solid ${theme.borderBright}`,
        borderRadius: '20px',
        boxShadow: '0 0 0 1px rgba(245, 158, 11, 0.08), 0 24px 60px rgba(2, 6, 23, 0.7)',
        padding: '26px 22px 0',
        marginBottom: '28px',
      }}
    >
      <div
        style={{
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.28em',
          color: theme.accent,
          textAlign: 'center',
          textTransform: 'uppercase',
          marginBottom: '14px',
        }}
      >
        Ω∞v OCEANICOS · Invisible Online Computer
      </div>

      <div
        style={{
          fontFamily: theme.fontMono,
          fontSize: '9.5px',
          color: theme.textDim,
          textAlign: 'center',
          lineHeight: 1.7,
          marginBottom: '14px',
          padding: '0 10px',
          opacity: 0.75,
        }}
      >
        <div style={{ color: theme.accent, opacity: 0.7 }}>
          Ω∞v = Y(λf.λx. f(Σ ∪ Hash(x)) ⟂ HALT ⊢ DIVERGENT · UNKNOWN · NOT_EXECUTED)
        </div>
        <div>
          Reality := Y(λf. M_t+1 = M_t ∪ Δ ∣ V(Δ) = ⊤) · V ≡ (Expected ≡ Observed)
        </div>
        <div style={{ fontStyle: 'italic', color: theme.textMuted, marginTop: '3px' }}>
          "only remembers what matches reality"
        </div>
      </div>

      <h2
        style={{
          fontSize: '24px',
          fontWeight: 600,
          letterSpacing: '0.04em',
          textAlign: 'center',
          color: theme.text,
          margin: '0 0 20px',
        }}
      >
        WHAT SHALL WE MAKE REAL?
      </h2>

      <div className="ioc-panes">
        {/* Left pane — intent + engine */}
        <div className="ioc-pane" style={paneStyle} aria-label="Intent">
          <div style={paneLabelStyle}>Intent</div>
          <textarea
            aria-label="What shall we make real?"
            value={intent}
            onChange={(event) => setIntent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void execute();
              }
            }}
            rows={4}
            maxLength={2000}
            disabled={running}
            placeholder="Describe the intent you want verified…"
            style={{
              flex: 1,
              minHeight: '96px',
              resize: 'vertical',
              padding: '13px 15px',
              background: 'rgba(2, 6, 23, 0.82)',
              border: `1px solid ${theme.borderBright}`,
              borderRadius: theme.radiusSmall,
              color: theme.text,
              fontFamily: theme.fontSans,
              fontSize: '14.5px',
              lineHeight: 1.5,
              outline: 'none',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '12px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                ...paneLabelStyle,
                marginBottom: 0,
                marginRight: '2px',
              }}
            >
              Engine
            </span>
            {ENGINES.map((option) => {
              const active = engine === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  data-engine={option.id}
                  aria-pressed={active}
                  onClick={() => setEngine(option.id)}
                  disabled={running}
                  style={{
                    padding: '6px 14px',
                    borderRadius: theme.radiusPill,
                    border: `1px solid ${active ? 'rgba(6, 182, 212, 0.55)' : theme.border}`,
                    background: active ? 'rgba(6, 182, 212, 0.16)' : 'transparent',
                    color: active ? theme.accent : theme.textMuted,
                    fontFamily: theme.fontMono,
                    fontSize: '10.5px',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    cursor: running ? 'not-allowed' : 'pointer',
                    opacity: running ? 0.6 : 1,
                  }}
                >
                  {option.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => void execute()}
              disabled={running || !intent.trim()}
              style={{
                marginLeft: 'auto',
                padding: '8px 20px',
                borderRadius: theme.radiusPill,
                border: '1px solid rgba(245, 158, 11, 0.45)',
                background:
                  running || !intent.trim()
                    ? 'rgba(245, 158, 11, 0.10)'
                    : 'rgba(245, 158, 11, 0.18)',
                color: theme.accentWarm,
                fontFamily: theme.fontSans,
                fontSize: '11.5px',
                fontWeight: 700,
                letterSpacing: '0.14em',
                cursor: running || !intent.trim() ? 'not-allowed' : 'pointer',
                opacity: running || !intent.trim() ? 0.6 : 1,
              }}
            >
              {running ? 'EXECUTING' : 'EXECUTE'}
            </button>
          </div>
        </div>

        {/* Right pane — KAI ledger */}
        <div className="ioc-pane" style={paneStyle} aria-label="KAI ledger">
          <div style={{ ...paneLabelStyle, display: 'flex', justifyContent: 'space-between' }}>
            <span>KAI Ledger</span>
            <span style={{ color: theme.accentWarm }}>{memoryTotal ?? '—'} VERIFIED</span>
          </div>

          <div
            style={{
              fontFamily: theme.fontMono,
              fontSize: '9px',
              letterSpacing: '0.14em',
              color: theme.textDim,
              paddingBottom: '6px',
              borderBottom: `1px solid ${theme.border}`,
              textTransform: 'uppercase',
            }}
          >
            Time · Intent · Hash · Status
          </div>

          <div
            aria-label="KAI ledger entries"
            style={{
              flex: 1,
              minHeight: '96px',
              maxHeight: '212px',
              overflowY: 'auto',
              paddingTop: '2px',
            }}
          >
            {memoryRecords.length === 0 && (
              <div
                style={{
                  padding: '18px 4px',
                  fontFamily: theme.fontMono,
                  fontSize: '10.5px',
                  color: theme.textDim,
                }}
              >
                No verified transitions yet. Only what OMEGA verifies is written here.
              </div>
            )}
            {memoryRecords.map((record) => (
              <div
                key={record.id}
                data-status={record.status}
                className="ioc-ledger-row"
                style={{
                  fontFamily: theme.fontMono,
                  fontSize: '10.5px',
                  borderBottom: '1px solid rgba(6, 182, 212, 0.07)',
                }}
              >
                <div className="ioc-ledger-line">
                  <span style={{ color: theme.textDim }}>{clockOf(record.timestamp)}</span>
                  <span
                    style={{
                      color: STATUS_TONE[(record.status as Verdict) ?? 'NOT_EXECUTED'],
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                    }}
                  >
                    {record.status}
                  </span>
                </div>
                <div className="ioc-ledger-intent" title={record.intent} style={{ color: theme.textMuted }}>
                  {record.intent}
                </div>
                <div
                  className="ioc-ledger-hash"
                  style={{ color: theme.accentWarm, letterSpacing: '0.04em' }}
                >
                  {shortHash(record.evidence_hash)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom pane — execution log */}
      <div className="ioc-pane" style={{ ...paneStyle, marginTop: '12px' }} aria-label="Execution log">
        <div style={{ ...paneLabelStyle, display: 'flex', justifyContent: 'space-between' }}>
          <span>Execution Log</span>
          <span>KAI → ELION → OMEGA → KAI</span>
        </div>
        <div
          role="log"
          aria-live="polite"
          aria-label="Execution terminal"
          style={{
            minHeight: '112px',
            maxHeight: '228px',
            overflowY: 'auto',
            padding: '10px 12px',
            background: '#01060f',
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radiusSmall,
            fontFamily: theme.fontMono,
            fontSize: '11.5px',
            lineHeight: 1.6,
          }}
        >
          <div style={{ color: theme.textDim }}>
            KAI idle · awaiting intent · engine {engine.toUpperCase()} · ledger memory{' '}
            {memoryTotal ?? '—'}
          </div>
          {visibleSteps.map((step, index) => (
            <div key={`${step.actor}-${step.phase}-${index}`} style={{ color: theme.textMuted }}>
              <span style={{ color: theme.textDim }}>[{clockOf(step.at)}]</span>{' '}
              <span style={{ color: ACTOR_TONE[step.actor], fontWeight: 700 }}>
                {step.actor.padEnd(6, ' ')}
              </span>{' '}
              <span style={{ color: theme.textDim }}>{step.phase.padEnd(8, ' ')}</span>{' '}
              <span
                style={{
                  color: STATUS_TONE[(step.status as Verdict) ?? 'NOT_EXECUTED'] ?? theme.textMuted,
                }}
              >
                {step.status}
              </span>{' '}
              <span>{step.detail}</span>
            </div>
          ))}
          {running && (
            <div style={{ color: theme.accent }}>
              <span style={{ animation: 'none' }}>▍</span> executing…
            </div>
          )}
          {error && <div style={{ color: theme.divergent }}>✕ {error}</div>}
        </div>
      </div>

      {/* Verified answer */}
      {result && (
        <div style={{ marginTop: '16px' }}>
          {result.response && (
            <pre
              style={{
                margin: 0,
                padding: '14px 16px',
                background: 'rgba(6, 182, 212, 0.06)',
                border: `1px solid ${theme.border}`,
                borderRadius: theme.radiusSmall,
                color: theme.text,
                fontFamily: theme.fontSans,
                fontSize: '13px',
                lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {result.response}
            </pre>
          )}
          {result.reason && (
            <p
              style={{
                margin: '10px 0 0',
                color: STATUS_TONE[result.status],
                fontSize: '12.5px',
              }}
            >
              {result.reason}
            </p>
          )}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px 18px',
              marginTop: '12px',
              fontFamily: theme.fontMono,
              fontSize: '10.5px',
              color: theme.textDim,
              letterSpacing: '0.04em',
            }}
          >
            <span>
              EVIDENCE · SHA-256{' '}
              <span style={{ color: theme.accentWarm, wordBreak: 'break-all' }}>
                {result.evidence_hash ?? '—'}
              </span>
            </span>
            {result.contract && (
              <span>
                CONTRACT · {result.contract.authority_level} ·{' '}
                {result.contract.id.slice(0, 8)}
              </span>
            )}
            {result.engine && (
              <span>
                ELION · {result.engine}
                {result.requested_engine && result.requested_engine !== 'auto'
                  ? ` · requested ${result.requested_engine.toUpperCase()}`
                  : ''}
              </span>
            )}
            {result.memory && <span>REMEMBERED · {result.memory.id.slice(0, 8)}</span>}
          </div>
        </div>
      )}

      {/* Bottom status bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          margin: '20px -22px 0',
          padding: '12px 22px',
          borderTop: `1px solid ${theme.border}`,
          background: 'rgba(2, 6, 23, 0.72)',
        }}
      >
        <span
          data-state={verdict}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            borderRadius: theme.radiusPill,
            border: `1px solid ${badgeTone}66`,
            background: `${badgeTone}14`,
            color: badgeTone,
            fontFamily: theme.fontMono,
            fontSize: '10.5px',
            fontWeight: 700,
            letterSpacing: '0.16em',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: badgeTone,
              display: 'inline-block',
            }}
          />
          {verdict}
        </span>
        <span style={{ fontSize: '11px', color: theme.textDim }}>
          Pidgin fit carry the warmth; evidence go carry the claim.
        </span>
      </div>
    </section>
  );
}
