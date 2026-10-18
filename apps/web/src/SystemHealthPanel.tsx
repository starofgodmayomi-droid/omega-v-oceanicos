import { useState, useEffect, useCallback } from 'react';
import { theme, statusColor, humanStatus } from './oceanicosTheme';

/*
 * SystemHealthPanel — surfaces the /health endpoint in the UI.
 *
 * Shows observer, verifier, attester, memory, and persistence readiness
 * with evidence-bearing status — no green claim without executable evidence.
 */

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

type PolicyDeclaration = {
  mode?: string;
  reference?: string | null;
  reason?: string | null;
  evidence?: string;
  scope?: string;
  limitations?: string[];
  verified?: boolean;
};

interface HealthResponse {
  status: string;
  service?: string;
  readiness: string;
  checks: {
    observer: string;
    verifier: string;
    attester: string;
    memory: { status: string; integrity: boolean; encryption: string; height?: number; reason?: string | null };
    persistence: {
      mode: string;
      source: string;
      keySource: string;
      currentKeyFingerprint?: string | null;
      previousKeyFingerprint?: string | null;
      previousKeyConfigured?: boolean;
      eventLogSource?: string;
      eventLogReason?: string | null;
      eventLogKeySource?: string;
      rotationPending: boolean;
      operatorAction: string;
      skippedLogEntries?: number;
      recoveryPolicy?: PolicyDeclaration;
      deletionPolicy?: PolicyDeclaration;
      custodyPolicy?: PolicyDeclaration;
      coordinationPolicy?: PolicyDeclaration;
      coverage: {
        complete?: boolean;
        surfaces?: { name: string; encryption: string; keySource: string; evidence: string }[];
        unverifiedSurfaces?: string[];
        unverifiedReasons?: string[];
      };
    };
  };
  policy: {
    authMode: string;
    readAuthConfigured?: boolean;
    adminAuthConfigured?: boolean;
    revocationEnabled: boolean;
    persistenceEncryption: string;
  };
  timestamp?: string;
}


function policyDeclarationText(value?: PolicyDeclaration): string {
  if (!value) return 'UNKNOWN — field not supplied by API';
  const parts = [
    value.mode ?? 'UNKNOWN mode',
    value.reference ? `reference: ${value.reference}` : null,
    value.reason ? `reason: ${value.reason}` : null,
    value.evidence ? `evidence: ${value.evidence}` : null,
    value.scope ? `scope: ${value.scope}` : null,
    value.limitations?.length ? `limits: ${value.limitations.join(' | ')}` : null,
    typeof value.verified === 'boolean' ? `API verified flag: ${String(value.verified)}` : 'no verification flag supplied',
    'API declaration; not independent proof',
  ].filter(Boolean);
  return parts.join(' · ');
}

