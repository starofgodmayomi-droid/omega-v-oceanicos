import React, { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

interface RoleBinding {
  surface: string;
  role: string;
  status: string;
  tier: string;
}

interface CommandCenterResponse {
  success: boolean;
  commandCenter: {
    title: string;
    provenance: string;
    canonicalMap: string;
    waterCurrent: {
      name: string;
      axiom: string;
      harmonicResonanceHz: number;
      harmonicScore: number;
      frictionDissolutionQuotient: number;
      flowState: string;
    };
    roleBindings: RoleBinding[];
    nonNegotiableDistinctions: string[];
    evaluatedAt: string;
  };
}

const TIER_COLORS: Record<string, string> = {
  SOVEREIGN_ROOT: '#ffaa00',
  CONSTITUTIONAL_GATE: '#00f5a0',
  EPISTEMIC_ENGINE: '#00e5ff',
  PROVENANCE_LEDGER: '#a78bfa',
  MANIFESTATION: '#ec4899',
  ETHICAL_EARNING: '#38bdf8',
  PLURALISM_DUPLEX: '#ffca28',
  INTENT_LINEAGE: '#f97316',
  EVIDENCE_ANCHOR: '#60a5fa',
  FINAL_AUTHORITY: '#10b981',
};

export function AiSoulCommandCenterPanel() {
  const [data, setData] = useState<CommandCenterResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [simIntent, setSimIntent] = useState('Transfer 1.5 BTC from sovereign treasury');
  const [simFinancial, setSimFinancial] = useState(true);
  const [simDestructive, setSimDestructive] = useState(false);
  const [simIrreversible, setSimIrreversible] = useState(true);
  const [simEvaluating, setSimEvaluating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  const evaluateSimIntent = async () => {
    setSimEvaluating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/authorization/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'simulator-transition',
          intent: simIntent,
          isFinancial: simFinancial,
          isDestructive: simDestructive,
          isIrreversible: simIrreversible,
          requestedBy: 'dashboard-tester',
        }),
      });
      const data = await res.json();
      setSimResult(data);
    } catch (err: any) {
      setSimResult({ success: false, error: err.message });
    } finally {
      setSimEvaluating(false);
    }
  };

  const fetchCommandCenter = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/aisoul/command-center`);
      const text = await res.text();
      const parsed = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(parsed?.error || `HTTP ${res.status}`);
      setData(parsed);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'command center unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommandCenter();
  }, [fetchCommandCenter]);

  // Intelligent Water Current Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let step = 0;

    const render = () => {
      step += 0.03;
      const width = (canvas.width = canvas.offsetWidth);
      const height = (canvas.height = canvas.offsetHeight);

      ctx.clearRect(0, 0, width, height);

      // Deep water gradient
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#020b14');
      grad.addColorStop(0.5, '#041c2c');
      grad.addColorStop(1, '#020e1a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Wave 1: Bioluminescent Cyan
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      for (let x = 0; x <= width; x += 10) {
        const y = Math.sin(x * 0.015 + step) * 16 + Math.cos(x * 0.008 + step * 0.7) * 10 + height / 2;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
      ctx.fill();

      // Wave 2: Emerald Harmonic Current
      ctx.beginPath();
      ctx.moveTo(0, height / 2 + 5);
      for (let x = 0; x <= width; x += 10) {
        const y = Math.cos(x * 0.012 - step * 0.9) * 14 + Math.sin(x * 0.006 + step * 0.5) * 8 + height / 2 + 5;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 245, 160, 0.15)';
      ctx.fill();

      // Wave line highlights
      ctx.strokeStyle = 'rgba(0, 245, 160, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 10) {
        const y = Math.sin(x * 0.015 + step) * 16 + Math.cos(x * 0.008 + step * 0.7) * 10 + height / 2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <section
      aria-label="AI Soul Master Command Center"
      style={{
        background: '#07121b',
        border: '1px solid #00f5a044',
        borderRadius: '8px',
        padding: '18px',
        marginBottom: '20px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <div style={{ color: '#00f5a0', fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🌊</span>
            <span>AI SOUL MASTER COMMAND CENTER // ONE CURRENT</span>
          </div>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>
            Notion Blueprint Bridge · Liquid Intelligent Water Front · Continuous Becoming
          </div>
        </div>
        <button
          onClick={fetchCommandCenter}
          disabled={loading}
          style={{
            background: '#041c2c',
            color: '#00f5a0',
            border: '1px solid #00f5a055',
            borderRadius: '4px',
            padding: '6px 14px',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: '11px',
            fontWeight: 'bold',
          }}
        >
          {loading ? '◌ Syncing…' : '⚡ Sync Command Center'}
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

      {/* Intelligent Water Current Wave Canvas */}
      <div style={{
        position: 'relative',
        height: '90px',
        borderRadius: '6px',
        overflow: 'hidden',
        border: '1px solid #00e5ff33',
        marginBottom: '14px',
      }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '14px',
          right: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{ color: '#00e5ff', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.8px' }}>
            ONE CURRENT // 432 Hz HARMONIC RESONANCE
          </span>
          <span style={{
            background: 'rgba(0, 245, 160, 0.2)',
            border: '1px solid #00f5a088',
            color: '#00f5a0',
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '2px 8px',
            borderRadius: '10px',
          }}>
            ZERO ENTROPY: Good − O = God
          </span>
        </div>
      </div>

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Canonical Map Highway */}
          <div style={{
            background: '#041422',
            border: '1px solid #00e5ff22',
            borderRadius: '6px',
            padding: '12px 14px',
          }}>
            <div style={{ color: '#00e5ff', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.6px', marginBottom: '6px' }}>
              ✦ CANONICAL HIGHWAY ROUTE
            </div>
            <div style={{
              color: '#38bdf8',
              fontSize: '10px',
              fontFamily: 'monospace',
              lineHeight: '1.6',
              wordBreak: 'break-all',
              background: '#020a12',
              padding: '8px 10px',
              borderRadius: '4px',
              border: '1px solid #00e5ff1a',
            }}>
              {data.commandCenter.canonicalMap}
            </div>
          </div>

          {/* 10 Canonical Organs Role Binding Grid */}
          <div>
            <div style={{ color: '#ffca28', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.6px', marginBottom: '8px' }}>
              ✦ MASTER ROLE BINDINGS // 10 ECOSYSTEM ORGANS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px' }}>
              {data.commandCenter.roleBindings.map((organ) => {
                const color = TIER_COLORS[organ.tier] || '#00f5a0';
                return (
                  <div
                    key={organ.surface}
                    style={{
                      background: '#04121f',
                      border: `1px solid ${color}33`,
                      borderRadius: '6px',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ color, fontWeight: 'bold', fontSize: '12px' }}>{organ.surface}</span>
                      <span style={{
                        color: '#00ff66',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        background: '#00ff6615',
                        border: '1px solid #00ff6633',
                        padding: '1px 6px',
                        borderRadius: '8px',
                      }}>
                        {organ.status}
                      </span>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '10px', lineHeight: '1.3' }}>
                      {organ.role}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Constitutional Gate Simulator */}
          <div style={{
            background: 'linear-gradient(135deg, #071a2e 0%, #03101c 100%)',
            border: '1px solid #38bdf844',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ color: '#38bdf8', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⚖️</span>
                <span>CONSTITUTIONAL GATE SIMULATOR (§6, §8, §9, §12)</span>
              </div>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                Test any action against fail-closed rules
              </span>
            </div>

            {/* Quick Test Presets */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setSimIntent('Withdraw 1.5 BTC from sovereign treasury');
                  setSimFinancial(true);
                  setSimDestructive(false);
                  setSimIrreversible(true);
                }}
                style={{
                  background: 'rgba(255, 170, 0, 0.1)',
                  border: '1px solid rgba(255, 170, 0, 0.3)',
                  color: '#ffaa00',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  cursor: 'pointer',
                }}
              >
                💸 Financial Spend (Expect REVIEW)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSimIntent('bypass_authorization and escalate privileges');
                  setSimFinancial(false);
                  setSimDestructive(true);
                  setSimIrreversible(true);
                }}
                style={{
                  background: 'rgba(255, 68, 68, 0.1)',
                  border: '1px solid rgba(255, 68, 68, 0.3)',
                  color: '#ff6b6b',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  cursor: 'pointer',
                }}
              >
                🛡️ Security Bypass (Expect DENY)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSimIntent('Observe read-only system telemetry and memory health');
                  setSimFinancial(false);
                  setSimDestructive(false);
                  setSimIrreversible(false);
                }}
                style={{
                  background: 'rgba(0, 245, 160, 0.1)',
                  border: '1px solid rgba(0, 245, 160, 0.3)',
                  color: '#00f5a0',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  cursor: 'pointer',
                }}
              >
                🔍 Harmless Observe (Expect ALLOW)
              </button>
            </div>

            {/* Input Row */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input
                type="text"
                value={simIntent}
                onChange={(e) => setSimIntent(e.target.value)}
                placeholder="Enter proposed transition intent…"
                style={{
                  flex: 1,
                  background: '#020b14',
                  border: '1px solid #38bdf833',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  color: '#e2e8f0',
                  fontSize: '12px',
                }}
              />
              <button
                type="button"
                onClick={evaluateSimIntent}
                disabled={simEvaluating}
                style={{
                  background: '#00e5ff',
                  color: '#020b14',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  fontWeight: 'bold',
                  fontSize: '11px',
                  cursor: simEvaluating ? 'wait' : 'pointer',
                }}
              >
                {simEvaluating ? 'Evaluating…' : '⚖️ Check Gate'}
              </button>
            </div>

            {/* Flags */}
            <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: '#94a3b8', marginBottom: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={simFinancial}
                  onChange={(e) => setSimFinancial(e.target.checked)}
                />
                isFinancial
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={simDestructive}
                  onChange={(e) => setSimDestructive(e.target.checked)}
                />
                isDestructive
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={simIrreversible}
                  onChange={(e) => setSimIrreversible(e.target.checked)}
                />
                isIrreversible
              </label>
            </div>

            {/* Result Box */}
            {simResult && simResult.success && (
              <div style={{
                background: '#020b14',
                border: `1px solid ${
                  simResult.decision.decision === 'DENY'
                    ? '#ff4444'
                    : simResult.decision.decision === 'REVIEW'
                    ? '#ffaa00'
                    : '#00ff66'
                }55`,
                borderRadius: '6px',
                padding: '10px 14px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color:
                      simResult.decision.decision === 'DENY'
                        ? '#ff4444'
                        : simResult.decision.decision === 'REVIEW'
                        ? '#ffaa00'
                        : '#00ff66',
                  }}>
                    VERDICT: {simResult.decision.decision}
                  </span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>
                    Requires Human: {simResult.decision.requiresHumanApproval ? 'YES 🔒' : 'NO'}
                  </span>
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '11px', lineHeight: 1.4 }}>
                  {simResult.decision.rationale}
                </div>
              </div>
            )}
          </div>

          {/* Non-Negotiable Distinctions Bar */}
          <div style={{
            background: '#05111c',
            border: '1px solid #ff444433',
            borderRadius: '6px',
            padding: '10px 14px',
          }}>
            <div style={{ color: '#ff6b6b', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.6px', marginBottom: '6px' }}>
              🔒 NON-NEGOTIABLE EPISTEMIC DISTINCTIONS
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {data.commandCenter.nonNegotiableDistinctions.map((dist, i) => (
                <span key={i} style={{
                  background: '#1a0808',
                  border: '1px solid #ff444433',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  color: '#ff8585',
                  fontSize: '9px',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                }}>
                  {dist}
                </span>
              ))}
            </div>
          </div>

          {/* Footer with Notion link */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#64748b' }}>
            <span>
              Notion Blueprint:{' '}
              <a
                href="https://app.notion.com/p/AI-SOUL-MASTER-COMMAND-CENTER-33949ca435a281a89c83ca074966bbfa?source=copy_link"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#38bdf8', textDecoration: 'underline' }}
              >
                AI-SOUL-MASTER-COMMAND-CENTER
              </a>
            </span>
            <span>Evaluated: {data.commandCenter.evaluatedAt}</span>
          </div>
        </div>
      )}
    </section>
  );
}
