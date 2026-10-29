import React, { useCallback, useEffect, useState } from 'react';
import { theme } from './oceanicosTheme';

/**
 * What the body remembers, in the two forms it actually keeps:
 *
 *   KAI JOURNAL — every verdict, including the failures (audit trail)
 *   Σ            — only drops OMEGA judged VERIFIED
 *
 * The panel reads both endpoints and exports the union. It shows nothing it did
 * not receive: a degraded chain or an unavailable store is displayed as such.
 */

type JournalEntry = {
  sequence: number;
  status: string;
  intent: string;
  evidenceHash: string;
  reason?: string | null;
  timestamp: string;
};

type VerifiedEntry = {
  sequence: number;
  intent: string;
  evidenceHash: string;
  dropHash: string;
  timestamp: string;
};

type MemoryState<T> = { height: number; integrity: string; entries: T[] };

const STATUS_COLOR: Record<string, string> = {
  VERIFIED: theme.verified,
  DIVERGENT: theme.divergent,
  UNKNOWN: theme.unknown,
  NOT_EXECUTED: theme.warning,
};

const short = (hash: string | undefined | null) => (hash ? `${hash.slice(0, 18)}…` : '—');

const rowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '2px 8px',
  alignItems: 'baseline',
  fontFamily: theme.fontMono,
  fontSize: '11px',
  padding: '4px 0',
  borderTop: '1px solid ' + theme.border,
};

function ColumnHeader({ title, state, note, tone }: { title: string; state: MemoryState<unknown> | null; note: string; tone: string }) {
  return (
    <div style={{ display: 'grid', gap: '2px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ color: tone, fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em' }}>{title}</span>
        <span style={{ color: theme.textMuted, fontFamily: theme.fontMono, fontSize: '11px' }}>
          {state ? `${state.height} drop${state.height === 1 ? '' : 's'}` : '—'}
        </span>
      </div>
      <span style={{ color: theme.textMuted, fontSize: '10px' }}>{note}</span>
      {state ? (
        <span style={{ color: state.integrity === 'verified-local-hash-chain' ? theme.verified : theme.divergent, fontFamily: theme.fontMono, fontSize: '10px' }}>
          {state.integrity}
        </span>
      ) : null}
    </div>
  );
}

export function MemoryStatePanel() {
  const [journal, setJournal] = useState<MemoryState<JournalEntry> | null>(null);
  const [verified, setVerified] = useState<MemoryState<VerifiedEntry> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exportedAt, setExportedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [journalResponse, verifiedResponse] = await Promise.all([
        fetch('/api/v1/execute/memory?limit=6'),
        fetch('/api/v1/execute/verified?limit=6'),
      ]);
      if (!journalResponse.ok) throw new Error(`journal unavailable · HTTP ${journalResponse.status}`);
      const journalPayload = await journalResponse.json();
      setJournal({ height: journalPayload.height, integrity: journalPayload.integrity, entries: journalPayload.entries ?? [] });

      if (!verifiedResponse.ok) throw new Error(`Σ unavailable · HTTP ${verifiedResponse.status}`);
      const verifiedPayload = await verifiedResponse.json();
      setVerified({ height: verifiedPayload.height, integrity: verifiedPayload.integrity, entries: verifiedPayload.entries ?? [] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'memory unavailable');
    }
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener('omega:memory-updated', refresh);
    return () => window.removeEventListener('omega:memory-updated', refresh);
  }, [load]);

  const exportMemory = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/execute/memory/export');
      if (!response.ok) throw new Error(`export unavailable · HTTP ${response.status}`);
      const payload = await response.json();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `omega-memory-${(payload.generatedAt ?? new Date().toISOString()).replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setExportedAt(payload.generatedAt ?? new Date().toISOString());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'export unavailable');
    } finally {
      setBusy(false);
    }
  };

  const buttonStyle: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: theme.radiusPill,
    border: '1px solid ' + theme.borderBright,
    background: theme.surface,
    color: theme.accent,
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
  };

  return (
    <section
      aria-label="Memory state — journal and verified memory"
      style={{ padding: '16px', marginTop: '16px', border: '1px solid ' + theme.border, borderRadius: theme.radiusSmall, background: theme.surfaceDeep }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span className="whole-ecosystem-label">MEMORY · JOURNAL / Σ</span>
          <h3 style={{ margin: '4px 0', color: theme.text }}>WHAT THE BODY REMEMBERS</h3>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => void load()} style={buttonStyle}>
            Refresh
          </button>
          <button type="button" onClick={() => void exportMemory()} disabled={busy} style={{ ...buttonStyle, cursor: busy ? 'default' : 'pointer', color: busy ? theme.textDim : theme.accent }}>
            {busy ? 'Exporting…' : 'Export full memory state'}
          </button>
        </div>
      </div>

      <p style={{ color: theme.textMuted, fontSize: '12px', margin: '8px 0 14px' }}>
        The journal keeps every verdict, failures included. Σ keeps only what matched reality{' '}
        <span style={{ fontFamily: theme.fontMono }}>{'M(t+1) = M(t) ∪ Δ | V(Δ) = ⊤'}</span>.
      </p>

      {error ? <div style={{ marginBottom: '10px', color: theme.warning, fontSize: '12px' }}>UNKNOWN · {error}</div> : null}

      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <div style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
          <ColumnHeader title="KAI JOURNAL" state={journal} note="every verdict · audit trail" tone={theme.accent} />
          <div style={{ display: 'grid' }}>
            {journal && journal.entries.length === 0 ? (
              <span style={{ color: theme.textDim, fontSize: '11px', fontFamily: theme.fontMono }}>No drops recorded yet.</span>
            ) : null}
            {(journal?.entries ?? []).map((entry) => (
              <div key={entry.sequence} style={rowStyle}>
                <span style={{ color: theme.textDim, flex: '0 0 auto' }}>#{entry.sequence}</span>
                <span style={{ color: STATUS_COLOR[entry.status] ?? theme.unknown, flex: '0 0 auto', fontWeight: 700 }}>{entry.status}</span>
                <span style={{ color: theme.textMuted, flex: '1 1 140px', minWidth: 0, wordBreak: 'break-word' }}>{entry.intent}</span>
                <span style={{ color: theme.textDim, flex: '0 0 auto' }} title={entry.evidenceHash}>{short(entry.evidenceHash)}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
          <ColumnHeader title="Σ · VERIFIED ONLY" state={verified} note="only O(E(x)) ≡ VERIFIED enters here" tone={theme.verified} />
          <div style={{ display: 'grid' }}>
            {verified && verified.entries.length === 0 ? (
              <span style={{ color: theme.textDim, fontSize: '11px', fontFamily: theme.fontMono }}>Σ is empty — nothing has matched reality yet.</span>
            ) : null}
            {(verified?.entries ?? []).map((entry) => (
              <div key={entry.sequence} style={rowStyle}>
                <span style={{ color: theme.textDim, flex: '0 0 auto' }}>#{entry.sequence}</span>
                <span style={{ color: theme.verified, flex: '0 0 auto', fontWeight: 700 }}>VERIFIED</span>
                <span style={{ color: theme.textMuted, flex: '1 1 140px', minWidth: 0, wordBreak: 'break-word' }}>{entry.intent}</span>
                <span style={{ color: theme.textDim, flex: '0 0 auto' }} title={entry.dropHash}>{short(entry.dropHash)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {exportedAt ? (
        <div style={{ marginTop: '12px', color: theme.textMuted, fontFamily: theme.fontMono, fontSize: '11px' }}>
          exported · journal + Σ · {exportedAt}
        </div>
      ) : null}
    </section>
  );
}
