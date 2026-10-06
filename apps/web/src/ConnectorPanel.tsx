import React, { useCallback, useEffect, useState } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

type Status = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

interface Observation {
  status: Status;
  authorized: boolean;
  executed: boolean;
  observed: boolean;
  expectedObservation: string;
  actualObservation?: string;
  evidence: string;
  issues: string[];
  observedAt: string;
  admission: { decision: string; admitted: boolean };
  liveAdapter?: string | null;
  limitation?: string;
}

const DEFAULT_CONNECTOR = {
  id: 'github.read-repository',
  version: '1.0.0',
  system: 'github',
  capability: 'read repository metadata',
  authRef: 'secret-ref:github-readonly',
  scope: ['repo:starofgodmayomi-droid/omega-v-oceanicos'],
  mode: 'read-only',
  policyRefs: ['policy:connector-read.v1'],
  stopCondition: 'stop after one bounded repository read',
  expectedObservation: 'github:starofgodmayomi-droid/omega-v-oceanicos:metadata',
  timeoutMs: 5000,
  maxAttempts: 1,
  rollbackSupported: false,
};

const STATUS_COLOR: Record<Status, string> = {
  VERIFIED: '#6ee7b7',
  DIVERGENT: '#fca5a5',
  UNKNOWN: '#facc15',
  NOT_EXECUTED: '#94a3b8',
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`API returned invalid JSON (${response.status})`);
  }
  if (!response.ok) throw new Error(payload?.error || `API request failed (${response.status})`);
  return payload as T;
}

const buttonStyle: React.CSSProperties = {
  background: '#0a1d2e',
  color: '#67e8f9',
  border: '1px solid #67e8f955',
  borderRadius: 4,
  padding: '8px 12px',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
};

export function ConnectorPanel() {
  const [latest, setLatest] = useState<Observation | null>(null);
  const [memory, setMemory] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshMemory = useCallback(async () => {
    const data = await request<{ entries?: Observation[]; observations?: Observation[] }>('/v1/omega/connectors/observations');
    setMemory(data.entries ?? data.observations ?? []);
  }, []);

  useEffect(() => {
    refreshMemory().catch((err) => setError(err instanceof Error ? err.message : 'memory unavailable'));
  }, [refreshMemory]);

  const observe = async (live: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const payload = live
        ? {
            connector: DEFAULT_CONNECTOR,
            authorityVerified: true,
            policySatisfied: true,
            approvalVerified: false,
            liveAdapter: 'github-public-repository',
          }
        : {
            connector: DEFAULT_CONNECTOR,
            authorityVerified: true,
            policySatisfied: true,
            approvalVerified: false,
          };
      const result = await request<Observation>('/v1/omega/connectors/observe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setLatest(result);
      await refreshMemory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'observe failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      aria-label="GitHub connector observation"
      style={{
        background: '#07121b',
        border: '1px solid #67e8f944',
        borderRadius: 6,
        padding: 16,
        marginBottom: 20,
      }}
    >
      <div style={{ color: '#67e8f9', fontSize: 13, fontWeight: 'bold' }}>
        CONNECTOR — GITHUB PUBLIC READ
      </div>
      <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4, marginBottom: 12 }}>
        admit → bound execute → observe → reconcile → remember. Admission is not execution.
        Live adapter is declared (`github-public-repository`) and read-only.
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button style={buttonStyle} disabled={loading} onClick={() => void observe(false)}>
          {loading ? 'WORKING…' : 'ADMIT ONLY'}
        </button>
        <button style={buttonStyle} disabled={loading} onClick={() => void observe(true)}>
          {loading ? 'WORKING…' : 'LIVE GITHUB OBSERVE'}
        </button>
      </div>
      {error && <div style={{ color: '#fca5a5', fontSize: 11, marginBottom: 8 }}>⚠ {error}</div>}
      {latest && (
        <div style={{ fontSize: 11, color: '#cbd5e1', marginBottom: 12 }}>
          <span style={{ color: STATUS_COLOR[latest.status], fontWeight: 700 }}>{latest.status}</span>
          {' · '}admitted {String(latest.admission.admitted)}
          {' · '}executed {String(latest.executed)}
          {' · '}observed {String(latest.observed)}
          {latest.actualObservation ? ` · ${latest.actualObservation}` : ''}
          <div style={{ color: '#64748b', marginTop: 4, wordBreak: 'break-all' }}>{latest.evidence}</div>
        </div>
      )}
      <div style={{ color: '#64748b', fontSize: 10 }}>
        memory {memory.length} · in-process only · not deployment · not revenue
      </div>
    </section>
  );
}
