import React, { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

type VectorValue = 'YES' | 'NO' | 'UNKNOWN';

interface StatusVectorField {
  field: string;
  value: VectorValue;
  evidence: string;
  provenance: string;
  scope: string;
}

interface RealityStatus {
  success: true;
  contract: {
    name: string;
    version: string;
    schemaVersion: string;
    growthLaw: string;
    currentStage: string;
    invariant: string;
    governingEquation: string;
    evaluatedAt: string;
  };
  statusVector: StatusVectorField[];
  epistemicDistinctions: string[];
  reconciliationContract: {
    formula: string;
    verifiedRequires: string;
    statuses: string[];
  };
  realityAuthority: {
    principle: string;
    humanAgency: string;
    aiBound: string;
    failClosed: boolean;
  };
}

const VALUE_COLORS: Record<VectorValue, string> = {
  YES: '#00ff66',
  NO: '#fca5a5',
  UNKNOWN: '#94a3b8',
};

const GROWTH_STAGES = ['0', 'MINI', '+', '+', 'FULL STACK', 'ECOSYSTEM', 'REALITY'];

export function RealityPanel() {
  const [status, setStatus] = useState<RealityStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/reality/status`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setStatus(data);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'reality status unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return (
    <section
      aria-label="Reality verification status vector"
      style={{
        background: '#07121b',
        border: '1px solid #6ee7b744',
        borderRadius: '6px',
        padding: '16px',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <div style={{ color: '#6ee7b7', fontSize: '13px', fontWeight: 'bold' }}>
            💧 REALITY VERIFICATION — STATUS VECTOR
          </div>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>
            Read-only evidence-bearing contract · VERIFY(ΔREALITY) · Attest, do not assert
          </div>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          style={{
            background: '#0a1d2e',
            color: '#6ee7b7',
            border: '1px solid #6ee7b755',
            borderRadius: '4px',
            padding: '8px 14px',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'EVALUATING...' : status ? '↻ REFRESH' : '📋 FETCH REALITY STATUS'}
        </button>
      </div>

      {error && (
        <div style={{ color: '#fca5a5', fontSize: '11px', marginBottom: '10px' }}>
          ⚠ {error}
        </div>
      )}

      {status && (
        <>
          {/* Growth Law — REALITY highlighted */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center', fontSize: '11px' }}>
              {GROWTH_STAGES.map((stage, i) => (
                <React.Fragment key={i}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '3px',
                      fontWeight: stage === status.contract.currentStage ? 'bold' : 'normal',
                      background: stage === status.contract.currentStage ? '#6ee7b722' : 'transparent',
                      color: stage === status.contract.currentStage ? '#6ee7b7' : '#64748b',
                      border: stage === status.contract.currentStage ? '1px solid #6ee7b755' : '1px solid transparent',
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

          {/* Governing Equation */}
          <div
            style={{
              background: '#03080d',
              border: '1px solid #6ee7b722',
              borderRadius: '4px',
              padding: '10px',
              marginBottom: '14px',
            }}
          >
            <div style={{ color: '#6ee7b7', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>
              ⚡ GOVERNING EQUATION
            </div>
            <div style={{ color: '#94a3b8', fontSize: '10px', lineHeight: 1.5, fontFamily: 'monospace' }}>
              {status.contract.governingEquation}
            </div>
          </div>

          {/* Status Vector — 11 independent fields */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ color: '#e2e8f0', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' }}>
              STATUS VECTOR — 11 INDEPENDENT FIELDS (YES / NO / UNKNOWN)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
              {status.statusVector.map((field) => {
                const color = VALUE_COLORS[field.value];
                return (
                  <div
                    key={field.field}
                    style={{
                      background: '#03080d',
                      border: `1px solid ${color}33`,
                      borderRadius: '4px',
                      padding: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ color: '#e2e8f0', fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {field.field}
                      </span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '3px',
                          fontSize: '9px',
                          fontWeight: 'bold',
                          color,
                          background: `${color}15`,
                          border: `1px solid ${color}44`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {field.value}
                      </span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '10px', lineHeight: 1.4 }}>
                      <div>{field.evidence}</div>
                      <div style={{ marginTop: '3px', color: '#475569' }}>provenance: {field.provenance}</div>
                      <div style={{ marginTop: '2px', color: '#475569' }}>scope: {field.scope}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reconciliation Contract */}
          <div
            style={{
              background: '#03080d',
              border: '1px solid #38bdf833',
              borderRadius: '4px',
              padding: '12px',
              marginBottom: '12px',
            }}
          >
            <div style={{ color: '#38bdf8', fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>
              RECONCILIATION CONTRACT
            </div>
            <div style={{ color: '#94a3b8', fontSize: '10px', fontFamily: 'monospace', marginBottom: '6px' }}>
              {status.reconciliationContract.formula}
            </div>
            <div style={{ color: '#64748b', fontSize: '10px', marginBottom: '6px' }}>
              <strong style={{ color: '#6ee7b7' }}>VERIFIED requires:</strong> {status.reconciliationContract.verifiedRequires}
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {status.reconciliationContract.statuses.map((s) => (
                <span
                  key={s}
                  style={{
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    color: '#94a3b8',
                    background: '#1e293b',
                    border: '1px solid #334155',
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Epistemic Distinctions */}
          <div
            style={{
              background: '#03080d',
              border: '1px solid #facc1533',
              borderRadius: '4px',
              padding: '12px',
              marginBottom: '12px',
            }}
          >
            <div style={{ color: '#facc15', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' }}>
              PRESERVED EPISTEMIC DISTINCTIONS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {status.epistemicDistinctions.map((distinction, i) => (
                <div key={i} style={{ color: '#64748b', fontSize: '10px', fontFamily: 'monospace' }}>
                  {distinction}
                </div>
              ))}
            </div>
          </div>

          {/* Reality Authority */}
          <div
            style={{
              background: '#03080d',
              border: `1px solid ${status.realityAuthority.failClosed ? '#00ff6633' : '#fca5a533'}`,
              borderRadius: '4px',
              padding: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: '#00ff66', fontSize: '11px', fontWeight: 'bold' }}>
                REALITY AUTHORITY
              </span>
              <span
                style={{
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  color: status.realityAuthority.failClosed ? '#00ff66' : '#fca5a5',
                  background: status.realityAuthority.failClosed ? '#00ff6615' : '#fca5a515',
                  border: `1px solid ${status.realityAuthority.failClosed ? '#00ff6644' : '#fca5a544'}`,
                }}
              >
                {status.realityAuthority.failClosed ? 'FAIL-CLOSED' : 'FAIL-OPEN'}
              </span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}>
              <strong style={{ color: '#6ee7b7' }}>Principle:</strong> {status.realityAuthority.principle}
            </div>
            <div style={{ color: '#64748b', fontSize: '10px', marginBottom: '4px' }}>
              <strong style={{ color: '#38bdf8' }}>Human Agency:</strong> {status.realityAuthority.humanAgency}
            </div>
            <div style={{ color: '#64748b', fontSize: '10px' }}>
              <strong style={{ color: '#facc15' }}>AI Bound:</strong> {status.realityAuthority.aiBound}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
