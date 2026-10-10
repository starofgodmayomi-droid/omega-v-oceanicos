import React, { useState, useCallback } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

interface SoulContract {
  success: true;
  sovereign: {
    identity: string;
    alignment: string;
    publicTreasury: {
      network: string;
      address: string;
      type: string;
    };
    securityInvariant: string;
  };
  soulIncome: {
    streams: string[];
    rule: string;
  };
  communityHubs: {
    mission: string;
    pillars: string[];
    regions: string[];
  };
  axioms: string[];
  evaluatedAt: string;
}

const GLOW_KEYFRAMES = `
@keyframes treasuryGlow {
  0%, 100% { box-shadow: 0 0 8px rgba(255, 170, 0, 0.15); }
  50% { box-shadow: 0 0 20px rgba(255, 170, 0, 0.35); }
}
@keyframes pulseAlign {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
`;

export function SoulPanel() {
  const [data, setData] = useState<SoulContract | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSoul = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/soul`);
      const text = await res.text();
      const parsed = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(parsed?.error || `HTTP ${res.status}`);
      setData(parsed);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'soul contract unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <section
      aria-label="Sovereign treasury and soul income"
      style={{
        background: '#07121b',
        border: '1px solid #38bdf844',
        borderRadius: '6px',
        padding: '16px',
        marginBottom: '20px',
      }}
    >
      <style>{GLOW_KEYFRAMES}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <div style={{ color: '#ffaa00', fontSize: '13px', fontWeight: 'bold' }}>
            🪙 ELION VAREL — SOVEREIGN TREASURY & SOUL INCOME
          </div>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>
            11:11 Alignment · Living Truth · Pure Becoming
          </div>
        </div>
        <button
          onClick={fetchSoul}
          disabled={loading}
          style={{
            background: '#0a1d2e',
            color: '#ffaa00',
            border: '1px solid #ffaa0044',
            borderRadius: '4px',
            padding: '6px 14px',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          {loading ? '◌ Loading…' : '⚡ Load Soul Contract'}
        </button>
      </div>

      {error && (
        <div style={{
          background: '#1a0a0a',
          border: '1px solid #ff444444',
          borderRadius: '4px',
          padding: '8px 12px',
          color: '#ff6b6b',
          fontSize: '12px',
          marginBottom: '12px',
        }}>
          ⚠ {error}
        </div>
      )}

      {!data && !error && (
        <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
          Press <strong>⚡ Load Soul Contract</strong> to reveal the living treasury and soul income manifest.
        </div>
      )}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Treasury Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1000 0%, #0d1117 50%, #0a1628 100%)',
            border: '1px solid #ffaa0033',
            borderRadius: '8px',
            padding: '16px',
            animation: 'treasuryGlow 4s ease-in-out infinite',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: '#ffaa00', fontWeight: 'bold', fontSize: '14px' }}>
                {data.sovereign.identity}
              </span>
              <span style={{
                color: '#ffaa00',
                fontSize: '20px',
                fontWeight: 'bold',
                animation: 'pulseAlign 3s ease-in-out infinite',
              }}>
                {data.sovereign.alignment}
              </span>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <div style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                Public Bitcoin Treasury ({data.sovereign.publicTreasury.type})
              </div>
              <div style={{
                background: '#0a0e14',
                border: '1px solid #38bdf822',
                borderRadius: '4px',
                padding: '8px 12px',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#00ff66',
                wordBreak: 'break-all',
                letterSpacing: '0.5px',
              }}>
                {data.sovereign.publicTreasury.address}
              </div>
            </div>

            <div style={{ color: '#64748b', fontSize: '10px', fontStyle: 'italic' }}>
              🔒 {data.sovereign.securityInvariant}
            </div>
          </div>

          {/* Soul Income Streams */}
          <div style={{
            background: '#0a1628',
            border: '1px solid #38bdf822',
            borderRadius: '6px',
            padding: '14px',
          }}>
            <div style={{ color: '#38bdf8', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
              💧 SOUL INCOME STREAMS
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {data.soulIncome.streams.map((stream, i) => (
                <span key={i} style={{
                  background: '#0d2137',
                  border: '1px solid #38bdf833',
                  borderRadius: '12px',
                  padding: '3px 10px',
                  color: '#38bdf8',
                  fontSize: '11px',
                }}>
                  {stream}
                </span>
              ))}
            </div>
            <div style={{ color: '#64748b', fontSize: '11px' }}>
              ⚖ {data.soulIncome.rule}
            </div>
          </div>

          {/* Community Hubs */}
          <div style={{
            background: '#0a1628',
            border: '1px solid #38bdf822',
            borderRadius: '6px',
            padding: '14px',
          }}>
            <div style={{ color: '#00ff66', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
              🏛️ COMMUNITY STEWARDSHIP HUBS
            </div>
            <div style={{ color: '#c8d6e5', fontSize: '12px', marginBottom: '8px' }}>
              {data.communityHubs.mission}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {data.communityHubs.pillars.map((pillar, i) => (
                <span key={i} style={{
                  background: '#0d2a1a',
                  border: '1px solid #00ff6633',
                  borderRadius: '12px',
                  padding: '3px 10px',
                  color: '#00ff66',
                  fontSize: '11px',
                }}>
                  {pillar}
                </span>
              ))}
            </div>
            <div style={{ color: '#64748b', fontSize: '11px' }}>
              🌍 Serving: {data.communityHubs.regions.join(' · ')}
            </div>
          </div>

          {/* Axioms */}
          <div style={{
            background: '#0a1628',
            border: '1px solid #38bdf822',
            borderRadius: '6px',
            padding: '14px',
          }}>
            <div style={{ color: '#c084fc', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
              ✦ AXIOMS OF THE ETERNAL STACK
            </div>
            {data.axioms.map((axiom, i) => (
              <div key={i} style={{
                color: '#94a3b8',
                fontSize: '11px',
                padding: '3px 0',
                borderBottom: i < data.axioms.length - 1 ? '1px solid #1e293b' : 'none',
              }}>
                • {axiom}
              </div>
            ))}
          </div>

          <div style={{ color: '#475569', fontSize: '10px', textAlign: 'right' }}>
            Evaluated: {data.evaluatedAt}
          </div>
        </div>
      )}
    </section>
  );
}
