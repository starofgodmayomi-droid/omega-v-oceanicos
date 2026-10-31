import React, { useEffect, useState } from 'react';
import { statusColor } from './oceanicosTheme';

/**
 * Ω∞v Body Command — KAI Shield → ELION execution → OMEGA reconciliation.
 *
 * The engine selector is a label: no external model is called. A VERIFIED
 * status means the authorized record reconciled with the executed record by
 * digest — not that external reality was observed.
 */

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

type LedgerEntry = {
  seq: number;
  time: string;
  intent: string;
  engine: string;
  operator: string;
  status: string;
  reason: string;
  hash: string;
  previousHash: string;
};

type LedgerState = {
  entries: LedgerEntry[];
  count: number;
  capacity: number;
  dropped: number;
};

type LogLine = { text: string; tone: 'kai' | 'elion' | 'omega' | 'shield' | 'system' };

const ENGINES = ['Claude 3.5', 'GPT-4o', 'Local Ollama'];

const TONE_COLOR: Record<LogLine['tone'], string> = {
  kai: '#67e8f9',
  elion: '#a5b4fc',
  omega: '#f59e0b',
  shield: '#ef4444',
  system: '#94a3b8',
};

const emptyLedger: LedgerState = { entries: [], count: 0, capacity: 256, dropped: 0 };

export function BodyCommandPanel() {
  const [intent, setIntent] = useState('');
  const [engine, setEngine] = useState(ENGINES[0]);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [ledger, setLedger] = useState<LedgerState>(emptyLedger);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastStatus, setLastStatus] = useState<string | null>(null);

  const log = (text: string, tone: LogLine['tone']) =>
    setLogs((prev) => [...prev, { text, tone }]);

  const fetchLedger = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/body/ledger`);
      if (!response.ok) return;
      const data = await response.json();
      setLedger({
        entries: Array.isArray(data.entries) ? data.entries : [],
        count: data.count ?? 0,
        capacity: data.capacity ?? 256,
        dropped: data.dropped ?? 0,
      });
    } catch {
      // The execution log reports an unreachable API; the journal keeps its last view.
    }
  };

  useEffect(() => {
    void fetchLedger();
  }, []);

  const executeIntent = async () => {
    const trimmed = intent.trim();
    if (!trimmed || isExecuting) return;
    setIsExecuting(true);
    setLastStatus(null);
    log(`[KAI]: Ingesting intent: "${trimmed}"`, 'kai');
    log('[KAI]: Scanning declared scam patterns…', 'kai');

    try {
      const response = await fetch(`${API_BASE_URL}/v1/body/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: trimmed, engine }),
      });
      const data = await response.json();

      if (data.status === 'DIVERGENT') {
        setLastStatus('DIVERGENT');
        log('[KAI SHIELD]: 🚨 SCAM PATTERN DETECTED. HALTING.', 'shield');
        log('[OMEGA]: Status DIVERGENT. Execution blocked.', 'omega');
      } else if (data.status === 'NOT_EXECUTED') {
        setLastStatus('NOT_EXECUTED');
        log('[ELION]: Authority below the requirement. The hands did not move.', 'elion');
        log('[KAI]: Halt remembered. Nothing joined Σ.', 'kai');
      } else if (response.ok && data.status === 'VERIFIED') {
        setLastStatus('VERIFIED');
        log(`[ELION]: Local execution on ${engine} (engine label only).`, 'elion');
        log(
          `[OMEGA]: Declared records reconciled · ${String(data.evidence_hash).slice(0, 16)}…`,
          'omega',
        );
        log('[KAI]: Appended to the bounded in-memory journal.', 'kai');
        log('[SYSTEM]: Status VERIFIED. Digest scope: declared values.', 'system');
        setIntent('');
      } else {
        setLastStatus('UNKNOWN');
        log(`[SYSTEM]: UNKNOWN. ${data.reason ?? 'Execution failed.'}`, 'system');
      }
    } catch {
      setLastStatus('UNKNOWN');
      log('[SYSTEM]: UNKNOWN. API disconnected.', 'system');
    } finally {
      await fetchLedger();
      setIsExecuting(false);
    }
  };

  const entries = [...ledger.entries].reverse();

  return (
    <section className="body-command" aria-label="Body command center">
      <header className="body-command-head">
        <div>
          <span className="body-command-kicker">Ω∞v BODY · KAI → ELION → OMEGA</span>
          <h2>Command center</h2>
        </div>
        <span
          className="body-command-state"
          style={{ color: lastStatus ? statusColor(lastStatus) : 'var(--omega-unknown)' }}
        >
          {lastStatus ?? 'AWAITING INTENT'}
        </span>
      </header>

      <div className="body-command-grid">
        <article className="body-command-card" aria-label="Intent">
          <h3>[ THE INTENT ]</h3>
          <textarea
            aria-label="Intent"
            value={intent}
            onChange={(event) => setIntent(event.target.value)}
            placeholder="What shall we make real?"
            maxLength={2000}
            rows={4}
          />
          <label className="body-command-field">
            <span>ENGINE (LABEL ONLY)</span>
            <select aria-label="Engine" value={engine} onChange={(event) => setEngine(event.target.value)}>
              {ENGINES.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <button
            className="body-command-execute"
            onClick={executeIntent}
            disabled={isExecuting || !intent.trim()}
          >
            {isExecuting ? 'EXECUTING…' : 'EXECUTE INTENT'}
          </button>
          <p className="body-command-note">
            Local execution · no external model is called · a VERIFIED status reconciles declared values,
            not external reality.
          </p>
        </article>

        <article className="body-command-card" aria-label="KAI journal">
          <h3>[ KAI JOURNAL ]</h3>
          <div className="body-command-list">
            {entries.length === 0 && <p className="body-command-empty">No transitions yet.</p>}
            {entries.map((entry) => (
              <div key={`${entry.seq}-${entry.hash}`} className="body-command-entry">
                <div>
                  <span>{new Date(entry.time).toLocaleTimeString()}</span>
                  <b style={{ color: statusColor(entry.status) }}>{entry.status}</b>
                </div>
                <p>{entry.intent}</p>
                <small>
                  seq {entry.seq} · hash {entry.hash.slice(0, 12)}… · {entry.engine}
                </small>
              </div>
            ))}
          </div>
          <footer className="body-command-foot">
            {ledger.count} / {ledger.capacity} · in-memory · not durable
            {ledger.dropped > 0 ? ` · ${ledger.dropped} superseded by the bound` : ''}
          </footer>
        </article>

        <article className="body-command-card body-command-log" aria-label="Execution log">
          <h3>[ EXECUTION LOG ]</h3>
          <div className="body-command-lines" aria-live="polite">
            {logs.length === 0 && <span className="body-command-empty">Waiting for a command.</span>}
            {logs.map((line, index) => (
              <span key={index} style={{ color: TONE_COLOR[line.tone] }}>
                {line.text}
              </span>
            ))}
            {isExecuting && <span className="body-command-caret">_</span>}
          </div>
        </article>
      </div>
    </section>
  );
}
