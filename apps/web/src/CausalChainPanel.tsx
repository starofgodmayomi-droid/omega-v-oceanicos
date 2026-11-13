import React, { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// ─── Types ───────────────────────────────────────────────────────────────────
interface KaiRecord {
  id: string;
  index: number;
  timestamp: string;
  distinction: string;
  statement: string;
  subject: string;
  source: string;
  author: string;
  policyOrAuthority?: string;
  evidenceRef?: string;
  previousHash: string;
  hash: string;
  metadata?: Record<string, unknown>;
}

interface KaiIntegrity {
  valid: boolean;
  count: number;
  genesisHash: string;
  tipHash: string;
  distinctions: Record<string, number>;
  evaluatedAt: string;
}

type FilterDistinction = 'ALL' | 'VERIFIED' | 'OBSERVED' | 'INFERRED' | 'DIVERGENT' | 'UNKNOWN' | 'PROPOSED' | 'BLOCKED';

// ─── Constants ───────────────────────────────────────────────────────────────
const DISTINCTION_STYLE: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  VERIFIED:        { bg: '#052e1a', border: '#00ff66', text: '#00ff66', glow: '0 0 8px #00ff6655' },
  OBSERVED:        { bg: '#0a1f35', border: '#38bdf8', text: '#38bdf8', glow: '0 0 8px #38bdf855' },
  'USER-STATED':   { bg: '#1a0a2e', border: '#c084fc', text: '#c084fc', glow: '0 0 8px #c084fc55' },
  DOCUMENTED:      { bg: '#0a142e', border: '#60a5fa', text: '#60a5fa', glow: '0 0 8px #60a5fa55' },
  INFERRED:        { bg: '#1f1500', border: '#fbbf24', text: '#fbbf24', glow: '0 0 8px #fbbf2455' },
  PROPOSED:        { bg: '#151515', border: '#94a3b8', text: '#94a3b8', glow: 'none' },
  DIVERGENT:       { bg: '#2e0a0a', border: '#fb7185', text: '#fb7185', glow: '0 0 8px #fb718555' },
  UNKNOWN:         { bg: '#111', border: '#71717a', text: '#a1a1aa', glow: 'none' },
  BLOCKED:         { bg: '#2e0808', border: '#f87171', text: '#f87171', glow: '0 0 8px #f8717155' },
  'NOT-AUTHORIZED':{ bg: '#3e0000', border: '#ef4444', text: '#ef4444', glow: '0 0 8px #ef444455' },
  CORRECTED:       { bg: '#002e2a', border: '#2dd4bf', text: '#2dd4bf', glow: '0 0 8px #2dd4bf55' },
};
const DEFAULT_STYLE = { bg: '#111', border: '#444', text: '#aaa', glow: 'none' };

const FILTER_OPTIONS: FilterDistinction[] = ['ALL', 'VERIFIED', 'OBSERVED', 'INFERRED', 'DIVERGENT', 'UNKNOWN', 'PROPOSED', 'BLOCKED'];

// ─── Hash display helper ──────────────────────────────────────────────────────
const shortHash = (h: string) => h ? `${h.slice(0, 8)}…${h.slice(-6)}` : '—';

