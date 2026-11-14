import React, { useEffect, useState } from 'react';
import { theme, humanStatus } from './oceanicosTheme';
import { apiFetch } from './api-client';

type WorkerStatus = 'IDLE' | 'BUSY' | 'OFFLINE';
type Worker = {
  workerId: string;
  capabilities: string[];
  status: WorkerStatus;
  lastHeartbeatAt: string;
  leaseCount: number;
};
type WorkersPayload = { success: true; activeWorkers: Worker[] };
type ObservationState = 'OBSERVED' | 'UNKNOWN' | 'DIVERGENT';
const API_BASE_URL = (import.meta.env?.VITE_API_URL ?? '/api').replace(/\/$/, '');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWorker(value: unknown): value is Worker {
  if (!isRecord(value)) return false;
  return (
    typeof value.workerId === 'string' &&
    value.workerId.trim().length > 0 &&
    Array.isArray(value.capabilities) &&
    value.capabilities.every((capability) => typeof capability === 'string') &&
    (value.status === 'IDLE' || value.status === 'BUSY' || value.status === 'OFFLINE') &&
    typeof value.lastHeartbeatAt === 'string' &&
    Number.isFinite(Date.parse(value.lastHeartbeatAt)) &&
    typeof value.leaseCount === 'number' &&
    Number.isSafeInteger(value.leaseCount) &&
    value.leaseCount >= 0
  );
}

function isWorkersPayload(value: unknown): value is WorkersPayload {
  if (!isRecord(value) || value.success !== true || !Array.isArray(value.activeWorkers)) return false;
  const activeWorkers = value.activeWorkers;
  if (!activeWorkers.every(isWorker)) return false;
  const workerIds = activeWorkers.map((worker) => worker.workerId);
  return new Set(workerIds).size === workerIds.length;
}

export function WorkerCoordinationPanel() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [state, setState] = useState<ObservationState>('UNKNOWN');
  const [observedAt, setObservedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let refreshInFlight = false;
    const refresh = async () => {
      if (cancelled || refreshInFlight) return;
      refreshInFlight = true;
      try {
        const response = await apiFetch(`${API_BASE_URL}/v1/omega/workers`);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          if (cancelled) return;
          setWorkers([]);
          setState('DIVERGENT');
          setError('worker response is not valid JSON');
          return;
        }
        if (!isWorkersPayload(payload)) {
          if (cancelled) return;
          setWorkers([]);
          setState('DIVERGENT');
          setError('worker response does not match the expected schema');
          return;
        }
        if (cancelled) return;
        setWorkers(payload.activeWorkers);
        setState('OBSERVED');
        setObservedAt(new Date().toISOString());
        setError(null);
      } catch (cause) {
        if (cancelled) return;
        setState('UNKNOWN');
        setError(cause instanceof Error ? cause.message : 'worker observation unavailable');
      } finally {
        refreshInFlight = false;
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 10000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, []);

  const recordedLeaseCount = workers.reduce((total, worker) => total + worker.leaseCount, 0);
  const stateColor = state === 'OBSERVED' ? theme.verified : state === 'DIVERGENT' ? theme.divergent : theme.warning;
  return (
    <section aria-label="Worker coordination observation" style={{ padding: '16px', marginTop: '16px', border: '1px solid ' + theme.border, borderRadius: theme.radiusSmall, background: theme.surfaceDeep }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
        <div>
          <span className="whole-ecosystem-label">WORKER COORDINATION</span>
          <h3 style={{ margin: '4px 0', color: theme.text }}>INSTANCE · CAPABILITY · STATUS</h3>
        </div>
        <span style={{ padding: '4px 10px', borderRadius: theme.radiusPill, border: '1px solid ' + stateColor + '55', color: stateColor, background: stateColor + '12', fontSize: '11px', fontWeight: 700 }}>{state}</span>
      </div>
      <p style={{ color: theme.textMuted, fontSize: '12px', margin: '8px 0 14px' }}>Runtime observation only. This surface does not grant authority, execute work, or imply health.</p>
      {error ? <div style={{ color: stateColor, fontSize: '12px' }}>{state} · {error}</div> : <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
          <Metric label="Instances" value={String(workers.length)} />
          <Metric label="Workers marked busy" value={String(workers.filter((worker) => worker.status === 'BUSY').length)} />
          <Metric label="Recorded lease count" value={String(recordedLeaseCount)} />
        </div>
        <div style={{ marginTop: '12px', display: 'grid', gap: '6px' }}>
          {observedAt && <div style={{ color: theme.textDim, fontSize: '11px' }}>Observed {new Date(observedAt).toLocaleTimeString()}</div>}
          {workers.length === 0 ? <div style={{ color: theme.textDim, fontSize: '12px' }}>No worker instances observed.</div> : workers.map((worker) => (
            <div key={worker.workerId} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 0.8fr', gap: '8px', padding: '8px', border: '1px solid ' + theme.border, borderRadius: theme.radiusSmall }}>
              <span style={{ fontFamily: theme.fontMono, fontSize: '11px', color: theme.text }}>{worker.workerId}</span>
              <span style={{ fontSize: '11px', color: theme.textMuted }}>capabilities: {worker.capabilities.length ? worker.capabilities.join(', ') : 'none recorded'}</span>
              <span style={{ fontSize: '11px', color: worker.status === 'BUSY' ? theme.accent : theme.textDim }}>{humanStatus(worker.status)}</span>
            </div>
          ))}
        </div>
      </>}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div style={{ padding: '8px', border: '1px solid ' + theme.border, borderRadius: theme.radiusSmall }}><div style={{ color: theme.textDim, fontSize: '10px' }}>{label}</div><strong style={{ color: theme.text, fontSize: '15px' }}>{value}</strong></div>;
}
