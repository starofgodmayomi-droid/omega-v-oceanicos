import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { theme } from './oceanicosTheme';

/*
 * ECHOFRAME — the face of the Entity OS Body.
 *
 * Three panes, one law: THE INTENT goes in, KAI LEDGER holds what was proven,
 * EXECUTION LOG shows the steps the API actually recorded. Nothing is
 * narrated locally — every line is read back from the loop.
 */

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

export type Verdict = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

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
  upgrade?: {
    execution: 'NOT_EXECUTED';
    selected: { id: string } | null;
  };
};

type MemoryRecord = {
  id: string;
  timestamp: string;
  intent: string;
  evidence_hash: string;
  status: string;
};

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

const STEP_REVEAL_MS = 240;

const paneStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  padding: '14px',
  border: `1px solid ${theme.border}`,
  borderRadius: theme.radiusSmall,
  background: 'rgba(2, 6, 23, 0.55)',
};

const paneLabelStyle: CSSProperties = {
  fontFamily: theme.fontMono,
  fontSize: '9.5px',
  fontWeight: 700,
  letterSpacing: '0.22em',
  color: theme.accent,
  textTransform: 'uppercase',
  marginBottom: '10px',
};

function clockOf(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '--:--:--' : date.toISOString().slice(11, 19);
}

function shortHash(hash: string | null): string {
  if (!hash) return '—';
  return `${hash.slice(0, 12)}…${hash.slice(-8)}`;
}

