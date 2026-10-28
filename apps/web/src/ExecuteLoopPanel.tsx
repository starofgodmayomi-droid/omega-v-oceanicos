import React, { useState } from 'react';
import { theme } from './oceanicosTheme';

/**
 * The one visible surface of the KAI/ELION loop.
 *
 * It shows the steps the server actually returned — it does not animate a
 * success it did not observe. A block, an empty answer, or a mismatch is shown
 * exactly as OMEGA reported it.
 */

type ExecuteStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

type ExecuteStep = { step: string; status: string; detail: string };

type ExecuteResponse = {
  status: ExecuteStatus;
  reason?: string | null;
  output?: string | null;
  evidenceHash?: string | null;
  shield?: { blocked?: boolean; rules?: Array<{ id: string; label: string }> };
  steps?: ExecuteStep[];
  memory?: { sequence?: number | null; hash?: string | null };
};

const STATUS_COLOR: Record<ExecuteStatus, string> = {
  VERIFIED: theme.verified,
  DIVERGENT: theme.divergent,
  UNKNOWN: theme.unknown,
  NOT_EXECUTED: theme.warning,
};

export function ExecuteLoopPanel() {
  const [intent, setIntent] = useState('');
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ExecuteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!intent.trim() || pending) return;
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch('/api/v1/execute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          intent: intent.trim(),
          ...(expectedOutcome.trim() ? { expectedOutcome: expectedOutcome.trim() } : {}),
        }),
      });
      const payload = await response.json();
      if (!response.ok || payload.success === false) {
        throw new Error(payload?.error || `HTTP ${response.status}`);
      }
      setResult(payload as ExecuteResponse);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'execute loop unavailable');
    } finally {
      setPending(false);
    }
  };

  const statusColor = result ? STATUS_COLOR[result.status] ?? theme.unknown : theme.textDim;

  return (
    <section
      aria-label="KAI and ELION execute loop"
      style={{ padding: '16px', marginTop: '16px', border: '1px solid ' + theme.border, borderRadius: theme.radiusSmall, background: theme.surfaceDeep }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
        <div>
          <span className="whole-ecosystem-label">KAI · ELION · OMEGA</span>
          <h3 style={{ margin: '4px 0', color: theme.text }}>WHAT SHALL WE MAKE REAL?</h3>
        </div>
        <span
          aria-live="polite"
          style={{
            padding: '4px 10px',
            borderRadius: theme.radiusPill,
            border: '1px solid ' + statusColor + '55',
            color: statusColor,
            background: statusColor + '12',
            fontSize: '11px',
            fontWeight: 700,
          }}
        >
          {pending ? 'OBSERVING' : result ? result.status : 'AWAITING SIGNAL'}
        </span>
      </div>
      <p style={{ color: theme.textMuted, fontSize: '12px', margin: '8px 0 14px' }}>
        Observe → Bound → Execute → Verify → Remember. The executor reads only what this body has already observed; it never invents an answer.
      </p>

      <div style={{ display: 'grid', gap: '8px' }}>
        <input
          value={intent}
          onChange={(event) => setIntent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void run();
          }}
          maxLength={2000}
          placeholder="Tell the body what you want to make real…"
          aria-label="Intent"
          style={{ padding: '10px 12px', borderRadius: theme.radiusSmall, border: '1px solid ' + theme.border, background: theme.surface, color: theme.text, fontFamily: theme.fontMono, fontSize: '12px' }}
        />
        <input
          value={expectedOutcome}
          onChange={(event) => setExpectedOutcome(event.target.value)}
          maxLength={2000}
          placeholder="Expected outcome (optional) — OMEGA marks DIVERGENT if it is not observed"
          aria-label="Expected outcome"
          style={{ padding: '10px 12px', borderRadius: theme.radiusSmall, border: '1px solid ' + theme.border, background: theme.surface, color: theme.text, fontFamily: theme.fontMono, fontSize: '12px' }}
        />
        <button
          type="button"
          onClick={() => void run()}
          disabled={pending || !intent.trim()}
          style={{ justifySelf: 'start', padding: '8px 16px', borderRadius: theme.radiusPill, border: '1px solid ' + theme.borderBright, background: theme.surface, color: pending || !intent.trim() ? theme.textDim : theme.accent, cursor: pending || !intent.trim() ? 'default' : 'pointer', fontSize: '12px', fontWeight: 700 }}
        >
          {pending ? 'Running loop…' : 'Run bounded loop'}
        </button>
      </div>

      {error ? (
        <div style={{ marginTop: '12px', color: theme.warning, fontSize: '12px' }}>UNKNOWN · {error}</div>
      ) : null}

      {result ? (
        <div style={{ marginTop: '14px' }}>
          <div style={{ display: 'grid', gap: '4px', padding: '10px', borderRadius: theme.radiusSmall, border: '1px solid ' + theme.border, background: theme.surfaceDeep, fontFamily: theme.fontMono, fontSize: '11px' }}>
            {(result.steps ?? []).map((step, index) => (
              <div key={step.step + index} style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 8px', alignItems: 'baseline' }}>
                <span style={{ color: theme.accent, flex: '0 0 auto', minWidth: '118px' }}>{step.step}</span>
                <span style={{ color: STATUS_COLOR[step.status as ExecuteStatus] ?? theme.textDim, flex: '0 0 auto', minWidth: '84px' }}>{step.status}</span>
                <span style={{ color: theme.textMuted, flex: '1 1 160px', minWidth: 0, wordBreak: 'break-word' }}>{step.detail}</span>
              </div>
            ))}
          </div>

          {result.output ? (
            <pre style={{ margin: '10px 0 0', padding: '10px', borderRadius: theme.radiusSmall, border: '1px solid ' + theme.border, background: theme.surface, color: theme.text, fontFamily: theme.fontMono, fontSize: '11px', whiteSpace: 'pre-wrap' }}>
              {result.output}
            </pre>
          ) : null}

          <div style={{ marginTop: '10px', display: 'grid', gap: '4px', fontFamily: theme.fontMono, fontSize: '11px', color: theme.textMuted }}>
            {result.reason ? <div>reason · <span style={{ color: statusColor }}>{result.reason}</span></div> : null}
            {result.evidenceHash ? <div>evidence · <span style={{ color: theme.text, wordBreak: 'break-all' }}>{result.evidenceHash}</span></div> : null}
            {result.memory?.sequence ? <div>remembered · sequence {result.memory.sequence} · <span style={{ wordBreak: 'break-all' }}>{result.memory.hash}</span></div> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
