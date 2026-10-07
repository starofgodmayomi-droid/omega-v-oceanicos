import React, { useEffect, useState } from 'react';
import { theme, humanStatus } from './oceanicosTheme';

type Worker = {
  workerId: string;
  role?: string;
  capabilities?: string[];
  status?: string;
  lease?: { leaseId?: string; expiresAt?: string } | null;
};

type WorkersPayload = {
  success?: boolean;
  activeWorkers?: Worker[];
};

type ObservationState = 'OBSERVED' | 'UNKNOWN' | 'DIVERGENT';

export function WorkerCoordinationPanel() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [state, setState] = useState<ObservationState>('UNKNOWN');
  const [observedAt, setObservedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const response = await fetch('/api/v1/omega/workers');
        const payload = (await response.json()) as WorkersPayload;
        if (!response.ok || payload.success === false) throw new Error('HTTP ' + response.status);
        if (cancelled) return;
        setWorkers(Array.isArray(payload.activeWorkers) ? payload.activeWorkers : []);
        setState('OBSERVED');
        setObservedAt(new Date().toISOString());
        setError(null);
      } catch (cause) {
        if (cancelled) return;
        setState('UNKNOWN');
        setError(cause instanceof Error ? cause.message : 'worker observation unavailable');
      }
    };

    void refresh();
    const interval = window.setInterval(refresh, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const activeLeases = workers.filter((worker) => worker.lease?.leaseId).length;

  return (
    <section
      aria-label="Worker coordination observation"
      style={{
        padding: '16px',
        marginTop: '16px',
        border: '1px solid ' + theme.border,
        borderRadius: theme.radiusSmall,
        background: theme.surfaceDeep,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
        <div>
          <span className="whole-ecosystem-label">WORKER COORDINATION</span>
          <h3 style={{ margin: '4px 0', color: theme.text }}>ROLE · INSTANCE · LEASE</h3>
        </div>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: theme.radiusPill,
            border: '1px solid ' + (state === 'OBSERVED' ? theme.verified : theme.warning) + '55',
            color: state === 'OBSERVED' ? theme.verified : theme.warning,
            background: (state === 'OBSERVED' ? theme.verified : theme.warning) + '12',
            fontSize: '11px',
            fontWeight: 700,
          }}
        >
          {state}
        </span>
      </div>

      <p style={{ color: theme.textMuted, fontSize: '12px', margin: '8px 0 14px' }}>
        Runtime observation only. This surface does not grant authority, execute work, or imply health.
      </p>

      {error ? (
        <div style={{ color: theme.warning, fontSize: '12px' }}>UNKNOWN · {error}</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
            <Metric label="Instances" value={String(workers.length)} />
            <Metric label="Active leases" value={String(activeLeases)} />
            <Metric label="Observation" value={observedAt ? new Date(observedAt).toLocaleTimeString() : '—'} />
          </div>

          <div style={{ marginTop: '12px', display: 'grid', gap: '6px' }}>
            {workers.length === 0 ? (
              <div style={{ color: theme.textDim, fontSize: '12px' }}>No active worker instances observed.</div>
            ) : (
              workers.map((worker) => (
                <div
                  key={worker.workerId}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 0.8fr 0.8fr',
                    gap: '8px',
                    padding: '8px',
                    border: '1px solid ' + theme.border,
                    borderRadius: theme.radiusSmall,
                  }}
                >
                  <span style={{ fontFamily: theme.fontMono, fontSize: '11px', color: theme.text }}>
                    {worker.workerId}
                  </span>
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>
                    role: {worker.role ?? 'UNKNOWN'}
                  </span>
                  <span style={{ fontSize: '11px', color: worker.lease?.leaseId ? theme.accent : theme.textDim }}>
                    {worker.lease?.leaseId ? 'LEASED' : humanStatus(worker.status ?? 'UNKNOWN')}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '8px', border: '1px solid ' + theme.border, borderRadius: theme.radiusSmall }}>
      <div style={{ color: theme.textDim, fontSize: '10px' }}>{label}</div>
      <strong style={{ color: theme.text, fontSize: '15px' }}>{value}</strong>
    </div>
  );
}
