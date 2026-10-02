import { useState, useEffect, useCallback } from 'react';
import { theme, statusColor, humanStatus } from './oceanicosTheme';

/*
 * SystemHealthPanel — surfaces the /health endpoint in the UI.
 *
 * Shows observer, verifier, attester, memory, and persistence readiness
 * with evidence-bearing status — no green claim without executable evidence.
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

interface HealthResponse {
  status: string;
  service: string;
  readiness: string;
  checks: {
    observer: string;
    verifier: string;
    attester: string;
    memory: { status: string; integrity: boolean; encryption: string };
    persistence: {
      mode: string;
      source: string;
      keySource: string;
      rotationPending: boolean;
      operatorAction: string;
      coverage: {
        complete: boolean;
        surfaces: { name: string; encryption: string; keySource: string; evidence: string }[];
        unverifiedSurfaces: string[];
      };
    };
  };
  policy: {
    authMode: string;
    readAuthConfigured: boolean;
    adminAuthConfigured: boolean;
    revocationEnabled: boolean;
    persistenceEncryption: string;
  };
  timestamp: string;
}

export function SystemHealthPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setHealth(data);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'health check unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const readinessColor = health?.readiness === 'ready' ? theme.verified : theme.warning;

  return (
    <div style={{ padding: '20px 22px', fontFamily: theme.fontSans }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: theme.accent }}>
            ⚕ System Health
          </div>
          <div style={{ fontSize: '11px', color: theme.textDim, marginTop: '3px' }}>
            Evidence-bearing readiness · auto-refresh 15s
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {health && (
            <span
              style={{
                padding: '3px 10px',
                borderRadius: theme.radiusPill,
                fontSize: '10px',
                fontWeight: 700,
                color: readinessColor,
                background: `${readinessColor}12`,
                border: `1px solid ${readinessColor}33`,
              }}
            >
              {health.readiness.toUpperCase()}
            </span>
          )}
          <button
            onClick={fetchHealth}
            disabled={loading}
            style={{
              background: theme.surfaceRaised,
              color: theme.accent,
              border: `1px solid ${theme.borderBright}`,
              borderRadius: theme.radiusSmall,
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? '…' : '↻'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ color: theme.divergent, fontSize: '11px', marginBottom: '10px' }}>
          ⚠ {error}
        </div>
      )}

      {health && (
        <>
          {/* Core checks */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '14px' }}>
            {[
              { label: 'Observer', value: health.checks.observer },
              { label: 'Verifier', value: health.checks.verifier },
              { label: 'Attester', value: health.checks.attester },
              { label: 'Memory', value: health.checks.memory.status },
            ].map((check) => {
              const isReady = check.value === 'ready';
              const color = isReady ? theme.verified : theme.warning;
              return (
                <div
                  key={check.label}
                  style={{
                    padding: '10px 12px',
                    background: theme.surfaceDeep,
                    border: `1px solid ${color}33`,
                    borderRadius: theme.radiusSmall,
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 600, color: theme.textMuted, marginBottom: '4px' }}>
                    {check.label}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 600, color }}>
                      {check.value}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Memory integrity */}
          <div style={{
            padding: '10px 14px',
            background: theme.surfaceDeep,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radiusSmall,
            marginBottom: '10px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: theme.textMuted, marginBottom: '4px' }}>
              Memory Integrity
            </div>
            <div style={{ fontSize: '12px', color: theme.text, display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span>integrity: <span style={{ color: health.checks.memory.integrity ? theme.verified : theme.divergent, fontWeight: 600 }}>
                {health.checks.memory.integrity ? 'intact' : 'broken'}
              </span></span>
              <span>encryption: <span style={{ color: theme.textDim }}>{health.checks.memory.encryption}</span></span>
            </div>
          </div>

          {/* Persistence */}
          <div style={{
            padding: '10px 14px',
            background: theme.surfaceDeep,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radiusSmall,
            marginBottom: '10px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: theme.textMuted, marginBottom: '6px' }}>
              Persistence · {health.checks.persistence.mode}
            </div>
            <div style={{ fontSize: '11px', color: theme.textDim, display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span>source: {health.checks.persistence.source}</span>
              <span>key: {health.checks.persistence.keySource}</span>
              <span>rotation pending: {String(health.checks.persistence.rotationPending)}</span>
              {health.checks.persistence.operatorAction !== 'none' && (
                <span style={{ color: theme.warning }}>
                  ⚠ operator action: {health.checks.persistence.operatorAction}
                </span>
              )}
              {!health.checks.persistence.coverage.complete && (
                <span style={{ color: theme.unknown }}>
                  unverified: {health.checks.persistence.coverage.unverifiedSurfaces.join(', ')}
                </span>
              )}
            </div>
          </div>

          {/* Policy */}
          <div style={{
            padding: '10px 14px',
            background: theme.surfaceDeep,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radiusSmall,
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: theme.textMuted, marginBottom: '6px' }}>
              Policy
            </div>
            <div style={{ fontSize: '11px', color: theme.textDim, display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span>auth: <span style={{ color: theme.accent }}>{health.policy.authMode}</span></span>
              <span>revocation: <span style={{ color: health.policy.revocationEnabled ? theme.verified : theme.divergent }}>
                {health.policy.revocationEnabled ? 'enabled' : 'disabled'}
              </span></span>
              <span>encryption: <span style={{ color: theme.textDim }}>{health.policy.persistenceEncryption}</span></span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
