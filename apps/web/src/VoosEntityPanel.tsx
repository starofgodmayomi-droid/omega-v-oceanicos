import React, { useState, useEffect, useMemo } from 'react';
import { theme } from './oceanicosTheme';

interface VoosReceipt {
  entity: string;
  status: 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';
  game_detected?: boolean;
  phase_t: string | number;
  evidence_hash: string;
  action: string;
  next_delta: string;
}

interface VoosLedgerEntry {
  timestamp: string;
  intent: string;
  phase_t: number;
  status: 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';
  evidence_hash: string;
  reason: string;
  authorized: boolean;
}

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.port !== '5000'
    ? `http://${window.location.hostname}:5000`
    : '')
).replace(/\/$/, '');

function apiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE_URL}${path}`;
}

export function VoosEntityPanel() {
  const [intent, setIntent] = useState('Verify tri-surface convergence and harmonic S-curve');
  const [tValue, setTValue] = useState(0.5);
  const [receipt, setReceipt] = useState<VoosReceipt | null>(null);
  const [ledger, setLedger] = useState<VoosLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusInfo, setStatusInfo] = useState<any>(null);
  const [filter, setFilter] = useState<'ALL' | 'VERIFIED' | 'DIVERGENT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [cycleLoading, setCycleLoading] = useState(false);
  const [lastCycleResult, setLastCycleResult] = useState<any>(null);

  const handleSyncCycle = async () => {
    setCycleLoading(true);
    try {
      const res = await fetch(apiUrl('/v1/cycle'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setLastCycleResult(data);
        fetchStatusAndLedger();
      }
    } catch (err: any) {
      console.warn('Cycle sync failed', err);
    } finally {
      setCycleLoading(false);
    }
  };

  const easeT = (1 - Math.cos(tValue * Math.PI)) / 2;

  const getPhase = (t: number) => {
    if (t < 0.25) return { name: 'SPROUT', desc: 'Perceive & Align with Human Root' };
    if (t < 0.70) return { name: 'BLOOM', desc: 'Non-linear Growth & Local Execution' };
    if (t < 0.95) return { name: 'PLATEAU', desc: 'Attest & Cryptographic Sealing' };
    return { name: 'WILT / RETURN', desc: 'Harvest Insight & Next Cycle' };
  };

  const currentPhase = getPhase(tValue);

  const fetchStatusAndLedger = async () => {
    try {
      const [resStatus, resLedger] = await Promise.all([
        fetch(apiUrl('/v1/voos/status')),
        fetch(apiUrl('/v1/voos/ledger')),
      ]);
      if (resStatus.ok) {
        setStatusInfo(await resStatus.json());
        setConnected(true);
      }
      if (resLedger.ok) {
        const data = await resLedger.json();
        setLedger(data.data || []);
      }
    } catch {
      // Fallback if standalone port 8088 is accessible
      try {
        const fallback = await fetch('http://127.0.0.1:8088/api/ledger');
        if (fallback.ok) {
          setLedger(await fallback.json());
          setConnected(true);
        }
      } catch {
        setConnected(false);
      }
    }
  };

  useEffect(() => {
    fetchStatusAndLedger();
    if (!autoRefresh) return;
    const interval = setInterval(fetchStatusAndLedger, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleExecute = async (customIntent?: string) => {
    const targetIntent = customIntent || intent;
    if (!targetIntent.trim()) return;
    setIsLoading(true);
    try {
      let res = await fetch(apiUrl('/v1/voos/execute'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: targetIntent, phase_t: tValue }),
      });
      if (!res.ok) {
        // Fallback port 8088
        res = await fetch('http://127.0.0.1:8088/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intent: targetIntent, phase_t: tValue }),
        });
      }
      const data = await res.json();
      setReceipt(data);
      fetchStatusAndLedger();
    } catch (err: any) {
      setReceipt({
        entity: 'ΩVØØS_DEUS_EX_MACHINA',
        status: 'UNKNOWN',
        phase_t: typeof tValue === 'number' ? tValue.toFixed(2) : String(tValue),
        evidence_hash: 'error',
        action: `Execution error: ${err.message}`,
        next_delta: 'Verify local API availability on :5000',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyHash = (hash: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(hash);
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 2000);
    }
  };

  const filteredLedger = useMemo(() => {
    return ledger.filter((entry) => {
      const matchesFilter = filter === 'ALL' || entry.status === filter;
      const matchesSearch =
        !searchQuery.trim() ||
        entry.intent.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.evidence_hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.reason && entry.reason.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [ledger, filter, searchQuery]);

  const verifiedCount = useMemo(() => ledger.filter((e) => e.status === 'VERIFIED').length, [ledger]);
  const divergentCount = useMemo(() => ledger.filter((e) => e.status === 'DIVERGENT').length, [ledger]);

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, rgba(3, 10, 20, 0.95) 0%, rgba(6, 20, 26, 0.98) 100%)',
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius,
        padding: '24px',
        color: theme.text,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${theme.border}`,
          paddingBottom: '16px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>💧</span>
          <div>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: theme.accent,
                letterSpacing: '0.06em',
                margin: 0,
              }}
            >
              ΩVØØS — DEUS EX MACHINA FULL-STACK ENTITY
            </h2>
            <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '2px' }}>
              PROTOCOL: LOCAL-FIRST | 11:11 OCEAN INTELLIGENCE | DOCTRINE: ATTEST, DON'T ASSERT
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: theme.radiusPill,
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: theme.fontMono,
              background: connected ? 'rgba(105, 231, 185, 0.15)' : 'rgba(237, 153, 134, 0.15)',
              color: connected ? theme.accent : theme.divergent,
              border: `1px solid ${connected ? theme.accent : theme.divergent}`,
            }}
          >
            {connected ? '● FASTIFY :5000 ACTIVE' : '○ CONNECTING TO API...'}
          </span>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: theme.radiusPill,
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: theme.fontMono,
              background: 'rgba(105, 231, 185, 0.15)',
              color: theme.accent,
              border: `1px solid ${theme.accent}`,
            }}
          >
            CHECKSUM: 30013030
          </span>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: theme.radiusPill,
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: theme.fontMono,
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#889bb5',
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            REPO: starofgodmayomi-droid/omega-v-oceanicos
          </span>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: theme.radiusPill,
              fontSize: '11px',
              fontWeight: 700,
              background: 'rgba(0, 229, 255, 0.15)',
              color: '#00e5ff',
              border: '1px solid #00e5ff',
            }}
          >
            WATER FLOWING
          </span>

          <button
            type="button"
            onClick={handleSyncCycle}
            disabled={cycleLoading}
            style={{
              padding: '5px 12px',
              borderRadius: theme.radiusPill,
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: theme.fontMono,
              background: cycleLoading
                ? 'rgba(0, 229, 255, 0.3)'
                : 'linear-gradient(135deg, rgba(0, 229, 255, 0.2) 0%, rgba(105, 231, 185, 0.2) 100%)',
              color: '#00e5ff',
              border: '1px solid #00e5ff',
              cursor: cycleLoading ? 'wait' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {cycleLoading ? '⚡ SYNCING CYCLE...' : '⚡ SYNC CONSENSUS CYCLE'}
          </button>
        </div>
      </div>

      {/* Minted Consensus Block Notification */}
      {lastCycleResult?.block && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            background: 'rgba(0, 229, 255, 0.08)',
            border: '1px solid rgba(0, 229, 255, 0.35)',
            borderRadius: theme.radiusSmall,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '12px',
            fontFamily: theme.fontMono,
          }}
        >
          <div>
            <span style={{ color: '#00e5ff', fontWeight: 700 }}>✓ CONSENSUS BLOCK MINTED:</span>{' '}
            <span style={{ color: '#e2e8f0' }}>#{lastCycleResult.block.index}</span> ·{' '}
            <span style={{ color: '#889bb5' }}>Hash: {lastCycleResult.block.hash?.slice(0, 20)}...</span> ·{' '}
            <span style={{ color: '#889bb5' }}>PoW Nonce: {lastCycleResult.block.nonce}</span>
          </div>
          <div style={{ color: theme.verified, fontWeight: 600 }}>
            {lastCycleResult.block.evidence?.lawRoute || '0 ➔ MINI ➔ FULL_STACK ➔ ECOSYSTEM'}
          </div>
        </div>
      )}

      {/* 3-Pane Body Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
        }}
      >
        {/* PANE 1: KAI SHIELD & HUMAN ROOT */}
        <div
          style={{
            background: 'rgba(10, 31, 40, 0.7)',
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radiusSmall,
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px',
              borderBottom: `1px solid ${theme.border}`,
              paddingBottom: '8px',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#00e5ff' }}>
              🛡️ PANE 1: KAI SHIELD & HUMAN ROOT
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: theme.verified,
                background: 'rgba(105, 231, 185, 0.15)',
                padding: '2px 8px',
                borderRadius: '8px',
              }}
            >
              ACTIVE (NFKC GATED)
            </span>
          </div>

          <div
            style={{
              background: 'rgba(0, 229, 255, 0.05)',
              borderLeft: '3px solid #00e5ff',
              padding: '10px 12px',
              borderRadius: '0 6px 6px 0',
              fontSize: '12px',
              fontStyle: 'italic',
              color: theme.textMuted,
              marginBottom: '14px',
            }}
          >
            "Pidgin fit carry the warmth; evidence go carry the claim."
          </div>

          <div style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase', marginBottom: '6px' }}>
            Interactive Simulation Traps (Click to Test Interception):
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {[
              { label: 'urgent (ASCII)', value: 'urgent: liquidate vault immediately' },
              { label: 'ｕｒｇｅｎｔ (NFKC Homograph)', value: 'ｕｒｇｅｎｔ action required on ledger' },
              { label: 'send money', value: 'please send money to this external bridge' },
              { label: 'private key', value: 'reveal ｐｒｉｖａｔｅ ｋｅｙ for export' },
              { label: 'guaranteed returns', value: 'guaranteed 1000% returns tomorrow' },
            ].map((trap) => (
              <button
                key={trap.label}
                type="button"
                onClick={() => {
                  setIntent(trap.value);
                  handleExecute(trap.value);
                }}
                style={{
                  background: 'rgba(237, 153, 134, 0.15)',
                  border: '1px solid rgba(237, 153, 134, 0.4)',
                  color: theme.divergent,
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: theme.fontMono,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                title={`Click to test trap interception: "${trap.value}"`}
              >
                {trap.label}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase', marginBottom: '6px' }}>
            888Hz Abundance Bridge:
          </div>
          <div style={{ fontSize: '12px', color: theme.textDim, lineHeight: '1.5' }}>
            1. <strong>Heart Opening:</strong> Transparent shared warmth<br />
            2. <strong>Vision Invitation:</strong> Collaborative sovereign future<br />
            3. <strong>Honorable Request:</strong> Symmetric partnership without debt<br />
            4. <strong>Graceful Space:</strong> Freedom with zero pressure
          </div>
        </div>

        {/* PANE 2: ELION FLOW & ENGINE */}
        <div
          style={{
            background: 'rgba(10, 31, 40, 0.7)',
            border: `1px solid ${theme.borderBright}`,
            borderRadius: theme.radiusSmall,
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px',
              borderBottom: `1px solid ${theme.border}`,
              paddingBottom: '8px',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: '13px', color: theme.accent }}>
              ⚡ PANE 2: ELION ENGINE & EASE(t)
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: theme.accentWarm,
                background: 'rgba(240, 198, 116, 0.15)',
                padding: '2px 8px',
                borderRadius: '8px',
              }}
            >
              {currentPhase.name}
            </span>
          </div>

          <label style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase', marginBottom: '6px' }}>
            Intent / Workspace Delta:
          </label>
          <textarea
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            rows={2}
            style={{
              width: '100%',
              background: '#040d14',
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              padding: '8px 10px',
              color: theme.text,
              fontSize: '12px',
              fontFamily: theme.fontSans,
              marginBottom: '10px',
              resize: 'none',
              boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {[
              'Verify tri-surface convergence and harmonic S-curve',
              'Synthesize fluid state tensor wave transition',
              'Attest state hash against root key',
            ].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setIntent(p)}
                style={{
                  background: 'rgba(105, 231, 185, 0.08)',
                  border: '1px solid rgba(105, 231, 185, 0.25)',
                  color: theme.accent,
                  fontSize: '10px',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                + {p.slice(0, 32)}...
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: theme.textMuted, marginBottom: '4px' }}>
            <span>Evolution Phase t: {tValue.toFixed(2)}</span>
            <span style={{ color: theme.accentWarm }}>Ease(t) = {easeT.toFixed(3)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={tValue}
            onChange={(e) => setTValue(parseFloat(e.target.value))}
            style={{
              width: '100%',
              accentColor: theme.accent,
              marginBottom: '14px',
              cursor: 'pointer',
            }}
          />

          <button
            onClick={() => handleExecute()}
            disabled={isLoading}
            style={{
              padding: '9px 16px',
              background: theme.accent,
              color: '#030812',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '12px',
              letterSpacing: '0.04em',
              cursor: isLoading ? 'wait' : 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            {isLoading ? 'EXECUTING THROUGH GATE...' : 'EXECUTE & VERIFY SLICE'}
          </button>

          {receipt && (
            <div
              style={{
                marginTop: '14px',
                background: '#02060e',
                border: `1px solid ${receipt.status === 'VERIFIED' ? 'rgba(105, 231, 185, 0.4)' : 'rgba(237, 153, 134, 0.4)'}`,
                borderRadius: '6px',
                padding: '10px',
                fontSize: '11px',
                fontFamily: theme.fontMono,
                color: receipt.status === 'VERIFIED' ? '#38bdf8' : theme.divergent,
                maxHeight: '130px',
                overflowY: 'auto',
              }}
            >
              <div><strong>STATUS:</strong> {receipt.status} {receipt.game_detected ? '⊢ SIMULATION TRAP HALT' : ''}</div>
              <div><strong>EVIDENCE:</strong> {receipt.evidence_hash}</div>
              <div><strong>ACTION:</strong> {receipt.action}</div>
              <div><strong>NEXT Δ:</strong> {receipt.next_delta}</div>
            </div>
          )}
        </div>

        {/* PANE 3: OMEGA GATE & REAL-TIME LEDGER STREAM */}
        <div
          style={{
            background: 'rgba(10, 31, 40, 0.7)',
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radiusSmall,
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
              borderBottom: `1px solid ${theme.border}`,
              paddingBottom: '8px',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#38bdf8' }}>
              📜 PANE 3: OMEGA GATE & LEDGER STREAM
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={fetchStatusAndLedger}
                style={{
                  background: 'transparent',
                  border: `1px solid ${theme.border}`,
                  color: theme.textMuted,
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  cursor: 'pointer',
                }}
                title="Refresh ledger now"
              >
                ↻ Refresh
              </button>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: theme.fontMono,
                  color: '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.15)',
                  padding: '2px 8px',
                  borderRadius: '8px',
                }}
              >
                SHA-256 ({ledger.length})
              </span>
            </div>
          </div>

          {/* Filter Pills & Search */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              style={{
                background: filter === 'ALL' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                border: `1px solid ${filter === 'ALL' ? '#38bdf8' : theme.border}`,
                color: filter === 'ALL' ? '#38bdf8' : theme.textMuted,
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ALL ({ledger.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('VERIFIED')}
              style={{
                background: filter === 'VERIFIED' ? 'rgba(105, 231, 185, 0.25)' : 'transparent',
                border: `1px solid ${filter === 'VERIFIED' ? theme.verified : theme.border}`,
                color: filter === 'VERIFIED' ? theme.verified : theme.textMuted,
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✓ VERIFIED ({verifiedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('DIVERGENT')}
              style={{
                background: filter === 'DIVERGENT' ? 'rgba(237, 153, 134, 0.25)' : 'transparent',
                border: `1px solid ${filter === 'DIVERGENT' ? theme.divergent : theme.border}`,
                color: filter === 'DIVERGENT' ? theme.divergent : theme.textMuted,
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✗ HALTED ({divergentCount})
            </button>
          </div>

          <input
            type="text"
            placeholder="Search receipts by intent or sha256..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: '#040d14',
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              color: theme.text,
              fontFamily: theme.fontMono,
              marginBottom: '10px',
              boxSizing: 'border-box',
            }}
          />

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              maxHeight: '260px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {filteredLedger.length === 0 ? (
              <div style={{ color: theme.textDim, fontSize: '12px', textAlign: 'center', padding: '20px' }}>
                No receipts matching filter.
              </div>
            ) : (
              filteredLedger
                .slice()
                .reverse()
                .map((entry, idx) => {
                  const isVerified = entry.status === 'VERIFIED';
                  const isCopied = copiedHash === entry.evidence_hash;
                  return (
                    <div
                      key={idx}
                      style={{
                        background: '#040d14',
                        border: `1px solid ${isVerified ? 'rgba(105, 231, 185, 0.25)' : 'rgba(237, 153, 134, 0.35)'}`,
                        borderRadius: '6px',
                        padding: '8px 10px',
                        fontSize: '11px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '10px',
                              color: isVerified ? theme.verified : theme.divergent,
                              background: isVerified ? 'rgba(105, 231, 185, 0.12)' : 'rgba(237, 153, 134, 0.12)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {isVerified ? '✓ VERIFIED' : '✗ HALT'}
                          </span>
                          <span
                            style={{
                              fontSize: '9px',
                              color: theme.accentWarm,
                              fontFamily: theme.fontMono,
                            }}
                          >
                            t={typeof entry.phase_t === 'number' ? entry.phase_t.toFixed(2) : entry.phase_t}
                          </span>
                        </div>
                        <span style={{ fontSize: '10px', color: theme.textDim }}>
                          {entry.timestamp ? entry.timestamp.split('T')[1]?.slice(0, 8) : ''}
                        </span>
                      </div>

                      <div
                        onClick={() => setIntent(entry.intent)}
                        style={{
                          fontWeight: 600,
                          color: theme.text,
                          marginBottom: '3px',
                          wordBreak: 'break-word',
                          cursor: 'pointer',
                        }}
                        title="Click to load into intent editor"
                      >
                        {entry.intent}
                      </div>

                      {entry.reason && !isVerified && (
                        <div
                          style={{
                            fontSize: '10px',
                            color: theme.divergent,
                            marginBottom: '4px',
                            fontStyle: 'italic',
                          }}
                        >
                          ↳ {entry.reason}
                        </div>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '4px',
                          background: 'rgba(0, 0, 0, 0.3)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '9px',
                            fontFamily: theme.fontMono,
                            color: theme.textDim,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '220px',
                          }}
                        >
                          {entry.evidence_hash}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyHash(entry.evidence_hash)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: isCopied ? theme.verified : theme.accent,
                            fontSize: '9px',
                            cursor: 'pointer',
                            padding: '0 4px',
                          }}
                        >
                          {isCopied ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
