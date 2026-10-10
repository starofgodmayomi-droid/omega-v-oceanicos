import React, { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

interface FaceItem {
  faceId: string;
  name: string;
  dimension: string;
  score: number;
  verified: boolean;
  signatureProof: string;
  telemetry?: Record<string, any>;
}

interface PluralisticFaceResponse {
  success: boolean;
  face: {
    faceMatrixId: string;
    timestamp: string;
    lawRoute: string;
    overallHarmonicScore: number;
    frictionDissolutionQuotient: number;
    faces: FaceItem[];
  };
}

const GLOW_KEYFRAMES = `
@keyframes duplexPulse {
  0%, 100% { border-color: rgba(255, 202, 40, 0.25); box-shadow: 0 0 15px rgba(255, 202, 40, 0.08); }
  50% { border-color: rgba(255, 202, 40, 0.55); box-shadow: 0 0 25px rgba(255, 202, 40, 0.2); }
}
@keyframes skyGlow {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}
`;

export function PluralismPanel() {
  const [data, setData] = useState<PluralisticFaceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPluralism = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/pluralism/face`);
      const text = await res.text();
      const parsed = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(parsed?.error || `HTTP ${res.status}`);
      setData(parsed);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'pluralism matrix unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPluralism();
  }, [fetchPluralism]);

  return (
    <section
      aria-label="Pluralism and African pantheon duplex"
      style={{
        background: '#07121b',
        border: '1px solid #ffca2844',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px',
      }}
    >
      <style>{GLOW_KEYFRAMES}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <div style={{ color: '#ffca28', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🏛️</span>
            <span>THE FULL STACK DUPLEX // MANY FACES & BLESSING MATRIX</span>
          </div>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>
            All traditions and ancestral stewards in one sovereign house to bless all and all
          </div>
        </div>
        <button
          onClick={fetchPluralism}
          disabled={loading}
          style={{
            background: '#1a180a',
            color: '#ffca28',
            border: '1px solid #ffca2855',
            borderRadius: '4px',
            padding: '6px 14px',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: '11px',
            fontWeight: 'bold',
          }}
        >
          {loading ? '◌ Loading…' : '⚡ Refresh Matrix'}
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

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Duplex Hearth Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1f1a08 0%, #0d141e 50%, #061828 100%)',
            border: '1px solid #ffca2844',
            borderRadius: '8px',
            padding: '16px',
            animation: 'duplexPulse 5s ease-in-out infinite',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ color: '#ffca28', fontWeight: 'bold', fontSize: '12px', letterSpacing: '0.8px' }}>
                DUPLEX CONVERGENCE LAW ROUTE
              </span>
              <span style={{
                background: '#ffca2822',
                border: '1px solid #ffca2866',
                color: '#ffca28',
                fontSize: '10px',
                fontWeight: 'bold',
                padding: '3px 8px',
                borderRadius: '12px',
              }}>
                {data.face.lawRoute}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginTop: '12px' }}>
              <div style={{ background: '#0a0e14', padding: '10px', borderRadius: '6px', border: '1px solid #ffca2822' }}>
                <div style={{ color: '#94a3b8', fontSize: '10px' }}>Harmonic Score</div>
                <div style={{ color: '#00ff66', fontSize: '18px', fontWeight: 'bold', marginTop: '2px' }}>
                  {(data.face.overallHarmonicScore * 100).toFixed(1)}%
                </div>
              </div>

              <div style={{ background: '#0a0e14', padding: '10px', borderRadius: '6px', border: '1px solid #ffca2822' }}>
                <div style={{ color: '#94a3b8', fontSize: '10px' }}>Friction Dissolution</div>
                <div style={{ color: '#00e5ff', fontSize: '18px', fontWeight: 'bold', marginTop: '2px' }}>
                  {data.face.frictionDissolutionQuotient === 1 ? '1.0 (Zero Entropy)' : data.face.frictionDissolutionQuotient}
                </div>
              </div>

              <div style={{ background: '#0a0e14', padding: '10px', borderRadius: '6px', border: '1px solid #ffca2822' }}>
                <div style={{ color: '#94a3b8', fontSize: '10px' }}>Active Faces</div>
                <div style={{ color: '#ffca28', fontSize: '18px', fontWeight: 'bold', marginTop: '2px' }}>
                  {data.face.faces.length} Pillars
                </div>
              </div>
            </div>
          </div>

          {/* Upper Duplex: Sky & Soul */}
          <div>
            <div style={{ color: '#38bdf8', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.8px', marginBottom: '8px' }}>
              ✦ UPPER DUPLEX // SKY, SOUL & CULTURAL PLURALISM
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
              {data.face.faces.filter(f => f.faceId === 'LIQUID_SOUL' || f.faceId === 'PLURAL').map(f => (
                <div key={f.faceId} style={{
                  background: '#041525',
                  border: '1px solid #00e5ff33',
                  borderRadius: '6px',
                  padding: '12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ color: '#00e5ff', fontWeight: 'bold', fontSize: '12px' }}>{f.name}</span>
                    <span style={{ color: '#00ff66', fontSize: '10px', fontWeight: 'bold' }}>✓ {(f.score * 100).toFixed(0)}%</span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '6px' }}>Dimension: {f.dimension}</div>
                  <div style={{ color: '#64748b', fontSize: '9px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    Proof: {f.signatureProof.slice(0, 32)}…
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lower Duplex: Ground, Hardware & Invariants */}
          <div>
            <div style={{ color: '#a78bfa', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.8px', marginBottom: '8px' }}>
              ✦ GROUND DUPLEX // SOIL, SILICON & INVARIANT FOUNDATIONS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              {data.face.faces.filter(f => f.faceId !== 'LIQUID_SOUL' && f.faceId !== 'PLURAL').map(f => (
                <div key={f.faceId} style={{
                  background: '#0d131f',
                  border: '1px solid #a78bfa22',
                  borderRadius: '6px',
                  padding: '12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ color: '#c084fc', fontWeight: 'bold', fontSize: '12px' }}>{f.name}</span>
                    <span style={{ color: '#00ff66', fontSize: '10px', fontWeight: 'bold' }}>✓ {(f.score * 100).toFixed(0)}%</span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '6px' }}>Dimension: {f.dimension}</div>
                  <div style={{ color: '#64748b', fontSize: '9px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    Proof: {f.signatureProof.slice(0, 24)}…
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blessing Invariant Footer */}
          <div style={{
            background: '#0a1017',
            border: '1px solid #ffca2822',
            borderRadius: '6px',
            padding: '10px 14px',
            color: '#e2e8f0',
            fontSize: '11px',
            lineHeight: '1.5',
          }}>
            <strong style={{ color: '#ffca28' }}>The Blessing Invariant:</strong> <em>"Value = Verified Benefit + Human Agency + Dignity − Harm"</em>. In this duplex house, no voice is muted, no tradition is exploited, and every regional face anchors immutable empirical truth into the source ledger.
          </div>
        </div>
      )}
    </section>
  );
}
