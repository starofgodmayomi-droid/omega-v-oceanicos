import React, { useState, useEffect, useCallback } from 'react';

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
@keyframes waterRipples {
  0%, 100% { border-color: rgba(56, 189, 248, 0.25); box-shadow: 0 0 15px rgba(0, 245, 160, 0.08); }
  50% { border-color: rgba(0, 245, 160, 0.45); box-shadow: 0 0 25px rgba(0, 245, 160, 0.2); }
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

  useEffect(() => {
    fetchSoul();
  }, [fetchSoul]);

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

          {/* Void of Water — Total Security Matrix Card */}
          <div style={{
            background: 'linear-gradient(145deg, #020d18 0%, #041c2c 50%, #031422 100%)',
            border: '1px solid #00f5a044',
            borderRadius: '8px',
            padding: '16px',
            animation: 'waterRipples 6s ease-in-out infinite',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>💧</span>
                <span style={{ color: '#00f5a0', fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.5px' }}>
                  VOID OF WATER // TOTAL SECURITY MATRIX
                </span>
              </div>
              <span style={{
                background: '#00f5a01a',
                border: '1px solid #00f5a055',
                color: '#00f5a0',
                fontSize: '10px',
                fontWeight: 'bold',
                padding: '3px 8px',
                borderRadius: '12px',
                letterSpacing: '0.8px',
              }}>
                ✓ FAIL-CLOSED · INVIOLABLE
              </span>
            </div>

            <div style={{
              background: '#010911',
              border: '1px solid #38bdf822',
              borderRadius: '6px',
              padding: '10px 14px',
              marginBottom: '12px',
              fontSize: '11px',
              color: '#38bdf8',
              lineHeight: '1.5',
            }}>
              <strong>Structural Subtraction Axiom:</strong> <em>Good − O = God</em>. The Void of Water aggressively dissolves terrestrial friction through continuous, fluid, zero-entropy harmonic circulation. No friction, no attack surface, no compromised roots.
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px',
            }}>
              <div style={{
                background: '#03121f',
                border: '1px solid #00e5ff22',
                borderRadius: '6px',
                padding: '10px',
              }}>
                <div style={{ color: '#00e5ff', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
                  🛡️ 1. VEILED SOVEREIGN ROOT
                </div>
                <div style={{ color: '#94a3b8', fontSize: '10px', lineHeight: '1.4' }}>
                  Private seeds, credentials, and keys exist exclusively within sovereign human custody. Zero bytes stored in repo, API, or git.
                </div>
              </div>

              <div style={{
                background: '#03121f',
                border: '1px solid #ffaa0022',
                borderRadius: '6px',
                padding: '10px',
              }}>
                <div style={{ color: '#ffaa00', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
                  🪙 2. TREASURY PROTECTION
                </div>
                <div style={{ color: '#94a3b8', fontSize: '10px', lineHeight: '1.4' }}>
                  Address <code style={{ color: '#00ff66' }}>bc1qaj...</code> is an inviolable public receiving vessel. Autonomous withdrawals or spends are physically and architecturally impossible.
                </div>
              </div>

              <div style={{
                background: '#03121f',
                border: '1px solid #a855f722',
                borderRadius: '6px',
                padding: '10px',
              }}>
                <div style={{ color: '#c084fc', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
                  ⚖️ 3. CONSTITUTIONAL GATE
                </div>
                <div style={{ color: '#94a3b8', fontSize: '10px', lineHeight: '1.4' }}>
                  <code>KEY ≠ AUTHORITY</code>. All financial, destructive, or irreversible transitions halt immediately for explicit Human Steward review.
                </div>
              </div>

              <div style={{
                background: '#03121f',
                border: '1px solid #00ff6622',
                borderRadius: '6px',
                padding: '10px',
              }}>
                <div style={{ color: '#00ff66', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
                  🔗 4. IMMUTABLE MERKLE LEDGER
                </div>
                <div style={{ color: '#94a3b8', fontSize: '10px', lineHeight: '1.4' }}>
                  State 406 chained via parent hashes and attestation signatures. Silent tampering immediately breaks verification proofs.
                </div>
              </div>
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
