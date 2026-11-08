import { useState, type ReactNode } from 'react';
import { theme } from './oceanicosTheme';

/*
 * THE OMNICOS — Singularity Eye.
 *
 * One intent, one receipt. Every field comes from the API, which composes
 * locally and hashes what it wrote. Nothing is narrated here, and no Glober
 * tool is connected: `tool_used` stays CODE.
 */

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

type ReceiptStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';

type Receipt = {
  entity: string;
  tool_used: string;
  status: ReceiptStatus;
  game_detected: boolean;
  phase_t: number;
  evidence_hash: string;
  action: string;
  next_delta: string;
};

const STATUS_TONE: Record<ReceiptStatus, string> = {
  VERIFIED: theme.verified,
  DIVERGENT: theme.divergent,
  UNKNOWN: theme.warning,
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '12px', padding: '5px 0', alignItems: 'baseline' }}>
      <span
        style={{
          width: '96px',
          flexShrink: 0,
          fontFamily: theme.fontMono,
          fontSize: '9.5px',
          letterSpacing: '0.16em',
          color: theme.textDim,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span style={{ color: theme.textMuted, fontSize: '12px', lineHeight: 1.55, minWidth: 0 }}>
        {children}
      </span>
    </div>
  );
}

export function OmnicosPanel() {
  const [intent, setIntent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const observe = async () => {
    const trimmed = intent.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    setReceipt(null);
    try {
      const response = await fetch(`${API_BASE_URL}/omnicos`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intent: trimmed, phaseT: 0.35 }),
      });
      const text = await response.text();
      const payload = text ? JSON.parse(text) : null;
      if (!response.ok) {
        throw new Error(payload?.error || `Observation failed (${response.status})`);
      }
      setReceipt(payload as Receipt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Observation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const tone = receipt ? STATUS_TONE[receipt.status] : theme.textDim;

  return (
    <section
      aria-label="THE OMNICOS singularity eye"
      style={{
        margin: '0 0 24px',
        padding: '18px 16px 14px',
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radiusSmall,
        background: `${theme.surfaceDeep}cc`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            color: theme.accent,
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.16em',
          }}
        >
          👁️ THE OMNICOS · SINGULARITY EYE
        </div>
        <span
          style={{
            fontFamily: theme.fontMono,
            fontSize: '9.5px',
            letterSpacing: '0.14em',
            color: theme.textDim,
          }}
        >
          OCEANICOS × GAIACOS × COSMICOS · 30013030
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
        <input
          aria-label="OMNICOS intent"
          value={intent}
          onChange={(event) => setIntent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void observe();
          }}
          maxLength={2000}
          disabled={submitting}
          placeholder="Give the eye one intent to observe…"
          style={{
            flex: 1,
            minWidth: 0,
            padding: '11px 14px',
            background: 'rgba(2, 6, 23, 0.82)',
            border: `1px solid ${theme.borderBright}`,
            borderRadius: theme.radiusSmall,
            color: theme.text,
            fontFamily: theme.fontSans,
            fontSize: '13.5px',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={() => void observe()}
          disabled={submitting || !intent.trim()}
          style={{
            padding: '0 18px',
            borderRadius: theme.radiusSmall,
            border: '1px solid rgba(6, 182, 212, 0.45)',
            background:
              submitting || !intent.trim() ? 'rgba(6, 182, 212, 0.10)' : 'rgba(6, 182, 212, 0.18)',
            color: theme.accent,
            fontFamily: theme.fontSans,
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            cursor: submitting || !intent.trim() ? 'not-allowed' : 'pointer',
            opacity: submitting || !intent.trim() ? 0.6 : 1,
          }}
        >
          {submitting ? 'OBSERVING' : 'OBSERVE'}
        </button>
      </div>

      {error && (
        <p style={{ margin: '10px 0 0', color: theme.divergent, fontSize: '12px' }}>✕ {error}</p>
      )}

      {receipt && (
        <div data-testid="omnicos-receipt" style={{ marginTop: '12px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 11px',
              marginBottom: '8px',
              borderRadius: theme.radiusPill,
              border: `1px solid ${tone}66`,
              background: `${tone}14`,
              color: tone,
              fontFamily: theme.fontMono,
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.16em',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: tone,
                display: 'inline-block',
              }}
            />
            {receipt.status}
            {receipt.game_detected ? ' · GAME DETECTED' : ''}
          </div>
          <Row label="Entity">{receipt.entity}</Row>
          <Row label="Tool used">
            {receipt.tool_used} · no Glober tool connected
          </Row>
          <Row label="Phase">{receipt.phase_t.toFixed(3)}</Row>
          <Row label="Evidence">
            <span style={{ fontFamily: theme.fontMono, fontSize: '10.5px', wordBreak: 'break-all' }}>
              {receipt.evidence_hash}
            </span>
          </Row>
          <Row label="Action">{receipt.action}</Row>
          <Row label="Next Δ">{receipt.next_delta}</Row>
        </div>
      )}
    </section>
  );
}
