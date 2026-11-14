import { useCallback, useEffect, useRef, useState } from 'react';
import { theme } from './oceanicosTheme';
import type { ConnectorAuth } from './ConnectorPanel';
import { apiFetch } from './api-client';
import './InvisibleComputer.css';

/*
 * ECHOFRAME — the face of the Invisible Online Computer.
 *
 * One input, one live execution terminal, one verdict badge. Every line in the
 * terminal is a step the API actually recorded; nothing is narrated locally.
 */

const API_BASE_URL = (import.meta.env?.VITE_API_URL ?? '/api').replace(/\/$/, '');

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

type WitnessSnapshot = {
  capturedAt: string;
  source: string;
  status: Verdict;
  intent: string;
  evidenceHash: string | null;
  contractId: string | null;
  engine: string | null;
  recordedStepCount: number;
  attestation: 'NOT_REQUESTED';
};

type MemoryRecord = {
  id: string;
  timestamp: string;
  intent: string;
  evidence_hash: string;
  status: string;
};

type LocalActionId = 'repo-status' | 'web-build' | 'web-tests';

type LocalActionRun = {
  id: string;
  actionId: LocalActionId;
  label: string;
  status: 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'OUTPUT_LIMIT';
  durationMs: number;
  exitCode: number | null;
  output: string;
  outputTruncated: boolean;
};

const LOCAL_ACTIONS: Array<{ id: LocalActionId; label: string }> = [
  { id: 'repo-status', label: 'Check Status' },
  { id: 'web-build', label: 'Build Web' },
  { id: 'web-tests', label: 'Run Web Tests' },
];

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

export function InvisibleComputer({ auth }: { auth?: ConnectorAuth }) {
  return <OmegaConsole auth={auth} />;
}

