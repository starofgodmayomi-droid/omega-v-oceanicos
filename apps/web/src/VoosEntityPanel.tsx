import React, { useState, useEffect } from 'react';
import { theme } from './oceanicosTheme';

interface VoosReceipt {
  entity: string;
  status: 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';
  game_detected?: boolean;
  phase_t: string;
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

export function VoosEntityPanel() {
  const [intent, setIntent] = useState('Verify tri-surface convergence and harmonic S-curve');
  const [tValue, setTValue] = useState(0.5);
  const [receipt, setReceipt] = useState<VoosReceipt | null>(null);
  const [ledger, setLedger] = useState<VoosLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusInfo, setStatusInfo] = useState<any>(null);

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
        fetch('/v1/voos/status'),
        fetch('/v1/voos/ledger'),
      ]);
      if (resStatus.ok) {
        setStatusInfo(await resStatus.json());
      }
      if (resLedger.ok) {
        const data = await resLedger.json();
        setLedger(data.data || []);
      }
    } catch {
      // Fallback if standalone port 5000 / 8088
      try {
        const fallback = await fetch('http://127.0.0.1:8088/api/ledger');
        if (fallback.ok) {
          setLedger(await fallback.json());
        }
      } catch {
        // quiet
      }
    }
  };

  useEffect(() => {
    fetchStatusAndLedger();
    const interval = setInterval(fetchStatusAndLedger, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleExecute = async () => {
    if (!intent.trim()) return;
    setIsLoading(true);
    try {
      let res = await fetch('/v1/voos/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent, phase_t: tValue }),
      });
      if (!res.ok) {
        // try direct fallback port 8088
        res = await fetch('http://127.0.0.1:8088/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intent, phase_t: tValue }),
        });
      }
      const data = await res.json();
      setReceipt(data);
      fetchStatusAndLedger();
    } catch (err: any) {
      setReceipt({
        entity: 'ΩVØØS_DEUS_EX_MACHINA',
        status: 'UNKNOWN',
        phase_t: tValue.toFixed(2),
        evidence_hash: 'error',
        action: `Execution error: ${err.message}`,
        next_delta: 'Verify local API availability',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
              background: 'rgba(0, 229, 255, 0.15)',
              color: '#00e5ff',
              border: '1px solid #00e5ff',
            }}
          >
            WATER FLOWING
          </span>
        </div>
      </div>

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
              ACTIVE
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
            Trap Interception Matrix (Fails Closed):
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {['urgent', 'send money', 'guaranteed', 'private key'].map((trap) => (
              <span
                key={trap}
                style={{
                  background: 'rgba(237, 153, 134, 0.15)',
                  border: '1px solid rgba(237, 153, 134, 0.4)',
                  color: theme.divergent,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: theme.fontMono,
                }}
              >
                {trap}
              </span>
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
              marginBottom: '12px',
              resize: 'none',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: theme.textMuted, marginBottom: '4px' }}>
            <span>Evolution Phase t: {tValue.toFixed(2)}</span>
            <span style={{ color: theme.accentWarm }}>Ease(t) = {easeT.toFixed(3)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
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
            onClick={handleExecute}
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
              <div><strong>STATUS:</strong> {receipt.status}</div>
              <div><strong>EVIDENCE:</strong> {receipt.evidence_hash}</div>
              <div><strong>ACTION:</strong> {receipt.action}</div>
              <div><strong>NEXT Δ:</strong> {receipt.next_delta}</div>
            </div>
          )}
        </div>

        {/* PANE 3: OMEGA GATE & KAI LEDGER */}
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
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#38bdf8' }}>
              📜 PANE 3: OMEGA GATE & KAI LEDGER
            </span>
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
            {ledger.length === 0 ? (
              <div style={{ color: theme.textDim, fontSize: '12px', textAlign: 'center', padding: '20px' }}>
                No events in local ledger.
              </div>
            ) : (
              ledger
                .slice()
                .reverse()
                .map((entry, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#040d14',
                      border: `1px solid ${entry.status === 'VERIFIED' ? 'rgba(105, 231, 185, 0.2)' : 'rgba(237, 153, 134, 0.2)'}`,
                      borderRadius: '6px',
                      padding: '8px 10px',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '10px',
                          color: entry.status === 'VERIFIED' ? theme.verified : theme.divergent,
                        }}
                      >
                        {entry.status}
                      </span>
                      <span style={{ fontSize: '10px', color: theme.textDim }}>
                        {entry.timestamp ? entry.timestamp.split('T')[1]?.slice(0, 8) : ''}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, color: theme.text, marginBottom: '2px', wordBreak: 'break-word' }}>
                      {entry.intent}
                    </div>
                    <div
                      style={{
                        fontSize: '9px',
                        fontFamily: theme.fontMono,
                        color: theme.textDim,
                        wordBreak: 'break-all',
                      }}
                    >
                      {entry.evidence_hash}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