function configuredText(value?: boolean): string {
  if (value === true) return 'configured';
  if (value === false) return 'not configured';
  return 'UNKNOWN — field not supplied by API';
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
      // A degraded health response intentionally uses HTTP 503 while carrying
      // structured readiness and persistence evidence. Preserve that evidence;
      // only treat a non-OK response as an error when it is not a valid degraded
      // health snapshot.
      const isDegradedSnapshot = res.status === 503 && data?.readiness === 'degraded' && data?.checks;
      if (!res.ok && !isDegradedSnapshot) throw new Error(data?.error || `HTTP ${res.status}`);
      if (!data || typeof data.readiness !== 'string' || !data.checks?.persistence) {
        throw new Error('health response did not contain readiness and persistence evidence');
      }
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
                  unverified: {health.checks.persistence.coverage.unverifiedSurfaces?.join(', ') || 'UNKNOWN — not supplied by API'}
                </span>
              )}
            </div>
          </div>

          {/* Key identity and event-log evidence returned by /health */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '8px',
            marginBottom: '10px',
          }}>
            <div role="group" aria-label="Persistence key identity" style={{ padding: '10px 14px', background: theme.surfaceDeep, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSmall }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: theme.textMuted, marginBottom: '6px' }}>Persistence key identity</div>
              <div style={{ fontSize: '10px', color: theme.textDim, overflowWrap: 'anywhere' }}>Current key fingerprint: {health.checks.persistence.currentKeyFingerprint ?? 'UNKNOWN — API returned null'}</div>
              <div style={{ fontSize: '10px', color: theme.textDim, overflowWrap: 'anywhere' }}>Previous key fingerprint: {health.checks.persistence.previousKeyFingerprint ?? (health.checks.persistence.previousKeyConfigured === false ? 'not configured' : 'UNKNOWN — API returned null')}</div>
              <div style={{ fontSize: '10px', color: theme.textDim, marginTop: '4px' }}>Previous key configured: {configuredText(health.checks.persistence.previousKeyConfigured)}</div>
            </div>
            <div role="group" aria-label="Event log evidence" style={{ padding: '10px 14px', background: theme.surfaceDeep, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSmall }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: theme.textMuted, marginBottom: '6px' }}>Event log evidence</div>
              <div style={{ fontSize: '10px', color: theme.textDim }}>Event log source: {health.checks.persistence.eventLogSource ?? 'UNKNOWN — not supplied by API'}</div>
              <div style={{ fontSize: '10px', color: theme.textDim }}>Event log key source: {health.checks.persistence.eventLogKeySource ?? 'UNKNOWN — not supplied by API'}</div>
              <div style={{ fontSize: '10px', color: theme.textDim }}>Skipped log entries: {health.checks.persistence.skippedLogEntries ?? 'UNKNOWN — not supplied by API'}</div>
              <div style={{ fontSize: '10px', color: theme.textDim, marginTop: '4px' }}>Event log reason: {health.checks.persistence.eventLogReason ?? 'No reason supplied by API'}</div>
            </div>
          </div>

          {/* Policy declarations are surfaced as API data, not proof by themselves. */}
          <div role="group" aria-label="Persistence policy declarations" style={{
            padding: '10px 14px',
            background: theme.surfaceDeep,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radiusSmall,
            marginBottom: '10px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: theme.textMuted, marginBottom: '6px' }}>Persistence policy declarations · API-reported</div>
            {[
              { label: 'Recovery policy', value: health.checks.persistence.recoveryPolicy },
              { label: 'Deletion policy', value: health.checks.persistence.deletionPolicy },
              { label: 'Key custody policy', value: health.checks.persistence.custodyPolicy },
              { label: 'Coordination policy', value: health.checks.persistence.coordinationPolicy },
            ].map(({ label, value }) => (
              <div key={label} style={{ fontSize: '10px', color: theme.textDim, lineHeight: 1.55, overflowWrap: 'anywhere', marginTop: '3px' }}>
                <strong style={{ color: theme.textMuted }}>{label}:</strong> {policyDeclarationText(value)}
              </div>
            ))}
          </div>

          {/* Every coverage gap stays explicit; missing evidence is not a pass. */}
          <div role="group" aria-label="Persistence evidence coverage" style={{
            padding: '10px 14px',
            background: theme.surfaceDeep,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radiusSmall,
            marginBottom: '10px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: theme.textMuted, marginBottom: '6px' }}>Persistence evidence coverage</div>
            <div style={{ fontSize: '10px', color: theme.textDim }}>Coverage complete: {health.checks.persistence.coverage.complete === true ? 'yes' : health.checks.persistence.coverage.complete === false ? 'no' : 'UNKNOWN — not supplied by API'}</div>
            {(health.checks.persistence.coverage.surfaces?.length ?? 0) > 0 ? (
              <ul style={{ margin: '5px 0', paddingLeft: '18px', color: theme.textDim, fontSize: '10px' }}>
                {health.checks.persistence.coverage.surfaces?.map((surface) => (
                  <li key={surface.name}>{surface.name}: {surface.encryption}; key source {surface.keySource}; evidence {surface.evidence}</li>
                ))}
              </ul>
            ) : <div style={{ fontSize: '10px', color: theme.textDim }}>Coverage surfaces: none supplied</div>}
            <div style={{ fontSize: '10px', color: health.checks.persistence.coverage.unverifiedSurfaces?.length ? theme.warning : theme.textDim, overflowWrap: 'anywhere' }}>
              Unverified surfaces: {health.checks.persistence.coverage.unverifiedSurfaces ? (health.checks.persistence.coverage.unverifiedSurfaces.join(', ') || 'none listed') : 'UNKNOWN — not supplied by API'}
            </div>
            {health.checks.persistence.coverage.unverifiedReasons?.length ? (
              <div style={{ fontSize: '10px', color: theme.warning, overflowWrap: 'anywhere' }}>Unverified reasons: {health.checks.persistence.coverage.unverifiedReasons.join(' · ')}</div>
            ) : null}
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
              <span>auth mode: <span style={{ color: theme.accent }}>{health.policy.authMode || 'UNKNOWN — not supplied by API'}</span></span>
              <span>read access: <span style={{ color: health.policy.readAuthConfigured === true ? theme.verified : theme.textDim }}>{configuredText(health.policy.readAuthConfigured)}</span></span>
              <span>admin access: <span style={{ color: health.policy.adminAuthConfigured === true ? theme.verified : theme.textDim }}>{configuredText(health.policy.adminAuthConfigured)}</span></span>
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