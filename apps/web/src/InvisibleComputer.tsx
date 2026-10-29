import { useCallback, useEffect, useRef, useState } from 'react';
import { theme } from './oceanicosTheme';

/*
 * ECHOFRAME — the face of the Invisible Online Computer.
 *
 * One input, one live execution terminal, one verdict badge. Every line in the
 * terminal is a step the API actually recorded; nothing is narrated locally.
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
  const [running, setRunning] = useState(false);
  const [verdict, setVerdict] = useState<Verdict>('NOT_EXECUTED');
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [visibleSteps, setVisibleSteps] = useState<ExecutionStep[]>([]);
  const [memoryTotal, setMemoryTotal] = useState<number | null>(null);
  const [memoryRecords, setMemoryRecords] = useState<MemoryRecord[]>([]);
  const [replays, setReplays] = useState<Record<string, { status: Verdict; reason: string | null }>>({});
  const [replayPending, setReplayPending] = useState<string | null>(null);
  const [ledger, setLedger] = useState<{
    status: Verdict;
    verified: number;
    divergent: number;
    unknown: number;
    audited: number;
    total: number;
    notAudited: number;
  } | null>(null);
  const [ledgerPending, setLedgerPending] = useState(false);
  const [ledgerError, setLedgerError] = useState(false);
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

  /*
   * Replay one remembered row: the API recomputes its digest from the retained
   * evidence. A mismatch is shown as DIVERGENT, never smoothed into VERIFIED.
   */
  const replay = async (id: string) => {
    if (replayPending) return;
    setReplayPending(id);
    try {
      const response = await fetch(`${API_BASE_URL}/kai/memory/${id}/replay`);
      const payload = await response.json().catch(() => null);
      setReplays((previous) => ({
        ...previous,
        [id]: {
          status: (payload?.status as Verdict) || 'UNKNOWN',
          reason: typeof payload?.reason === 'string' ? payload.reason : null,
        },
      }));
    } catch {
      setReplays((previous) => ({
        ...previous,
        [id]: { status: 'UNKNOWN', reason: 'REPLAY_UNREACHABLE' },
      }));
    } finally {
      setReplayPending(null);
    }
  };

  /*
   * Audit the whole remembered ledger in one call. The ledger verdict is the
   * worst row audited, and rows beyond the bound are shown as unaudited rather
   * than counted as good memory.
   */
  const auditLedger = async () => {
    if (ledgerPending) return;
    setLedgerPending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/kai/memory/audit`);
      const payload = await response.json().catch(() => null);
      if (!payload || typeof payload.audited !== 'number') throw new Error('malformed audit');
      setLedger({
        status: (payload.status as Verdict) || 'UNKNOWN',
        verified: Number(payload.verified ?? 0),
        divergent: Number(payload.divergent ?? 0),
        unknown: Number(payload.unknown ?? 0),
        audited: Number(payload.audited),
        total: Number(payload.total ?? payload.audited),
        notAudited: Number(payload.not_audited ?? 0),
      });
      setLedgerError(false);
    } catch {
      setLedger(null);
      setLedgerError(true);
    } finally {
      setLedgerPending(false);
    }
  };

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
        body: JSON.stringify({ intent: trimmed }),
      });
      const text = await response.text();
      const payload = text ? JSON.parse(text) : null;
      if (!response.ok) {
        throw new Error(payload?.error || `Execution failed (${response.status})`);
      }
      const execution = payload as ExecutionResult;
      const steps = Array.isArray(execution.steps) ? execution.steps : [];

      // Reveal the recorded steps in order so the terminal reads as execution.
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

      <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
        <input
          aria-label="What shall we make real?"
          value={intent}
          onChange={(event) => setIntent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void execute();
          }}
          maxLength={2000}
          disabled={running}
          placeholder="Describe the intent you want verified…"
          style={{
            flex: 1,
            minWidth: 0,
            padding: '15px 18px',
            background: 'rgba(2, 6, 23, 0.82)',
            border: `1px solid ${theme.borderBright}`,
            borderRadius: theme.radiusSmall,
            color: theme.text,
            fontFamily: theme.fontSans,
            fontSize: '15px',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={() => void execute()}
          disabled={running || !intent.trim()}
          style={{
            padding: '0 20px',
            borderRadius: theme.radiusSmall,
            border: '1px solid rgba(245, 158, 11, 0.45)',
            background:
              running || !intent.trim() ? 'rgba(245, 158, 11, 0.10)' : 'rgba(245, 158, 11, 0.18)',
            color: theme.accentWarm,
            fontFamily: theme.fontSans,
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            cursor: running || !intent.trim() ? 'not-allowed' : 'pointer',
            opacity: running || !intent.trim() ? 0.6 : 1,
          }}
        >
          {running ? 'EXECUTING' : 'EXECUTE'}
        </button>
      </div>

      {/* Live execution terminal */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Execution terminal"
        style={{
          marginTop: '16px',
          minHeight: '128px',
          maxHeight: '248px',
          overflowY: 'auto',
          padding: '12px 14px',
          background: '#01060f',
          border: `1px solid ${theme.border}`,
          borderRadius: theme.radiusSmall,
          fontFamily: theme.fontMono,
          fontSize: '11.5px',
          lineHeight: 1.6,
        }}
      >
        <div style={{ color: theme.textDim }}>
          KAI idle · awaiting intent · ledger memory {memoryTotal ?? '—'}
        </div>
        {visibleSteps.map((step, index) => (
          <div key={`${step.actor}-${step.phase}-${index}`} style={{ color: theme.textMuted }}>
            <span style={{ color: theme.textDim }}>[{clockOf(step.at)}]</span>{' '}
            <span style={{ color: ACTOR_TONE[step.actor], fontWeight: 700 }}>
              {step.actor.padEnd(6, ' ')}
            </span>{' '}
            <span style={{ color: theme.textDim }}>{step.phase.padEnd(8, ' ')}</span>{' '}
            <span style={{ color: STATUS_TONE[(step.status as Verdict) ?? 'NOT_EXECUTED'] ?? theme.textMuted }}>
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
            {result.engine && <span>ELION · {result.engine}</span>}
            {result.memory && <span>REMEMBERED · {result.memory.id.slice(0, 8)}</span>}
          </div>
        </div>
      )}

      {/* Recent memory */}
      {memoryRecords.length > 0 && (
        <div style={{ marginTop: '14px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
              fontFamily: theme.fontMono,
              fontSize: '10px',
              letterSpacing: '0.18em',
              color: theme.textDim,
              marginBottom: '6px',
            }}
          >
            <span>KAI MEMORY · LAST {memoryRecords.length}</span>
            {ledgerError && (
              <span
                data-ledger-audit="UNKNOWN"
                style={{ fontSize: '9.5px', letterSpacing: '0.1em', color: STATUS_TONE.UNKNOWN }}
              >
                LEDGER → UNKNOWN · AUDIT_UNREACHABLE
              </span>
            )}
            {ledger && (
              <span
                data-ledger-audit={ledger.status}
                title={`audited ${ledger.audited} of ${ledger.total} remembered rows`}
                style={{
                  fontSize: '9.5px',
                  letterSpacing: '0.1em',
                  color: STATUS_TONE[ledger.status],
                  whiteSpace: 'nowrap',
                }}
              >
                LEDGER → {ledger.status} · {ledger.verified}V {ledger.divergent}D {ledger.unknown}U
                {ledger.notAudited > 0 ? ` · +${ledger.notAudited} UNAUDITED` : ''}
              </span>
            )}
            <button
              type="button"
              aria-label="Verify ledger"
              onClick={() => void auditLedger()}
              disabled={ledgerPending}
              style={{
                marginLeft: 'auto',
                padding: '2px 8px',
                borderRadius: theme.radiusPill,
                border: `1px solid ${theme.borderBright}`,
                background: 'transparent',
                color: theme.accentDim,
                fontFamily: theme.fontMono,
                fontSize: '9.5px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                cursor: ledgerPending ? 'wait' : 'pointer',
                opacity: ledgerPending ? 0.6 : 1,
              }}
            >
              {ledgerPending ? 'AUDITING' : 'VERIFY LEDGER'}
            </button>
          </div>
          {memoryRecords.map((record) => (
            <div
              key={record.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontFamily: theme.fontMono,
                fontSize: '10.5px',
                color: theme.textDim,
                padding: '2px 0',
              }}
            >
              <span style={{ color: STATUS_TONE[(record.status as Verdict) ?? 'NOT_EXECUTED'] }}>
                {record.status}
              </span>
              <span style={{ color: theme.textMuted, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {record.intent}
              </span>
              <span style={{ color: theme.accentWarm }}>{shortHash(record.evidence_hash)}</span>
              {replays[record.id] && (
                <span
                  title={replays[record.id].reason ?? undefined}
                  data-replay-state={replays[record.id].status}
                  style={{ color: STATUS_TONE[replays[record.id].status], whiteSpace: 'nowrap' }}
                >
                  → {replays[record.id].status}
                  {replays[record.id].reason
                    ? ` · ${replays[record.id].reason.split(':')[0]}`
                    : ''}
                </span>
              )}
              <button
                type="button"
                aria-label={`Replay memory ${record.id}`}
                onClick={() => void replay(record.id)}
                disabled={replayPending === record.id}
                style={{
                  flexShrink: 0,
                  padding: '2px 8px',
                  borderRadius: theme.radiusPill,
                  border: `1px solid ${theme.borderBright}`,
                  background: 'transparent',
                  color: theme.accentDim,
                  fontFamily: theme.fontMono,
                  fontSize: '9.5px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  cursor: replayPending === record.id ? 'wait' : 'pointer',
                  opacity: replayPending === record.id ? 0.6 : 1,
                }}
              >
                {replayPending === record.id ? 'REPLAYING' : 'REPLAY'}
              </button>
            </div>
          ))}
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
          ATT&nbsp;DON&apos;T&nbsp;ASSERT · UNKNOWN&nbsp;PRESERVED
        </span>
      </div>
    </section>
  );
}
