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

interface InnerStream {
  streamId: string;
  perspective: string;
  culturalContext?: string;
  symbolicWeight: number;
  isDissenting: boolean;
  rawText: string;
}

interface TensorStatus {
  success: boolean;
  contract: string;
  law: string;
  streamsCount: number;
  preservedDissentCount: number;
  streams: InnerStream[];
  evaluatedAt: string;
}

interface MatrixStatus {
  success: boolean;
  contract: string;
  equation: string;
  kroneckerFormula: string;
  dimension: number;
  bodyOrgans: string[];
  sampleTransition?: {
    step: number;
    tensorDimension: number;
    frobeniusNorm: number;
    determinantState: string;
    authorizationProjectionPassed: boolean;
    verificationVectorStatus: string;
    stateVectorProof: string;
    stateVectorHead: number[];
  };
}

export function PluralismPanel() {
  const [data, setData] = useState<PluralisticFaceResponse | null>(null);
  const [tensor, setTensor] = useState<TensorStatus | null>(null);
  const [matrix, setMatrix] = useState<MatrixStatus | null>(null);
  const [simulatingTransition, setSimulatingTransition] = useState(false);
  const [transitionResult, setTransitionResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stream submission state
  const [newPerspective, setNewPerspective] = useState('');
  const [newRawText, setNewRawText] = useState('');
  const [newDissent, setNewDissent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchPluralism = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resFace, resTensor, resMatrix] = await Promise.all([
        fetch(`${API_BASE_URL}/v1/pluralism/face`),
        fetch(`${API_BASE_URL}/v1/pluralism/tensor`),
        fetch(`${API_BASE_URL}/v1/pluralism/matrix`),
      ]);
      const textFace = await resFace.text();
      const parsedFace = textFace ? JSON.parse(textFace) : null;
      if (!resFace.ok) throw new Error(parsedFace?.error || `HTTP ${resFace.status}`);
      setData(parsedFace);

      if (resTensor.ok) {
        const textTensor = await resTensor.text();
        const parsedTensor = textTensor ? JSON.parse(textTensor) : null;
        setTensor(parsedTensor);
      }

      if (resMatrix.ok) {
        const textMatrix = await resMatrix.text();
        const parsedMatrix = textMatrix ? JSON.parse(textMatrix) : null;
        setMatrix(parsedMatrix);
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'pluralism matrix unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTriggerTransition = async (unverified = false) => {
    setSimulatingTransition(true);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/pluralism/matrix/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAuthorized: true,
          isEvidenceVerified: !unverified,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      setTransitionResult(payload.receipt);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'failed transition');
    } finally {
      setSimulatingTransition(false);
    }
  };

  const handleRegisterMeaning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPerspective.trim() || !newRawText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/pluralism/tensor/meaning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perspective: newPerspective.trim(),
          rawText: newRawText.trim(),
          isDissenting: newDissent,
          symbolicWeight: 0.9,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNewPerspective('');
      setNewRawText('');
      setNewDissent(false);
      await fetchPluralism();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'failed to register meaning');
    } finally {
      setSubmitting(false);
    }
  };

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
          {/* Duality Tensor Field & Preserved Dissent */}
          {tensor && (
            <div style={{
              background: '#091522',
              border: '1px solid #38bdf844',
              borderRadius: '8px',
              padding: '14px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <div style={{ color: '#38bdf8', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🌊</span>
                    <span>DUALITY TENSOR FIELD // SINGLE PLURALISTIC BODY</span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '2px' }}>
                    {tensor.law} · Invariant: PRESERVE DISSENT • NEVER SILENTLY OVERWRITE
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{
                    color: '#38bdf8',
                    background: '#38bdf815',
                    border: '1px solid #38bdf844',
                    borderRadius: '4px',
                    fontSize: '10px',
                    padding: '2px 8px',
                    fontWeight: 'bold',
                  }}>
                    Streams: {tensor.streamsCount}
                  </span>
                  <span style={{
                    color: tensor.preservedDissentCount > 0 ? '#ffaa00' : '#00ff66',
                    background: tensor.preservedDissentCount > 0 ? '#ffaa0015' : '#00ff6615',
                    border: `1px solid ${tensor.preservedDissentCount > 0 ? '#ffaa0044' : '#00ff6644'}`,
                    borderRadius: '4px',
                    fontSize: '10px',
                    padding: '2px 8px',
                    fontWeight: 'bold',
                  }}>
                    Preserved Dissent: {tensor.preservedDissentCount}
                  </span>
                </div>
              </div>

              {/* Streams List */}
              {tensor.streams.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px', maxHeight: '180px', overflowY: 'auto' }}>
                  {tensor.streams.map((s) => (
                    <div key={s.streamId} style={{
                      background: s.isDissenting ? '#1a1308' : '#05101a',
                      border: `1px solid ${s.isDissenting ? '#ffaa0044' : '#38bdf822'}`,
                      borderRadius: '4px',
                      padding: '8px 10px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <span style={{ color: s.isDissenting ? '#ffaa00' : '#38bdf8', fontWeight: 'bold', fontSize: '11px' }}>
                          {s.perspective} {s.culturalContext ? `(${s.culturalContext})` : ''}
                        </span>
                        <span style={{
                          color: s.isDissenting ? '#ffaa00' : '#00ff66',
                          fontSize: '9px',
                          fontWeight: 'bold',
                          padding: '1px 5px',
                          borderRadius: '2px',
                          background: s.isDissenting ? '#ffaa0015' : '#00ff6615',
                        }}>
                          {s.isDissenting ? '⚠ DISSENTING' : '✓ HARMONIC'} (wt: {s.symbolicWeight})
                        </span>
                      </div>
                      <div style={{ color: '#cbd5e1', fontSize: '10px', fontStyle: 'italic' }}>
                        "{s.rawText}"
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Form to Register New Inner Meaning / Dissent */}
              <form onSubmit={handleRegisterMeaning} style={{
                background: '#040b12',
                border: '1px solid #38bdf822',
                borderRadius: '6px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{ color: '#e2e8f0', fontSize: '10px', fontWeight: 'bold' }}>
                  + REGISTER PERSPECTIVE / PRESERVE DISSENTING STREAM
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Perspective (e.g. Poetic Intuition, Positivist Check)"
                    value={newPerspective}
                    onChange={(e) => setNewPerspective(e.target.value)}
                    style={{
                      flex: 1,
                      background: '#07121b',
                      border: '1px solid #38bdf844',
                      borderRadius: '4px',
                      color: '#e2e8f0',
                      fontSize: '10px',
                      padding: '5px 8px',
                    }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ffaa00', fontSize: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newDissent}
                      onChange={(e) => setNewDissent(e.target.checked)}
                    />
                    Dissenting
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Raw experiential or interpretive text..."
                    value={newRawText}
                    onChange={(e) => setNewRawText(e.target.value)}
                    style={{
                      flex: 1,
                      background: '#07121b',
                      border: '1px solid #38bdf844',
                      borderRadius: '4px',
                      color: '#e2e8f0',
                      fontSize: '10px',
                      padding: '5px 8px',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={submitting || !newPerspective.trim() || !newRawText.trim()}
                    style={{
                      background: '#0e263d',
                      color: '#38bdf8',
                      border: '1px solid #38bdf866',
                      borderRadius: '4px',
                      fontSize: '10px',
                      padding: '5px 12px',
                      cursor: submitting ? 'wait' : 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    {submitting ? 'Anchoring...' : 'Anchor Stream'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Master Matrix Transformation HUD */}
          {matrix && (
            <div
              style={{
                background: '#040b12',
                border: '1px solid #38bdf855',
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px' }}>🌌</span>
                  <span style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '12px', letterSpacing: '0.8px' }}>
                    MASTER MATRIX TRANSFORMATION HUD
                  </span>
                </div>
                <span
                  style={{
                    background: '#38bdf822',
                    border: '1px solid #38bdf866',
                    color: '#38bdf8',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}
                >
                  {matrix.contract}
                </span>
              </div>

              {/* Equation Banner */}
              <div
                style={{
                  background: '#071626',
                  border: '1px solid #38bdf833',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  marginBottom: '12px',
                  fontFamily: 'monospace',
                }}
              >
                <div style={{ color: '#38bdf8', fontSize: '13px', fontWeight: 'bold' }}>
                  {matrix.equation}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>
                  Operator: <strong style={{ color: '#a78bfa' }}>{matrix.kroneckerFormula}</strong> ({matrix.dimension} coordinates)
                </div>
              </div>

              {/* 4 Dimension Layers & 20 Organs Grid */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Sovereign Body Organs (20 Organs · 4 Tensors)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {matrix.bodyOrgans.map((organ) => (
                    <span
                      key={organ}
                      style={{
                        background: '#0e2238',
                        color: '#7dd3fc',
                        border: '1px solid #38bdf833',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        fontSize: '10px',
                        fontWeight: '500',
                      }}
                    >
                      {organ}
                    </span>
                  ))}
                </div>
              </div>

              {/* Active Metrics & Transition Controls */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '8px',
                  marginBottom: '12px',
                }}
              >
                <div style={{ background: '#08121c', padding: '8px 12px', borderRadius: '6px', border: '1px solid #38bdf822' }}>
                  <div style={{ color: '#94a3b8', fontSize: '10px' }}>Tensor Frobenius Norm</div>
                  <div style={{ color: '#38bdf8', fontSize: '15px', fontWeight: 'bold', marginTop: '2px' }}>
                    {transitionResult?.frobeniusNorm ?? matrix.sampleTransition?.frobeniusNorm ?? '0.780484'}
                  </div>
                </div>

                <div style={{ background: '#08121c', padding: '8px 12px', borderRadius: '6px', border: '1px solid #38bdf822' }}>
                  <div style={{ color: '#94a3b8', fontSize: '10px' }}>Determinant State</div>
                  <div
                    style={{
                      color: (transitionResult?.determinantState ?? matrix.sampleTransition?.determinantState) === 'NON_ZERO' ? '#00ff66' : '#ff4444',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      marginTop: '4px',
                    }}
                  >
                    {transitionResult?.determinantState ?? matrix.sampleTransition?.determinantState ?? 'NON_ZERO'}
                  </div>
                </div>

                <div style={{ background: '#08121c', padding: '8px 12px', borderRadius: '6px', border: '1px solid #38bdf822' }}>
                  <div style={{ color: '#94a3b8', fontSize: '10px' }}>P_auth Projection</div>
                  <div
                    style={{
                      color: (transitionResult?.authorizationProjectionPassed ?? matrix.sampleTransition?.authorizationProjectionPassed) ? '#00ff66' : '#ffaa00',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      marginTop: '4px',
                    }}
                  >
                    {(transitionResult?.authorizationProjectionPassed ?? matrix.sampleTransition?.authorizationProjectionPassed) ? 'PASSED (1.0)' : 'COLLAPSED (0.0)'}
                  </div>
                </div>
              </div>

              {/* Interactive Simulation Trigger */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => handleTriggerTransition(false)}
                  disabled={simulatingTransition}
                  style={{
                    background: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 14px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    cursor: simulatingTransition ? 'wait' : 'pointer',
                  }}
                >
                  {simulatingTransition ? 'Computing...' : '⚡ Step k ➔ k+1 (Verified)'}
                </button>

                <button
                  onClick={() => handleTriggerTransition(true)}
                  disabled={simulatingTransition}
                  style={{
                    background: '#1e1b4b',
                    color: '#f43f5e',
                    border: '1px solid #f43f5e55',
                    borderRadius: '4px',
                    padding: '6px 14px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    cursor: simulatingTransition ? 'wait' : 'pointer',
                  }}
                >
                  ⚡ Test Fail-Closed Collapse (Unverified)
                </button>
              </div>

              {transitionResult && (
                <div style={{ marginTop: '10px', background: '#020617', padding: '8px 10px', borderRadius: '4px', fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  State Proof: <span style={{ color: '#e2e8f0' }}>{transitionResult.stateVectorProof}</span> | Status: <span style={{ color: transitionResult.determinantState === 'NON_ZERO' ? '#00ff66' : '#f43f5e' }}>{transitionResult.determinantState}</span>
                </div>
              )}
            </div>
          )}

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
