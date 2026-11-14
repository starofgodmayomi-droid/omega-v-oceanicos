/**
 * Omega OCEANICOS — Finite Wealth Action (FWA) Panel
 * Live sovereign wealth allocation cockpit: trading P&L -> tithe, capital, debt, income seed, reserve.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { theme } from './oceanicosTheme';

/* ─────────── Types ─────────── */
type WealthCategory = 'TITHE' | 'CAPITAL' | 'DEBT_ELIMINATION' | 'INCOME_SEED' | 'RESERVE';

interface WealthAllocation {
  id: string;
  sourceType: string;
  sourceRef: string;
  grossAmount: number;
  category: WealthCategory;
  allocationPercent: number;
  allocatedAmount: number;
  description: string;
  status: string;
  evidenceHash: string;
  createdAt: string;
  dispatchedAt?: string;
}

interface WealthLedger {
  id: string;
  sovereignOwner: string;
  totalRealizedIn: number;
  totalAllocated: number;
  totalTithe: number;
  totalCapital: number;
  totalDebtElimination: number;
  totalIncomeSeed: number;
  totalReserve: number;
  allocationCount: number;
  allocations: WealthAllocation[];
  lastSyncedPortfolioRealizedPnl: number;
  updatedAt: string;
}

type CategorySummary = Record<WealthCategory, { total: number; count: number; percent: number }>;

/* ─────────── Config ─────────── */
const API_BASE = (
  (import.meta as any).env?.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.port !== '5000'
    ? `http://${window.location.hostname}:5000`
    : '')
).replace(/\/$/, '');

const CAT_META: Record<WealthCategory, { label: string; emoji: string; color: string; desc: string }> = {
  TITHE: {
    label: 'Tithe',
    emoji: '✝️',
    color: '#a78bfa',
    desc: 'First-fruits covenant — 10% returned to Source',
  },
  CAPITAL: {
    label: 'Capital',
    emoji: '📈',
    color: '#34d399',
    desc: 'Sovereign growth capital — 40% compounding wealth',
  },
  DEBT_ELIMINATION: {
    label: 'Debt Elimination',
    emoji: '🔓',
    color: '#f59e0b',
    desc: 'Freedom engine — 25% eliminating financial chains',
  },
  INCOME_SEED: {
    label: 'Income Seed',
    emoji: '🌱',
    color: '#38bdf8',
    desc: 'Passive income seeding — 20% building streams',
  },
  RESERVE: {
    label: 'Reserve',
    emoji: '🛡️',
    color: '#f87171',
    desc: 'Sovereign buffer — 5% protected reserve',
  },
};