// ─── Component ───────────────────────────────────────────────────────────────
export function CausalChainPanel() {
  const [records, setRecords]       = useState<KaiRecord[]>([]);
  const [integrity, setIntegrity]   = useState<KaiIntegrity | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [filter, setFilter]         = useState<FilterDistinction>('ALL');
  const [subject, setSubject]       = useState('');
  const [selected, setSelected]     = useState<KaiRecord | null>(null);
  const [replayId, setReplayId]     = useState('');
  const [replayRecord, setReplayRecord] = useState<KaiRecord | null>(null);
  const [replayError, setReplayError]   = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh]   = useState(false);
  const [limit, setLimit]           = useState(50);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchChain = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (filter !== 'ALL') params.set('distinction', filter);
      if (subject.trim()) params.set('subject', subject.trim());
      const res = await fetch(`${API_BASE_URL}/v1/memory/causal?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Unknown error');
      setRecords(data.records || []);
      setIntegrity(data.integrity || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load causal chain');
    } finally {
      setLoading(false);
    }
  }, [filter, subject, limit]);

  useEffect(() => { fetchChain(); }, [fetchChain]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchChain, 5000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchChain]);

  const handleReplay = async () => {
    if (!replayId.trim()) return;
    setReplayError(null);
    setReplayRecord(null);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/kai/replay/${encodeURIComponent(replayId.trim())}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'NOT_FOUND');
      setReplayRecord(data.record);
    } catch (err: any) {
      setReplayError(err.message);
    }
  };

  const style = {
    panel: { background: '#080c10', border: '1px solid #00ff6633', borderRadius: 12, padding: 20, color: '#e2e8f0', fontFamily: 'monospace', minHeight: 400 } as React.CSSProperties,
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap' as const, gap: 8 },
    title: { fontSize: 16, fontWeight: 700, color: '#00ff66', letterSpacing: 1 },
    integrityBadge: (valid: boolean) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, border: `1px solid ${valid ? '#00ff66' : '#fb7185'}`, color: valid ? '#00ff66' : '#fb7185', fontSize: 11, background: valid ? '#052e1a' : '#2e0a0a' }),
    controls: { display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 14, alignItems: 'center' },
    filterBtn: (active: boolean) => ({ padding: '3px 10px', borderRadius: 6, border: `1px solid ${active ? '#00ff66' : '#334'}`, background: active ? '#052e1a' : 'transparent', color: active ? '#00ff66' : '#94a3b8', cursor: 'pointer', fontSize: 11, fontFamily: 'monospace' }),
    input: { background: '#0d1117', border: '1px solid #334', borderRadius: 6, color: '#e2e8f0', padding: '4px 10px', fontSize: 12, fontFamily: 'monospace', outline: 'none', width: 180 } as React.CSSProperties,
    recordCard: (d: string, active: boolean) => {
      const s = DISTINCTION_STYLE[d] || DEFAULT_STYLE;
      return { background: active ? s.bg + 'dd' : s.bg + '88', border: `1px solid ${active ? s.border : s.border + '55'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 8, cursor: 'pointer', boxShadow: active ? s.glow : 'none', transition: 'all 0.15s' } as React.CSSProperties;
    },
    badge: (d: string) => { const s = DISTINCTION_STYLE[d] || DEFAULT_STYLE; return { display: 'inline-block', padding: '1px 8px', borderRadius: 10, border: `1px solid ${s.border}`, color: s.text, fontSize: 10, background: s.bg, fontWeight: 600 } as React.CSSProperties; },
    hashRow: { fontSize: 10, color: '#4ade80', fontFamily: 'monospace', marginTop: 4, opacity: 0.7 },
    detailBox: { background: '#0d1117', border: '1px solid #00ff6633', borderRadius: 8, padding: 14, marginTop: 12, fontSize: 12 } as React.CSSProperties,
    btn: { padding: '5px 14px', borderRadius: 6, border: '1px solid #00ff6655', background: '#052e1a', color: '#00ff66', cursor: 'pointer', fontSize: 12, fontFamily: 'monospace' } as React.CSSProperties,
    sectionTitle: { fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 1 },
  };

  return (
    <div style={style.panel}>
      {/* ── Header ── */}
      <div style={style.header}>
        <div style={style.title}>💧 C8 CAUSAL MEMORY CHAIN</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {integrity && (
            <span style={style.integrityBadge(integrity.valid)}>
              {integrity.valid ? '✓ CHAIN VALID' : '⚠ CHAIN BROKEN'} · {integrity.count} records
            </span>
          )}
          <button style={style.btn} onClick={fetchChain} disabled={loading}>
            {loading ? '⟳ Loading…' : '⟳ Refresh'}
          </button>
          <label style={{ fontSize: 11, color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            Auto 5s
          </label>
        </div>
      </div>

      {/* ── Integrity Stats ── */}
      {integrity && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          {Object.entries(integrity.distinctions).filter(([,v]) => v > 0).map(([k, v]) => (
            <span key={k} style={style.badge(k)}>{k}: {v}</span>
          ))}
          <span style={{ fontSize: 10, color: '#52525b', marginLeft: 'auto' }}>
            tip: {shortHash(integrity.tipHash)}
          </span>
        </div>
      )}

      {/* ── Filters ── */}
      <div style={style.controls}>
        {FILTER_OPTIONS.map(f => (
          <button key={f} style={style.filterBtn(filter === f)} onClick={() => setFilter(f)}>{f}</button>
        ))}
        <input
          style={style.input}
          placeholder="filter by subject…"
          value={subject}
          onChange={e => setSubject(e.target.value)}
        />
        <select
          style={{ ...style.input, width: 90 }}
          value={limit}
          onChange={e => setLimit(Number(e.target.value))}
        >
          {[10, 25, 50, 100, 250].map(n => <option key={n} value={n}>{n} records</option>)}
        </select>
      </div>

      {error && <div style={{ color: '#fb7185', fontSize: 12, marginBottom: 10 }}>✗ {error}</div>}

      {/* ── Record List ── */}
      <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
        {records.length === 0 && !loading && (
          <div style={{ color: '#52525b', fontSize: 12, textAlign: 'center', paddingTop: 40 }}>
            No records match the current filter.
          </div>
        )}
        {records.map(r => (
          <div
            key={r.id}
            style={style.recordCard(r.distinction, selected?.id === r.id)}
            onClick={() => setSelected(selected?.id === r.id ? null : r)}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <span style={style.badge(r.distinction)}>{r.distinction}</span>
                {' '}
                <span style={{ fontSize: 11, color: '#94a3b8' }}>#{r.index}</span>
                <span style={{ fontSize: 11, color: '#52525b', marginLeft: 8 }}>{r.subject}</span>
              </div>
              <span style={{ fontSize: 10, color: '#52525b', whiteSpace: 'nowrap' }}>
                {new Date(r.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4, lineHeight: 1.4 }}>
              {r.statement.length > 120 ? r.statement.slice(0, 120) + '…' : r.statement}
            </div>
            <div style={style.hashRow}>
              ← {shortHash(r.previousHash)} · {shortHash(r.hash)} →
            </div>

            {/* Detail expansion */}
            {selected?.id === r.id && (
              <div style={style.detailBox}>
                <div style={style.sectionTitle}>Record Detail</div>
                {[
                  ['ID', r.id],
                  ['Source', r.source],
                  ['Author', r.author],
                  ['Policy / Authority', r.policyOrAuthority],
                  ['Evidence Ref', r.evidenceRef],
                  ['Previous Hash', r.previousHash],
                  ['Hash', r.hash],
                  ['Timestamp', r.timestamp],
                ].map(([label, val]) => val ? (
                  <div key={label} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
                    <span style={{ color: '#52525b', minWidth: 120, fontSize: 11 }}>{label}</span>
                    <span style={{ color: '#94a3b8', fontSize: 11, wordBreak: 'break-all' }}>{val}</span>
                  </div>
                ) : null)}
                {r.metadata && Object.keys(r.metadata).length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <span style={{ color: '#52525b', fontSize: 11 }}>Metadata</span>
                    <pre style={{ color: '#60a5fa', fontSize: 10, margin: '4px 0 0', background: '#0a0f18', padding: 8, borderRadius: 4, overflowX: 'auto' }}>
                      {JSON.stringify(r.metadata, null, 2)}
                    </pre>
                  </div>
                )}
                <button
                  style={{ ...style.btn, fontSize: 11, marginTop: 10 }}
                  onClick={e => { e.stopPropagation(); setReplayId(r.id); handleReplay(); }}
                >
                  ⟳ Replay this record
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Replay by ID ── */}
      <div style={{ marginTop: 20, borderTop: '1px solid #1a2030', paddingTop: 14 }}>
        <div style={style.sectionTitle}>Exact Record Replay (C8 — by ID)</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            style={{ ...style.input, width: 280 }}
            placeholder="kai-<timestamp>-<index>"
            value={replayId}
            onChange={e => setReplayId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleReplay()}
          />
          <button style={style.btn} onClick={handleReplay}>Replay</button>
        </div>
        {replayError && <div style={{ color: '#fb7185', fontSize: 11, marginTop: 6 }}>✗ {replayError}</div>}
        {replayRecord && (
          <div style={{ ...style.detailBox, marginTop: 10 }}>
            <span style={style.badge(replayRecord.distinction)}>{replayRecord.distinction}</span>
            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>#{replayRecord.index} · {replayRecord.subject}</span>
            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 6 }}>{replayRecord.statement}</div>
            <div style={style.hashRow}>hash: {replayRecord.hash}</div>
          </div>
        )}
      </div>
    </div>
  );
}

