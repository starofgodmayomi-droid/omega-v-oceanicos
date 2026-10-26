import { useState, useEffect, useCallback } from 'react';
import { theme, statusColor, humanStatus } from './oceanicosTheme';

/*
 * SystemHealthPanel — surfaces the /health endpoint in the UI.
 *
 * The API returns `{ data: Health }`. Missing fields stay UNKNOWN.
 * A readiness string is displayed, not promoted into a deployment claim.
 */

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

interface HealthAcknowledgement {
  operatorId?: string;
  action?: string;
}

interface HealthPersistence {
  mode?: string;
  source?: string;
  keySource?: string;
  eventLogSource?: string;
  skippedLogEntries?: number;
  rotationPending?: boolean;
  operatorAction?: string;
  acknowledgement?: HealthAcknowledgement | null;
  coverage?: {
    complete?: boolean;
    unverifiedSurfaces?: string[];
  };
}

interface HealthResponse {
  status?: string;
  service?: string;
  readiness?: string;
  checks?: {
    observer?: string;
    verifier?: string;
    attester?: string;
    memory?: { status?: string; integrity?: boolean; encryption?: string };
    persistence?: HealthPersistence;
  };
  policy?: {
    authMode?: string;
    readAuthConfigured?: boolean;
    adminAuthConfigured?: boolean;
    revocationEnabled?: boolean;
    persistenceEncryption?: string;
  };
  timestamp?: string;
}

function readHealth(payload: unknown): HealthResponse | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as { data?: unknown };
  const body =
    record.data && typeof record.data === 'object' && !Array.isArray(record.data)
      ? record.data
      : payload;
  if (!body || typeof body !== 'object') return null;
  return body as HealthResponse;
}

function readinessLabel(value: string | undefined): string {
  return typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : 'UNKNOWN';
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
      if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
      const next = readHealth(data);
      if (!next) throw new Error('health evidence unavailable');
      setHealth(next);
    } catch (err: unknown) {
      setHealth(null);
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

  const label = readinessLabel(health?.readiness);
  const readinessColor =
    label === 'READY' ? theme.verified : label === 'UNKNOWN' ? theme.unknown : theme.warning;
  const persistence = health?.checks?.persistence;
  const policy = health?.policy;
  const memory = health?.checks?.memory;
  const acknowledgement = persistence?.acknowledgement;

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
              {label}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '14px' }}>
            {[
              { label: 'Observer', value: health.checks?.observer },
              { label: 'Verifier', value: health.checks?.verifier },
              { label: 'Attester', value: health.checks?.attester },
              { label: 'Memory', value: memory?.status },
            ].map((check) => {
              const shown = typeof check.value === 'string' && check.value.trim() ? check.value : 'UNKNOWN';
              const isReady = shown === 'ready';
              const color = isReady ? theme.verified : shown === 'UNKNOWN' ? theme.unknown : theme.warning;
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
                      {shown}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {memory && (
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
                <span>integrity: <span style={{ color: memory.integrity === true ? theme.verified : memory.integrity === false ? theme.divergent : theme.unknown, fontWeight: 600 }}>
                  {memory.integrity === true ? 'intact' : memory.integrity === false ? 'broken' : 'UNKNOWN'}
                </span></span>
                <span>encryption: <span style={{ color: theme.textDim }}>{memory.encryption ?? 'UNKNOWN'}</span></span>
              </div>
            </div>
          )}

          {persistence && (
            <div style={{
              padding: '10px 14px',
              background: theme.surfaceDeep,
              border: `1px solid ${theme.border}`,
              borderRadius: theme.radiusSmall,
              marginBottom: '10px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: theme.textMuted, marginBottom: '6px' }}>
                Persistence{persistence.mode ? ` · ${persistence.mode}` : ''}
              </div>
              <div style={{ fontSize: '11px', color: theme.textDim, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span>event log: {persistence.eventLogSource ?? persistence.source ?? 'UNKNOWN'}</span>
                {typeof persistence.skippedLogEntries === 'number' && (
                  <span>skipped: {persistence.skippedLogEntries}</span>
                )}
                <span>key: {persistence.keySource ?? 'UNKNOWN'}</span>
                <span>
                  rotation pending: {typeof persistence.rotationPending === 'boolean' ? String(persistence.rotationPending) : 'UNKNOWN'}
                </span>
                {persistence.operatorAction && persistence.operatorAction !== 'none' && (
                  <span style={{ color: theme.warning }}>
                    operator action: {persistence.operatorAction} · review evidence, not recovery
                  </span>
                )}
                {acknowledgement && (
                  <span>
                    acknowledged: {acknowledgement.operatorId ?? 'UNKNOWN'} / {acknowledgement.action ?? 'UNKNOWN'} · review evidence, not recovery
                  </span>
                )}
                {persistence.coverage?.complete === false && (
                  <span style={{ color: theme.unknown }}>
                    unverified: {(persistence.coverage.unverifiedSurfaces ?? []).join(', ') || 'UNKNOWN'}
                  </span>
                )}
              </div>
            </div>
          )}

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
              <span>auth: <span style={{ color: theme.accent }}>{policy?.authMode ?? 'UNKNOWN'}</span></span>
              <span>revocation: <span style={{ color: policy?.revocationEnabled === true ? theme.verified : policy?.revocationEnabled === false ? theme.divergent : theme.unknown }}>
                {policy?.revocationEnabled === true ? 'enabled' : policy?.revocationEnabled === false ? 'disabled' : 'UNKNOWN'}
              </span></span>
              <span>encryption: <span style={{ color: theme.textDim }}>{policy?.persistenceEncryption ?? 'UNKNOWN'}</span></span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