/* ─────────── Helpers ─────────── */
function fmt$(n: number, decimals = 2): string {
  if (!isFinite(n)) return '$0.00';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

/* ─────────── Component ─────────── */
export function WealthActionPanel() {
  const [ledger, setLedger] = useState<WealthLedger | null>(null);
  const [summary, setSummary] = useState<CategorySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [notionSyncLoading, setNotionSyncLoading] = useState(false);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'dispatch'>('overview');

  // Dispatch form
  const [dispatchAmount, setDispatchAmount] = useState('');
  const [dispatchDesc, setDispatchDesc] = useState('');
  const [dispatchSource, setDispatchSource] = useState<'MANUAL_DEPOSIT' | 'INCOME_STREAM'>('MANUAL_DEPOSIT');

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/v1/wealth/ledger`);
      const data = await res.json();
      if (data.success) {
        setLedger(data.ledger);
        setSummary(data.summary);
      } else {
        setError(data.error ?? 'Failed to load wealth ledger');
      }
    } catch (e: any) {
      setError('Network error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleNotionSync = useCallback(async () => {
    setNotionSyncLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${API_BASE}/v1/wealth/notion-sync`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`✓ Synced to Notion Wealth Engine (${data.surface?.name}) · Evidence: ${data.syncHash?.slice(0, 10)}…`);
      } else {
        setError(data.error ?? 'Notion sync failed');
      }
    } catch (e: any) {
      setError('Notion sync error: ' + e.message);
    } finally {
      setNotionSyncLoading(false);
    }
  }, []);

  const handleSync = useCallback(async () => {
    setSyncLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${API_BASE}/v1/wealth/sync`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setLedger(data.ledger);
        setSummary(data.summary);
        if (data.synced) {
          setSuccessMsg(`Auto-sync: +${fmt$(data.newGross)} dispatched across ${data.allocations?.length ?? 0} categories`);
        } else {
          setSuccessMsg('Sync complete — no new realized P&L to dispatch');
        }
      } else {
        setError(data.error ?? 'Sync failed');
      }
    } catch (e: any) {
      setError('Network error: ' + e.message);
    } finally {
      setSyncLoading(false);
    }
  }, []);

  const handleDispatch = useCallback(async () => {
    const amount = parseFloat(dispatchAmount);
    if (!isFinite(amount) || amount <= 0) {
      setError('Enter a valid positive amount');
      return;
    }
    setDispatchLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const body: any = {
        grossAmount: amount,
        sourceType: dispatchSource,
        description: dispatchDesc || undefined,
      };
      const res = await fetch(`${API_BASE}/v1/wealth/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setLedger(data.ledger);
        setSummary(data.summary);
        setSuccessMsg(`Dispatched ${fmt$(amount)} → ${data.allocations?.length ?? 0} allocations`);
        setDispatchAmount('');
        setDispatchDesc('');
        setActiveTab('overview');
      } else {
        setError(data.error ?? 'Dispatch failed');
      }
    } catch (e: any) {
      setError('Network error: ' + e.message);
    } finally {
      setDispatchLoading(false);
    }
  }, [dispatchAmount, dispatchDesc, dispatchSource]);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);

  const cats: WealthCategory[] = ['TITHE', 'CAPITAL', 'DEBT_ELIMINATION', 'INCOME_SEED', 'RESERVE'];

  const totalIn = ledger?.totalRealizedIn ?? 0;
  const totalAllocated = ledger?.totalAllocated ?? 0;

  return (
    <div style={{
      background: theme.bg,
      color: theme.text,
      minHeight: '100%',
      fontFamily: "'Inter', sans-serif",
      padding: '0',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0d1117 0%, #1a0a2e 50%, #0d1117 100%)',
        borderBottom: '1px solid rgba(167,139,250,0.2)',
        padding: '24px 28px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#a78bfa', letterSpacing: '-0.01em' }}>
              💰 Finite Wealth Action Pipeline
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
              ELION VAREL // 11:11 — Sovereign Allocation Engine
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={handleNotionSync}
              disabled={notionSyncLoading}
              style={{
                background: notionSyncLoading ? '#374151' : 'linear-gradient(90deg, #a78bfa, #7c3aed)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: notionSyncLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
              }}
            >
              {notionSyncLoading ? '⟳ Syncing Notion…' : '🏛️ Sync Notion Wealth'}
            </button>
            <button
              onClick={handleSync}
              disabled={syncLoading}
              style={{
                background: syncLoading ? '#374151' : 'linear-gradient(90deg, #34d399, #059669)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: syncLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
              }}
            >
              {syncLoading ? '⟳ Syncing…' : '⟳ Sync from Trading'}
            </button>
            <button
              onClick={fetchLedger}
              disabled={loading}
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: '#9ca3af',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 13,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '…' : '↻ Refresh'}
            </button>
          </div>
        </div>

        {/* Totals Strip */}
        <div style={{ display: 'flex', gap: 20, marginTop: 18, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Realized In', value: fmt$(totalIn), color: '#34d399' },
            { label: 'Total Allocated', value: fmt$(totalAllocated), color: '#a78bfa' },
            { label: 'Dispatches', value: String(ledger?.allocationCount ?? 0), color: '#38bdf8' },
          ].map((item) => (
            <div key={item.label} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              padding: '10px 16px',
            }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      {(error || successMsg) && (
        <div style={{
          margin: '12px 28px 0',
          padding: '10px 14px',
          borderRadius: 8,
          fontSize: 13,
          background: error ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.12)',
          border: `1px solid ${error ? 'rgba(239,68,68,0.3)' : 'rgba(52,211,153,0.25)'}`,
          color: error ? '#f87171' : '#34d399',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{error ?? successMsg}</span>
          <button onClick={() => { setError(null); setSuccessMsg(null); }} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 28px', marginTop: 16 }}>
        {(['overview', 'history', 'dispatch'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #a78bfa' : '2px solid transparent',
              color: activeTab === tab ? '#a78bfa' : '#6b7280',
              fontWeight: activeTab === tab ? 600 : 400,
              fontSize: 13,
              padding: '10px 16px',
              cursor: 'pointer',
              textTransform: 'capitalize',
              transition: 'all 0.15s',
            }}
          >
            {tab === 'overview' ? '📊 Overview' : tab === 'history' ? '📋 History' : '➕ Dispatch'}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px 28px 40px' }}>
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            {/* Category Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
              {cats.map((cat) => {
                const meta = CAT_META[cat];
                const sum = summary?.[cat];
                const catValue = cat === 'TITHE' ? ledger?.totalTithe
                  : cat === 'CAPITAL' ? ledger?.totalCapital
                  : cat === 'DEBT_ELIMINATION' ? ledger?.totalDebtElimination
                  : cat === 'INCOME_SEED' ? ledger?.totalIncomeSeed
                  : ledger?.totalReserve;
                const pct = sum?.percent ?? 0;
                return (
                  <div
                    key={cat}
                    style={{
                      background: `linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2))`,
                      border: `1px solid ${meta.color}30`,
                      borderTop: `3px solid ${meta.color}`,
                      borderRadius: 12,
                      padding: '16px',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 6 }}>{meta.emoji}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: meta.color, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>
                      {meta.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#4b5563', marginBottom: 10, lineHeight: 1.3 }}>{meta.desc}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{fmt$(catValue ?? 0)}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>{sum?.count ?? 0} allocations</div>
                    {/* Bar */}
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: meta.color, borderRadius: 2, transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>{pct}% of total in</div>
                  </div>
                );
              })}
            </div>

            {/* Default Splits Info */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '16px 20px',
            }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#9ca3af', fontWeight: 600 }}>
                ⚖️ Sovereign Allocation Formula (Default Splits)
              </h3>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {cats.map((cat) => (
                  <div key={cat} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 12,
                  }}>
                    <span>{CAT_META[cat].emoji}</span>
                    <span style={{ color: CAT_META[cat].color, fontWeight: 600 }}>{CAT_META[cat].label}</span>
                    <span style={{ color: '#6b7280' }}>
                      {cat === 'TITHE' ? '10%' : cat === 'CAPITAL' ? '40%' : cat === 'DEBT_ELIMINATION' ? '25%' : cat === 'INCOME_SEED' ? '20%' : '5%'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>
              {ledger?.allocations?.length ?? 0} total allocation events
            </div>
            {!ledger?.allocations?.length ? (
              <div style={{ textAlign: 'center', color: '#4b5563', padding: '40px 0', fontSize: 14 }}>
                No allocations yet — dispatch or sync from trading to begin
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ledger.allocations.slice(0, 50).map((alloc) => {
                  const meta = CAT_META[alloc.category];
                  return (
                    <div
                      key={alloc.id}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${meta.color}20`,
                        borderLeft: `3px solid ${meta.color}`,
                        borderRadius: 8,
                        padding: '12px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span>{meta.emoji}</span>
                          <span style={{ color: meta.color, fontWeight: 600, fontSize: 13 }}>{meta.label}</span>
                          <span style={{
                            fontSize: 10,
                            background: alloc.status === 'DISPATCHED' ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.08)',
                            color: alloc.status === 'DISPATCHED' ? '#34d399' : '#9ca3af',
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}>{alloc.status}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>{alloc.description}</div>
                        <div style={{ fontSize: 10, color: '#374151', marginTop: 3 }}>
                          {alloc.evidenceHash.slice(0, 16)}… · {fmtDate(alloc.createdAt)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{fmt$(alloc.allocatedAmount)}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>{alloc.allocationPercent.toFixed(1)}% of {fmt$(alloc.grossAmount)}</div>
                        <div style={{ fontSize: 10, color: '#4b5563' }}>{alloc.sourceType}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* DISPATCH TAB */}
        {activeTab === 'dispatch' && (
          <div style={{ maxWidth: 500 }}>
            <div style={{
              background: 'rgba(167,139,250,0.06)',
              border: '1px solid rgba(167,139,250,0.2)',
              borderRadius: 12,
              padding: '20px 22px',
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#a78bfa', fontWeight: 700 }}>
                ➕ Manual FWA Dispatch
              </h3>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
                  Gross Amount (USD)
                </label>
                <input
                  type="number"
                  value={dispatchAmount}
                  onChange={(e) => setDispatchAmount(e.target.value)}
                  placeholder="e.g. 500.00"
                  min="1"
                  step="0.01"
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: 15,
                    padding: '10px 12px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
                  Source Type
                </label>
                <select
                  value={dispatchSource}
                  onChange={(e) => setDispatchSource(e.target.value as any)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: 13,
                    padding: '10px 12px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="MANUAL_DEPOSIT">Manual Deposit</option>
                  <option value="INCOME_STREAM">Income Stream</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={dispatchDesc}
                  onChange={(e) => setDispatchDesc(e.target.value)}
                  placeholder="e.g. Freelance income — November"
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: 13,
                    padding: '10px 12px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Preview splits */}
              {dispatchAmount && parseFloat(dispatchAmount) > 0 && (
                <div style={{ marginBottom: 16, background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>Allocation Preview</div>
                  {cats.map((cat) => {
                    const pctMap: Record<WealthCategory, number> = { TITHE: 10, CAPITAL: 40, DEBT_ELIMINATION: 25, INCOME_SEED: 20, RESERVE: 5 };
                    const amt = (pctMap[cat] / 100) * parseFloat(dispatchAmount);
                    return (
                      <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: CAT_META[cat].color }}>{CAT_META[cat].emoji} {CAT_META[cat].label}</span>
                        <span style={{ color: '#9ca3af', fontWeight: 600 }}>{fmt$(amt)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={handleDispatch}
                disabled={dispatchLoading || !dispatchAmount || parseFloat(dispatchAmount) <= 0}
                style={{
                  width: '100%',
                  background: dispatchLoading ? '#374151' : 'linear-gradient(90deg, #a78bfa, #8b5cf6)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: dispatchLoading ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.03em',
                }}
              >
                {dispatchLoading ? 'Dispatching…' : '🚀 Dispatch FWA'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WealthActionPanel;
