import { useState } from 'react';
import { theme } from './oceanicosTheme';

/*
 * Reconciliation surface for one KAI memory row.
 *
 * MEMORY != PROOF: the row keeps the digest, not the text, so the output has to
 * be supplied again. The API recomputes the SHA-256 and checks
 * `V ≡ (Expected ≡ Observed)`. Nothing here decides a verdict locally.
 */

export type ReconcileVerdict = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';

type ReconcileCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail: string | null;
};

type ReconcileResponse = {
  status: ReconcileVerdict;
  checks: ReconcileCheck[];
  reason: string | null;
  evaluated_at: string;
};

const VERDICT_TONE: Record<ReconcileVerdict, string> = {
  VERIFIED: '#22c55e',
  DIVERGENT: '#ef4444',
  UNKNOWN: '#eab308',
};

export function MemoryReconcile({
  memoryId,
  apiBaseUrl,
}: {
  memoryId: string;
  apiBaseUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [verdict, setVerdict] = useState<ReconcileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reconcile = async () => {
    if (running || !output.trim()) return;
    setRunning(true);
    setError(null);
    setVerdict(null);
    try {
      const response = await fetch(`${apiBaseUrl}/kai/memory/${memoryId}/reconcile`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ output }),
      });
      const text = await response.text();
      const payload = text ? JSON.parse(text) : null;
      if (!response.ok) {
        throw new Error(payload?.error || `Reconciliation failed (${response.status})`);
      }
      setVerdict(payload as ReconcileResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reconciliation failed');
    } finally {
      setRunning(false);
    }
  };

  const toggle = () => {
    setOpen((previous) => !previous);
    setError(null);
  };

  return (
    <div style={{ marginTop: '4px' }}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        style={{
          padding: '2px 8px',
          borderRadius: '6px',
          border: `1px solid ${theme.border}`,
          background: 'transparent',
          color: theme.accent,
          fontFamily: theme.fontMono,
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          cursor: 'pointer',
        }}
      >
        RECONCILE
      </button>

      {open && (
        <div style={{ marginTop: '6px', paddingLeft: '2px' }}>
          <textarea
            aria-label="Output to reconcile"
            value={output}
            onChange={(event) => setOutput(event.target.value)}
            rows={3}
            disabled={running}
            placeholder="Paste the output again — the row keeps the digest, not the text."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '8px 10px',
              background: '#01060f',
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              color: theme.text,
              fontFamily: theme.fontMono,
              fontSize: '11px',
              lineHeight: 1.5,
              resize: 'vertical',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
            <button
              type="button"
              onClick={() => void reconcile()}
              disabled={running || !output.trim()}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(6, 182, 212, 0.4)',
                background: running || !output.trim() ? 'rgba(6, 182, 212, 0.06)' : 'rgba(6, 182, 212, 0.14)',
                color: theme.accent,
                fontFamily: theme.fontMono,
                fontSize: '9.5px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                cursor: running || !output.trim() ? 'not-allowed' : 'pointer',
                opacity: running || !output.trim() ? 0.6 : 1,
              }}
            >
              {running ? 'RECOMPUTING' : 'RECOMPUTE DIGEST'}
            </button>
            <span style={{ fontFamily: theme.fontMono, fontSize: '9px', color: theme.textDim }}>
              MEMORY ≠ PROOF
            </span>
          </div>

          {error && (
            <div style={{ marginTop: '6px', fontSize: '10.5px', color: theme.divergent }}>✕ {error}</div>
          )}

          {verdict && (
            <div
              data-reconcile-status={verdict.status}
              style={{ marginTop: '8px', fontFamily: theme.fontMono, fontSize: '10px' }}
            >
              <span style={{ color: VERDICT_TONE[verdict.status] ?? theme.textDim, fontWeight: 700 }}>
                {verdict.status}
              </span>
              {verdict.checks.map((check) => (
                <div key={check.id} style={{ color: check.passed ? theme.textMuted : theme.warning }}>
                  {check.passed ? '✓' : '✕'} {check.label}
                  {check.detail ? ` · ${check.detail}` : ''}
                </div>
              ))}
              {verdict.reason && <div style={{ color: theme.textDim }}>{verdict.reason}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