export function InvisibleComputer() {
  const [intent, setIntent] = useState('');
  const [useExternalModel, setUseExternalModel] = useState(false);
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
      const response = await fetch(`${API_BASE_URL}/kai/memory?limit=5`);
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
        body: JSON.stringify({ intent: trimmed, useExternalModel }),
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
            }
          }, index * STEP_REVEAL_MS)
        );
      });

      if (steps.length === 0) {
        setResult(execution);
        setVerdict(execution.status);
        setRunning(false);
      }

      if (execution.status === 'VERIFIED') void loadMemory();
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
        padding: '22px 20px 0',
        marginBottom: '28px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '6px',
          marginBottom: '16px',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.28em',
            color: theme.accent,
            textTransform: 'uppercase',
          }}
        >
          Ω∞v OCEANICOS · Clean Ocean Command Center
        </span>
        <span
          style={{
            fontFamily: theme.fontMono,
            fontSize: '9px',
            letterSpacing: '0.12em',
            color: theme.textDim,
          }}
        >
          LOCAL-FIRST SOVEREIGN ENTITY · CHECKSUM 30013030
        </span>
      </div>

      <div className="entity-command-center">
        {/* Pane 1 — THE INTENT */}
        <div style={paneStyle}>
          <div style={paneLabelStyle}>The Intent</div>
          <label
            htmlFor="entity-intent"
            style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '6px' }}
          >
            What shall we make real?
          </label>
          <textarea
            id="entity-intent"
            aria-label="What shall we make real?"
            value={intent}
            onChange={(event) => setIntent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void execute();
              }
            }}
            maxLength={2000}
            disabled={running}
            rows={6}
            placeholder="Describe the intent you want verified…"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              resize: 'vertical',
              minHeight: '128px',
              padding: '12px 14px',
              background: 'rgba(2, 6, 23, 0.82)',
              border: `1px solid ${theme.borderBright}`,
              borderRadius: theme.radiusSmall,
              color: theme.text,
              fontFamily: theme.fontSans,
              fontSize: '14px',
              lineHeight: 1.55,
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={() => void execute()}
            disabled={running || !intent.trim()}
            style={{
              marginTop: '10px',
              width: '100%',
              padding: '11px 18px',
              borderRadius: theme.radiusSmall,
              border: '1px solid rgba(245, 158, 11, 0.45)',
              background:
                running || !intent.trim() ? 'rgba(245, 158, 11, 0.10)' : 'rgba(245, 158, 11, 0.18)',
              color: theme.accentWarm,
              fontFamily: theme.fontMono,
              fontSize: '11.5px',
              fontWeight: 700,
              letterSpacing: '0.16em',
              cursor: running || !intent.trim() ? 'not-allowed' : 'pointer',
              opacity: running || !intent.trim() ? 0.6 : 1,
            }}
          >
            {running ? 'EXECUTING' : 'EXECUTE'}
          </button>
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginTop: '10px',
              color: theme.textDim,
              fontSize: '10.5px',
              lineHeight: 1.5,
            }}
          >
            <input
              type="checkbox"
              checked={useExternalModel}
              onChange={(event) => setUseExternalModel(event.target.checked)}
              disabled={running}
              style={{ marginTop: '2px' }}
            />
            <span>
              Send this intent to the server-configured external model. Unchecked keeps the local
              deterministic composer. The intent is sent as entered; it is not automatically
              redacted.
            </span>
          </label>
        </div>

        {/* Pane 2 — KAI LEDGER */}
        <div style={paneStyle}>
          <div style={{ ...paneLabelStyle, display: 'flex', justifyContent: 'space-between' }}>
            <span>Kai Ledger</span>
            <span style={{ color: theme.textDim, letterSpacing: '0.08em' }}>
              {memoryTotal ?? '—'} SEALED
            </span>
          </div>
          <div
            role="list"
            aria-label="Kai ledger memory"
            style={{ flex: 1, minHeight: '128px', maxHeight: '238px', overflowY: 'auto' }}
          >
            {memoryRecords.length === 0 && (
              <p style={{ margin: 0, color: theme.textDim, fontSize: '11.5px', lineHeight: 1.55 }}>
                Nothing sealed yet. Only a VERIFIED cycle is remembered; a blocked or unverified
                intent writes nothing.
              </p>
            )}
            {memoryRecords.map((record) => (
              <div
                key={record.id}
                role="listitem"
                style={{
                  padding: '6px 0',
                  borderBottom: `1px solid ${theme.border}`,
                  fontFamily: theme.fontMono,
                  fontSize: '10px',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ color: theme.textDim }}>{clockOf(record.timestamp)}</span>
                  <span
                    style={{
                      color: STATUS_TONE[(record.status as Verdict) ?? 'NOT_EXECUTED'],
                      fontWeight: 700,
                    }}
                  >
                    {record.status}
                  </span>
                </div>
                <div
                  style={{
                    color: theme.textMuted,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={record.intent}
                >
                  {record.intent}
                </div>
                <div style={{ color: theme.accentWarm }}>{shortHash(record.evidence_hash)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pane 3 — EXECUTION LOG */}
        <div style={paneStyle}>
          <div style={paneLabelStyle}>Execution Log</div>
          <div
            role="log"
            aria-live="polite"
            aria-label="Execution terminal"
            style={{
              flex: 1,
              minHeight: '128px',
              maxHeight: '238px',
              overflowY: 'auto',
              padding: '10px 12px',
              background: '#01060f',
              border: `1px solid ${theme.border}`,
              borderRadius: theme.radiusSmall,
              fontFamily: theme.fontMono,
              fontSize: '10.5px',
              lineHeight: 1.6,
              wordBreak: 'break-word',
            }}
          >
            <div style={{ color: theme.textDim }}>
              KAI idle · awaiting intent · ledger memory {memoryTotal ?? '—'}
            </div>
            {visibleSteps.map((step, index) => (
              <div key={`${step.actor}-${step.phase}-${index}`} style={{ color: theme.textMuted }}>
                <span style={{ color: theme.textDim }}>[{clockOf(step.at)}]</span>{' '}
                <span style={{ color: ACTOR_TONE[step.actor], fontWeight: 700 }}>{step.actor}</span>{' '}
                <span style={{ color: theme.textDim }}>{step.phase}</span>{' '}
                <span
                  style={{
                    color:
                      STATUS_TONE[(step.status as Verdict) ?? 'NOT_EXECUTED'] ?? theme.textMuted,
                  }}
                >
                  {step.status}
                </span>{' '}
                <span>{step.detail}</span>
              </div>
            ))}
            {running && <div style={{ color: theme.accent }}>▍ executing…</div>}
            {error && <div style={{ color: theme.divergent }}>✕ {error}</div>}
          </div>
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
                CONTRACT · {result.contract.authority_level} · {result.contract.id.slice(0, 8)}
              </span>
            )}
            {result.engine && <span>ELION · {result.engine}</span>}
            {result.memory && <span>REMEMBERED · {result.memory.id.slice(0, 8)}</span>}
            {result.upgrade && (
              <span>
                UPGRADE · {result.upgrade.execution}
                {result.upgrade.selected ? ` · ${result.upgrade.selected.id}` : ' · none'}
              </span>
            )}
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
          margin: '20px -20px 0',
          padding: '12px 20px',
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
          Pidgin fit carry the warmth · evidence go carry the claim
        </span>
      </div>
    </section>
  );
}
