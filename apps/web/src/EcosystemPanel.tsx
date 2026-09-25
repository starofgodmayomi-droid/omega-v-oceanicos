import React, { useState, useCallback } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

type EvidenceStatus = 'VERIFIED' | 'SUPPORTED' | 'UNVERIFIED' | 'DIVERGENT' | 'UNKNOWN';

interface EcosystemLayer {
  layer: string;
  capabilities: string[];
  evidenceStatus: EvidenceStatus;
  source: string;
  scope: string;
  policy: string;
  provenance: string;
}

interface EcosystemStatus {
  success: true;
  contract: {
    name: string;
    version: string;
    schemaVersion: string;
    growthLaw: string;
    currentStage: string;
    invariant: string;
    evaluatedAt: string;
  };
  layers: EcosystemLayer[];
  valueAssessment: {
    formula: string;
    verifiedBenefit: string;
    humanAgency: string;
    status: EvidenceStatus;
  };
  governance: {
    authMode: string;
    humanAuthorizationRequired: boolean;
    boundedSecurity: string;
    failClosed: boolean;
    status: EvidenceStatus;
  };
}

const STATUS_COLORS: Record<EvidenceStatus, string> = {
  VERIFIED: '#00ff66',
  SUPPORTED: '#38bdf8',
  UNVERIFIED: '#facc15',
  DIVERGENT: '#ffaa00',
  UNKNOWN: '#94a3b8',
};

const GROWTH_STAGES = ['0', 'MINI', '+', '+', 'FULL STACK', 'ECOSYSTEM', 'REALITY'];

export function EcosystemPanel() {
  const [status, setStatus] = useState<EcosystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/ecosystem/status`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setStatus(data);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'ecosystem status unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <section
      aria-label="Ecosystem status adapter contract"
      style={{
        background: '#07121b',
        border: '1px solid #38bdf844',
        borderRadius: '6px',
        padding: '16px',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <div style={{ color: '#38bdf8', fontSize: '13px', fontWeight: 'bold' }}>
            🌊 ECOSYSTEM STATUS — ADAPTER CONTRACT
          </div>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>
            Read-only evidence-bearing contract · distinguishes VERIFIED from Unknown
          </div>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          style={{
            background: '#0a1d2e',
            color: '#38bdf8',
            border: '1px solid #38bdf855',
            borderRadius: '4px',
            padding: '8px 14px',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'EVALUATING...' : status ? '↻ REFRESH' : '📋 FETCH ECOSYSTEM STATUS'}
        </button>
      </div>

      {error && (
        <div style={{ color: '#fca5a5', fontSize: '11px', marginBottom: '10px' }}>
          ⚠ {error}
        </div>
      )}

      {status && (
        <>
          {/* Growth Law */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center', fontSize: '11px' }}>
              {GROWTH_STAGES.map((stage, i) => (
                <React.Fragment key={i}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '3px',
                      fontWeight: stage === status.contract.currentStage ? 'bold' : 'normal',
                      background: stage === status.contract.currentStage ? '#38bdf822' : 'transparent',
                      color: stage === status.contract.currentStage ? '#38bdf8' : '#64748b',
                      border: stage === status.contract.currentStage ? '1px solid #38bdf855' : '1px solid transparent',
                    }}
                  >
                    {stage}
                  </span>
                  {i < GROWTH_STAGES.length - 1 && <span style={{ color: '#334155' }}>→</span>}
                </React.Fragment>
              ))}
              <span style={{ color: '#334155', marginLeft: '4px' }}>↺ ∞</span>
            </div>
            <div style={{ color: '#6ee7b7', fontSize: '10px', marginTop: '6px' }}>
              invariant: {status.contract.invariant} · schema v{status.contract.schemaVersion} · evaluated {new Date(status.contract.evaluatedAt).toLocaleTimeString()}
            </div>
          </div>

          {/* Capability Layers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px', marginBottom: '16px' }}>
            {status.layers.map((layer) => {
              const color = STATUS_COLORS[layer.evidenceStatus];
              return (
                <div
                  key={layer.layer}
                  style={{
                    background: '#03080d',
                    border: `1px solid ${color}33`,
                    borderRadius: '4px',
                    padding: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ color: '#e2e8f0', fontSize: '11px', fontWeight: 'bold' }}>
                      {layer.layer}
                    </span>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        color,
                        background: `${color}15`,
                        border: `1px solid ${color}44`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {layer.evidenceStatus}
                    </span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '10px', lineHeight: '1.4' }}>
                    <div>capabilities: {layer.capabilities.join(', ')}</div>
                    <div style={{ marginTop: '3px' }}>scope: {layer.scope}</div>
                    <div style={{ marginTop: '3px' }}>policy: {layer.policy}</div>
                    <div style={{ marginTop: '3px', color: '#475569' }}>provenance: {layer.provenance}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Value Assessment */}
          <div
            style={{
              background: '#03080d',
              border: `1px solid ${STATUS_COLORS[status.valueAssessment.status]}33`,
              borderRadius: '4px',
              padding: '12px',
              marginBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: '#6ee7b7', fontSize: '11px', fontWeight: 'bold' }}>
                VALUE ASSESSMENT
              </span>
              <span
                style={{
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  color: STATUS_COLORS[status.valueAssessment.status],
                  background: `${STATUS_COLORS[status.valueAssessment.status]}15`,
                  border: `1px solid ${STATUS_COLORS[status.valueAssessment.status]}44`,
                }}
              >
                {status.valueAssessment.status}
              </span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: '10px', lineHeight: '1.5' }}>
              <div>benefit: {status.valueAssessment.verifiedBenefit}</div>
              <div style={{ marginTop: '3px' }}>human agency: {status.valueAssessment.humanAgency}</div>
            </div>
          </div>

          {/* Governance Boundary */}
          <div
            style={{
              background: '#03080d',
              border: `1px solid ${STATUS_COLORS[status.governance.status]}33`,
              borderRadius: '4px',
              padding: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: '#c084fc', fontSize: '11px', fontWeight: 'bold' }}>
                GOVERNANCE BOUNDARY
              </span>
              <span
                style={{
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  color: STATUS_COLORS[status.governance.status],
                  background: `${STATUS_COLORS[status.governance.status]}15`,
                  border: `1px solid ${STATUS_COLORS[status.governance.status]}44`,
                }}
              >
                {status.governance.status}
              </span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: '10px', lineHeight: '1.5' }}>
              <div>auth mode: {status.governance.authMode} · human gate: {status.governance.humanAuthorizationRequired ? 'required' : 'unknown'} · fail-closed: {status.governance.failClosed ? 'yes' : 'no'}</div>
              <div style={{ marginTop: '4px', color: '#475569' }}>
                bounded security: {status.governance.boundedSecurity}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default EcosystemPanel;