export function OmegaConsole({ auth }: { auth?: ConnectorAuth } = {}) {
  const [intent, setIntent] = useState('');
  const [useExternalModel, setUseExternalModel] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [verdict, setVerdict] = useState<Verdict>('NOT_EXECUTED');
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [witnessSnapshot, setWitnessSnapshot] = useState<WitnessSnapshot | null>(null);
  const [visibleSteps, setVisibleSteps] = useState<ExecutionStep[]>([]);
  const [memoryTotal, setMemoryTotal] = useState<number | null>(null);
  const [memoryRecords, setMemoryRecords] = useState<MemoryRecord[]>([]);
  const [localActionsEnabled, setLocalActionsEnabled] = useState<boolean | null>(null);
  const [localActionRuns, setLocalActionRuns] = useState<LocalActionRun[]>([]);
  const [activeLocalAction, setActiveLocalAction] = useState<LocalActionId | null>(null);
  const [localActionError, setLocalActionError] = useState<string | null>(null);
  const [localActionAccessError, setLocalActionAccessError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current = [];
  };

  const loadMemory = useCallback(async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/kai/memory?limit=5`);
      if (!response.ok) return;
      const payload = await response.json();
      setMemoryTotal(typeof payload?.total === 'number' ? payload.total : null);
      setMemoryRecords(Array.isArray(payload?.records) ? payload.records : []);
    } catch {
      /* memory is ambient — a read failure must not break the surface */
    }
  }, []);

  const loadLocalActions = useCallback(async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/v1/local-actions`);
      if (!response.ok) throw new Error(`Local action access failed (${response.status})`);
      const payload = await response.json();
      setLocalActionsEnabled(payload?.enabled === true);
      setLocalActionAccessError(
        payload?.enabled === true ? null : 'Enable the local runner with required API auth to use these actions.'
      );
    } catch (err) {
      setLocalActionsEnabled(null);
      setLocalActionAccessError(err instanceof Error ? err.message : 'Local action access is unknown.');
    }

    try {
      const response = await apiFetch(`${API_BASE_URL}/v1/local-actions/runs`);
      if (!response.ok) return;
      const payload = await response.json();
      if (Array.isArray(payload?.runs)) setLocalActionRuns(payload.runs);
    } catch {
      /* recent local runs are optional evidence */
    }
  }, []);

  useEffect(() => {
    if (auth?.isLoading || (auth && !auth.isAuthenticated)) return;
    void loadMemory();
    void loadLocalActions();
    return clearTimers;
  }, [auth?.isAuthenticated, auth?.isLoading, loadMemory, loadLocalActions]);

  const execute = async () => {
    const trimmed = intent.trim();
    if (!trimmed || running) return;
    clearTimers();
    setRunning(true);
    setError(null);
    setResult(null);
    setWitnessSnapshot(null);
    setVerdict('NOT_EXECUTED');
    setVisibleSteps([]);

    try {
      const response = await apiFetch(`${API_BASE_URL}/execute`, {
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

  const witness = () => {
    if (!result || running) return;
    setWitnessSnapshot({
      capturedAt: new Date().toISOString(),
      source: `${API_BASE_URL}/execute response`,
      status: result.status,
      intent: result.intent,
      evidenceHash: result.evidence_hash,
      contractId: result.contract?.id ?? null,
      engine: result.engine,
      recordedStepCount: result.steps.length,
      attestation: 'NOT_REQUESTED',
    });
  };

  const runLocalAction = async (actionId: LocalActionId) => {
    if (!canRunLocalActions || activeLocalAction) return;
    setActiveLocalAction(actionId);
    setLocalActionError(null);
    try {
      const response = await apiFetch(
        `${API_BASE_URL}/v1/local-actions/${encodeURIComponent(actionId)}/run`,
        { method: 'POST' }
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || `Action failed (${response.status})`);
      if (payload?.run) {
        setLocalActionRuns((previous) => [
          payload.run,
          ...previous.filter((run) => run.id !== payload.run.id),
        ].slice(0, 20));
      }
    } catch (err) {
      setLocalActionError(err instanceof Error ? err.message : 'Local action failed');
    } finally {
      setActiveLocalAction(null);
    }
  };

  const badgeTone = STATUS_TONE[verdict];
  const canRunLocalActions = localActionsEnabled === true && (!auth || auth.isAuthenticated);
  const inspectorState = {
    'Σ': {
      verdict,
      localActions: localActionsEnabled === true ? 'enabled' : localActionsEnabled === false ? 'disabled' : 'unknown',
    },
    'Δ': { intent: intent || null, activeLocalAction },
    Evidence: {
      responseHash: result?.evidence_hash ?? null,
      latestLocalAction: localActionRuns[0]
        ? {
            id: localActionRuns[0].id,
            actionId: localActionRuns[0].actionId,
            status: localActionRuns[0].status,
            exitCode: localActionRuns[0].exitCode,
          }
        : null,
    },
    Witness: witnessSnapshot,
  };

  return (
    <section aria-label="Invisible Online Computer" className="invisible-computer">
      <header className="ioc-header">
        <div>
          <div className="ioc-eyebrow">Ω∞v OCEANICOS · OmegaConsole</div>
          <h2 className="ioc-title">WHAT SHALL WE MAKE REAL?</h2>
        </div>
        <div className="ioc-header-actions">
          <button
            type="button"
            className="ioc-command-toggle"
            aria-expanded={commandsOpen}
            aria-controls="ioc-command-drawer"
            onClick={() => setCommandsOpen((open) => !open)}
          >
            <span aria-hidden="true">⌘</span> Prompts
          </button>
          <button
            type="button"
            className="ioc-command-toggle"
            aria-expanded={inspectorOpen}
            aria-controls="ioc-state-inspector"
            onClick={() => setInspectorOpen((open) => !open)}
          >
            <span aria-hidden="true">{`{ }`}</span> State
          </button>
        </div>
      </header>

      <div className="ioc-quick-actions" aria-label="Allowlisted local actions">
        <span className={`ioc-action-status${canRunLocalActions ? ' is-enabled' : ''}`} role="status">
          LOCAL ACTIONS · {auth?.isLoading
            ? 'AUTHENTICATING'
            : auth && !auth.isAuthenticated
              ? 'SIGN IN REQUIRED'
              : localActionsEnabled === null
                ? 'UNKNOWN'
                : localActionsEnabled
                  ? 'ENABLED'
                  : 'DISABLED'}
        </span>
        {LOCAL_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            className="ioc-action-chip"
            disabled={!canRunLocalActions || activeLocalAction !== null}
            onClick={() => void runLocalAction(action.id)}
          >
            {activeLocalAction === action.id ? 'RUNNING…' : action.label}
          </button>
        ))}
      </div>
      <div className="ioc-action-access" aria-label="Local action access">
        {auth?.isAuthenticated && (
          <>
            <span className="ioc-access-note" role="status">
              Signed in with Auth0. Protected actions still require approval.
            </span>
            <button
              type="button"
              className="ioc-connect"
              onClick={() => void auth.logout().catch((err) => {
                setLocalActionAccessError(err instanceof Error ? err.message : 'Auth0 sign-out failed.');
              })}
            >
              Sign out
            </button>
          </>
        )}
        {auth && !auth.isAuthenticated && (
          <button
            type="button"
            className="ioc-connect"
            disabled={auth.isLoading}
            onClick={() => void auth.login().catch((err) => {
              setLocalActionAccessError(err instanceof Error ? err.message : 'Auth0 sign-in failed.');
            })}
          >
            Sign in with Auth0
          </button>
        )}
        {localActionAccessError && <span className="ioc-access-note">{localActionAccessError}</span>}
      </div>

      <aside
        id="ioc-state-inspector"
        aria-label="JSON state inspector"
        aria-hidden={!inspectorOpen}
        className={`ioc-inspector${inspectorOpen ? ' is-open' : ''}`}
      >
        <div className="ioc-inspector-header">
          <h3>State inspection</h3>
          <button type="button" className="ioc-inspector-close" onClick={() => setInspectorOpen(false)}>
            Close
          </button>
        </div>
        <pre>{JSON.stringify(inspectorState, null, 2)}</pre>
      </aside>

      {commandsOpen && (
        <div id="ioc-command-drawer" className="ioc-command-drawer" aria-label="Prompt starters">
          {[
            ['Create', 'Create a new '],
            ['Explore', 'Explore the current state of '],
            ['Build', 'Build and test '],
            ['Change', 'Change '],
          ].map(([label, prompt]) => (
            <button
              key={label}
              type="button"
              className="ioc-command"
              onClick={() => setIntent(prompt)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="ioc-composer">
        <input
          className="ioc-input"
          aria-label="What shall we make real?"
          value={intent}
          onChange={(event) => setIntent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void execute();
          }}
          maxLength={2000}
          disabled={running}
          placeholder="Describe the intent you want verified…"
        />
        <button
          type="button"
          className="ioc-witness"
          onClick={witness}
          disabled={!result || running}
          title="Capture the latest API response in the state inspector; no signed attestation is requested."
        >
          [Witness]
        </button>
        <button
          type="button"
          className="ioc-submit"
          onClick={() => void execute()}
          disabled={running || !intent.trim()}
        >
          {running ? '[Executing…]' : '[Execute]'}
        </button>
      </div>
      <p className="ioc-witness-note" role="note">
        Witness captures the latest API response for inspection. It is not a signed attestation or
        independent verification.
      </p>
      <label
        className="ioc-model-toggle"
      >
        <input
          type="checkbox"
          checked={useExternalModel}
          onChange={(event) => setUseExternalModel(event.target.checked)}
          disabled={running}
        />
        <span>
          Send this intent to the server-configured external model. Leave unchecked to use the
          local deterministic composer. The intent is sent as entered; it is not automatically
          redacted.
        </span>
      </label>

      {(localActionRuns.length > 0 || localActionError) && (
        <section className="ioc-action-results" aria-label="Local action results">
          {localActionError && <p role="alert" className="ioc-action-error">{localActionError}</p>}
          {localActionRuns.map((run) => (
            <article key={run.id} className="ioc-action-result">
              <header>
                <strong>{run.label}</strong>
                <span data-status={run.status}>{run.status}</span>
                <small>{run.durationMs} ms · exit {run.exitCode ?? 'unknown'}</small>
              </header>
              <pre>{run.output || '(no output)'}{run.outputTruncated ? '\n[output capped at 64 KiB]' : ''}</pre>
            </article>
          ))}
        </section>
      )}

      {/* Live execution terminal */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Execution terminal"
        className="ioc-execution-log"
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
          {witnessSnapshot && (
            <p className="ioc-witness-captured" role="status">
              Witness snapshot captured · {witnessSnapshot.status} ·{' '}
              {witnessSnapshot.evidenceHash ? shortHash(witnessSnapshot.evidenceHash) : 'no evidence hash'}
              {' '}· unsigned
            </p>
          )}
          {result.response && (
            <pre
              className="ioc-response"
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
            {result.upgrade && (
              <span>
                UPGRADE · {result.upgrade.execution}
                {result.upgrade.selected ? ` · ${result.upgrade.selected.id}` : ' · none'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Recent memory */}
      {memoryRecords.length > 0 && (
        <div style={{ marginTop: '14px' }}>
          <div
            style={{
              fontFamily: theme.fontMono,
              fontSize: '10px',
              letterSpacing: '0.18em',
              color: theme.textDim,
              marginBottom: '6px',
            }}
          >
            KAI MEMORY · LAST {memoryRecords.length}
          </div>
          {memoryRecords.map((record) => (
            <div
              key={record.id}
              style={{
                display: 'flex',
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
            </div>
          ))}
        </div>
      )}

      {/* Bottom status bar */}
      <div
        className="ioc-footer"
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
