import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import './InvisibleComputer.css';

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

type Status = 'NOT_EXECUTED' | 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';
type StepStatus = Status | 'SKIPPED';

type ServerStep = {
  actor: 'KAI' | 'ELION' | 'OMEGA';
  step: string;
  status: StepStatus;
  detail: string;
};

type ExecuteResponse = {
  success: boolean;
  status: Status;
  intent: string;
  response: string | null;
  evidenceHash: string | null;
  matchedPatterns?: string[];
  reason?: string;
  steps: ServerStep[];
  memory: { id: string; timestamp: string; status: string };
  contract: { id: string; scope: string; authorityLimit: string; expectedOutcome: string };
  authorityLimit: string;
  provider: string | null;
  timestamp: string;
  error?: string;
  message?: string;
};

type TerminalLine = {
  key: string;
  at: string;
  actor: string;
  step: string;
  status: StepStatus;
  detail: string;
};

const MAX_INTENT_LENGTH = 2_000;

function clock(): string {
  return new Date().toISOString().slice(11, 19);
}

function lineFromStep(step: ServerStep, index: number): TerminalLine {
  return {
    key: `${Date.now()}-${index}-${step.step}`,
    at: clock(),
    actor: step.actor,
    step: step.step,
    status: step.status,
    detail: step.detail,
  };
}

function statusLabel(status: Status): string {
  if (status === 'NOT_EXECUTED') return 'NOT EXECUTED';
  return status;
}

export function InvisibleComputer() {
  const [intent, setIntent] = useState('');
  const [status, setStatus] = useState<Status>('NOT_EXECUTED');
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [result, setResult] = useState<ExecuteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const terminalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [lines]);

  const append = (line: TerminalLine) => setLines((current) => [...current, line]);

  const execute = async () => {
    const value = intent.trim();
    if (!value || running) return;
    setRunning(true);
    setError(null);
    setResult(null);
    setStatus('NOT_EXECUTED');
    setLines([
      {
        key: `intent-${Date.now()}`,
        at: clock(),
        actor: 'HUMAN',
        step: 'INTENT',
        status: 'SKIPPED',
        detail: value,
      },
      {
        key: `kai-${Date.now()}`,
        at: clock(),
        actor: 'KAI',
        step: 'OBSERVE',
        status: 'SKIPPED',
        detail: 'screening intent against KaiMemory scam patterns…',
      },
    ]);

    try {
      const response = await fetch(`${API_BASE_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: value }),
      });
      const payload = (await response.json().catch(() => null)) as ExecuteResponse | null;
      if (!payload) throw new Error('the computer returned no readable response');
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || payload.error || `execution rejected (${response.status})`);
      }

      // Keep the human intent line; replace the pending KAI line with the record.
      setLines((current) => current.slice(0, 1));
      for (let index = 0; index < payload.steps.length; index += 1) {
        append(lineFromStep(payload.steps[index], index));
        // Present the recorded steps in order; the server already ran them.
        await new Promise((resolve) => setTimeout(resolve, 140));
      }
      setResult(payload);
      setStatus(payload.status);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'execution failed';
      setError(message);
      setStatus('UNKNOWN');
      append({
        key: `unknown-${Date.now()}`,
        at: clock(),
        actor: 'OMEGA',
        step: 'VERIFY',
        status: 'UNKNOWN',
        detail: `no verified evidence returned — ${message}`,
      });
    } finally {
      setRunning(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void execute();
    }
  };

  return (
    <div className="ic-shell">
      <div className="ic-current" aria-hidden="true" />
      <header className="ic-header">
        <a className="ic-brand" href="/">
          <span className="ic-mark">Ω∞v</span>
          <span className="ic-brand-text">
            OCEANICOS
            <small>INVISIBLE ONLINE COMPUTER</small>
          </span>
        </a>
        <a className="ic-console-link" href="/console">
          Console <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main className="ic-main">
        <p className="ic-eyebrow">KAI OBSERVES · ELION EXECUTES · OMEGA VERIFIES</p>
        <h1 className="ic-title">WHAT SHALL WE MAKE REAL?</h1>
        <p className="ic-subtitle">
          Nothing is claimed without a hash. If the evidence is missing, the answer is UNKNOWN.
        </p>

        <form
          className="ic-form"
          onSubmit={(event) => {
            event.preventDefault();
            void execute();
          }}
        >
          <label className="ic-sr-only" htmlFor="ic-intent">
            What shall we make real?
          </label>
          <textarea
            id="ic-intent"
            className="ic-input"
            value={intent}
            maxLength={MAX_INTENT_LENGTH}
            rows={3}
            spellCheck={false}
            onChange={(event) => setIntent(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Speak an intent — a plan, a decision, a thing to build. It will be screened, executed, and verified before it is believed."
          />
          <div className="ic-form-row">
            <span className="ic-counter">
              {intent.length} / {MAX_INTENT_LENGTH}
            </span>
            <button className="ic-submit" type="submit" disabled={running || !intent.trim()}>
              {running ? 'EXECUTING…' : 'MAKE IT REAL'}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>

        {error && (
          <p className="ic-error" role="alert">
            {error}
          </p>
        )}

        <section className="ic-terminal" aria-label="Execution log">
          <div className="ic-terminal-head">
            <span>TERMINAL</span>
            <span className="ic-terminal-meta">
              {running ? 'current active' : `${lines.length} step${lines.length === 1 ? '' : 's'}`}
            </span>
          </div>
          <div className="ic-terminal-body" ref={terminalRef} aria-live="polite">
            {lines.length === 0 && (
              <p className="ic-terminal-idle">
                <span className="ic-caret" aria-hidden="true" />
                awaiting intent · nothing has been executed
              </p>
            )}
            {lines.map((line) => (
              <div className="ic-line" key={line.key}>
                <span className="ic-line-time">{line.at}</span>
                <span className={`ic-actor ic-actor-${line.actor.toLowerCase()}`}>{line.actor}</span>
                <span className="ic-line-step">{line.step}</span>
                <span className={`ic-line-status ic-status-${line.status.toLowerCase()}`}>
                  {line.status === 'SKIPPED' ? '…' : line.status}
                </span>
                <span className="ic-line-detail">{line.detail}</span>
              </div>
            ))}
          </div>
        </section>

        {result?.response && (
          <article className="ic-output">
            <div className="ic-output-head">
              <span>ELION OUTPUT</span>
              <span className="ic-output-hash">SHA-256 · {result.evidenceHash}</span>
            </div>
            <p className="ic-output-body">{result.response}</p>
            <footer className="ic-output-foot">
              <span>Memory {result.memory.id.slice(0, 18)}…</span>
              <span>Contract {result.contract.id.slice(0, 18)}…</span>
              <span>Provider {result.provider ?? 'none'}</span>
            </footer>
          </article>
        )}
      </main>

      <footer className={`ic-statusbar ic-statusbar-${status.toLowerCase()}`} role="status" aria-live="polite">
        <span className="ic-status-dot" aria-hidden="true" />
        <span className="ic-status-word">{statusLabel(status)}</span>
        <span className="ic-status-sep" aria-hidden="true">
          ·
        </span>
        <span className="ic-status-hash">
          EVIDENCE {result?.evidenceHash ? `${result.evidenceHash.slice(0, 24)}…` : 'none'}
        </span>
        <span className="ic-status-right">
          {running ? 'EXECUTING' : `AUTHORITY ${result?.authorityLimit ?? 'READ_ONLY'}`}
        </span>
      </footer>
    </div>
  );
}

export default InvisibleComputer;
