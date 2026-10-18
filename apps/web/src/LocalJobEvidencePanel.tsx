import { useCallback, useEffect, useState } from 'react';
import { theme } from './oceanicosTheme';

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');
type LocalJobState = 'queued' | 'running' | 'succeeded' | 'failed' | 'unknown';
type Job = {
  id?: string;
  state?: LocalJobState;
  kind?: string;
  actor?: string;
  sourceUri?: string;
  workerId?: string | null;
  attempt?: number;
  createdAt?: string;
  updatedAt?: string;
  finishedAt?: string | null;
  resultSummary?: string | null;
  errorClass?: string | null;
  payloadDigest?: string;
  provenance?: {
    source?: string;
    actor?: string | null;
    requestId?: string | null;
    correlationId?: string | null;
    observedAt?: string;
    schemaVersion?: string;
  };
};
type Ledger = {
  enabled?: boolean;
  durable?: boolean;
  source?: string;
  encryption?: string;
  counts?: Partial<Record<LocalJobState, number>>;
  recentWindow?: number;
};
type ViewState =
  | { status: 'loading' }
  | { status: 'available'; jobs: Job[]; ledger: Ledger; browserReadAt: string }
  | { status: 'access-denied' }
  | { status: 'disabled' }
  | { status: 'unavailable' };

function value(value: string | number | null | undefined): string | number {
  return value === null || value === undefined || value === '' ? 'UNKNOWN — not supplied by API' : value;
}
function flag(value: boolean | undefined): string {
  return value === true ? 'yes' : value === false ? 'no' : 'UNKNOWN — not supplied by API';
}

export function LocalJobEvidencePanel() {
  const [view, setView] = useState<ViewState>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/jobs?limit=20`);
      if (response.status === 401 || response.status === 403) {
        setView({ status: 'access-denied' });
        return;
      }
      const payload = await response.json().catch(() => null);
      if (response.status === 503 && payload?.error === 'LOCAL_JOB_LEDGER_DISABLED') {
        setView({ status: 'disabled' });
        return;
      }
      if (!response.ok || payload?.success !== true || !Array.isArray(payload.jobs) || !payload.ledger || typeof payload.ledger !== 'object') {
        setView({ status: 'unavailable' });
        return;
      }
      setView({
        status: 'available',
        jobs: payload.jobs as Job[],
        ledger: payload.ledger as Ledger,
        browserReadAt: new Date().toISOString(),
      });
    } catch {
      setView({ status: 'unavailable' });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 15000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  return (
    <section
      role="region"
      aria-label="Read-only local job evidence"
      style={{ padding: '18px 22px', fontFamily: theme.fontSans, background: theme.surface, borderTop: `1px solid ${theme.border}` }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: theme.accent }}>Local job evidence · read-only</div>
          <div style={{ fontSize: '11px', color: theme.textDim, marginTop: '3px' }}>Job state and provenance reported by the protected API. No jobs are claimed, changed, or executed here.</div>
        </div>
        <button
          type="button"
          onClick={() => { void refresh(); }}
          disabled={refreshing}
          style={{ padding: '6px 10px', borderRadius: theme.radiusSmall, border: `1px solid ${theme.border}`, background: theme.surfaceRaised, color: theme.accent, cursor: refreshing ? 'wait' : 'pointer', fontSize: '11px' }}
        >
          {refreshing ? 'Reading…' : 'Refresh'}
        </button>
      </div>

      {view.status === 'loading' && <div role="status" style={{ color: theme.textDim, fontSize: '11px' }}>Loading read-only job evidence…</div>}
      {view.status === 'access-denied' && <div role="status" style={{ color: theme.warning, fontSize: '11px', lineHeight: 1.5 }}>Read access unavailable. The protected jobs API did not authorize this request; job state is not inferred.</div>}
      {view.status === 'disabled' && <div role="status" style={{ color: theme.warning, fontSize: '11px', lineHeight: 1.5 }}>LOCAL_JOB_LEDGER_DISABLED. The API reports that the local job evidence ledger is disabled; no empty or healthy state is inferred.</div>}
      {view.status === 'unavailable' && <div role="status" style={{ color: theme.warning, fontSize: '11px', lineHeight: 1.5 }}>Job evidence unavailable. No job or ledger state is inferred from this response.</div>}

      {view.status === 'available' && (
        <>
          <div role="group" aria-label="Local job ledger status" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '12px' }}>
            <Metric label="Ledger enabled" value={flag(view.ledger.enabled)} />
            <Metric label="Durable storage" value={flag(view.ledger.durable)} />
            <Metric label="Source" value={value(view.ledger.source)} />
            <Metric label="Encryption" value={value(view.ledger.encryption)} />
            <Metric label="Recent window" value={value(view.ledger.recentWindow)} />
          </div>
          <div role="group" aria-label="Local job state counts" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', fontSize: '11px', color: theme.textMuted, marginBottom: '12px' }}>
            {(['queued', 'running', 'succeeded', 'failed', 'unknown'] as const).map((state) => (
              <span key={state}>{state}: {value(view.ledger.counts?.[state])}</span>
            ))}
          </div>
          <div style={{ fontSize: '10px', color: theme.textDim, marginBottom: '8px' }}>Browser read time: {view.browserReadAt}</div>
          {view.jobs.length === 0 ? (
            <div style={{ color: theme.textDim, fontSize: '11px' }}>No job records returned by the API.</div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {view.jobs.map((job, index) => (
                <article key={job.id ?? `${job.sourceUri ?? 'unknown'}-${index}`} style={{ padding: '10px 12px', border: `1px solid ${theme.border}`, borderRadius: theme.radiusSmall, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
                    <strong style={{ color: theme.text, fontSize: '11px', overflowWrap: 'anywhere' }}>{value(job.id)}</strong>
                    <span style={{ color: job.state === 'failed' ? theme.divergent : job.state === 'succeeded' ? theme.verified : theme.textMuted, fontSize: '10px', fontWeight: 700 }}>{value(job.state).toString().toUpperCase()}</span>
                  </div>
                  <div style={{ marginTop: '6px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '5px 12px', fontSize: '10px', color: theme.textDim, overflowWrap: 'anywhere' }}>
                    <span>Kind: {value(job.kind)}</span>
                    <span>Actor: {value(job.actor)}</span>
                    <span>Worker: {value(job.workerId)}</span>
                    <span>Attempt: {value(job.attempt)}</span>
                    <span>Source URI: {value(job.sourceUri)}</span>
                    <span>Created: {value(job.createdAt)}</span>
                    <span>Updated: {value(job.updatedAt)}</span>
                    <span>Finished: {value(job.finishedAt)}</span>
                    <span>Result: {value(job.resultSummary)}</span>
                    <span>Error class: {value(job.errorClass)}</span>
                    <span>Payload digest: {value(job.payloadDigest)}</span>
                    <span>Provenance source: {value(job.provenance?.source)}</span>
                    <span>Provenance actor: {value(job.provenance?.actor)}</span>
                    <span>Request ID: {value(job.provenance?.requestId)}</span>
                    <span>Correlation ID: {value(job.provenance?.correlationId)}</span>
                    <span>Observed at: {value(job.provenance?.observedAt)}</span>
                    <span>Schema version: {value(job.provenance?.schemaVersion)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Metric({ label, value: metricValue }: { label: string; value: string | number }) {
  return <div style={{ padding: '9px 10px', border: `1px solid ${theme.border}`, borderRadius: theme.radiusSmall }}><div style={{ color: theme.textDim, fontSize: '10px' }}>{label}</div><strong style={{ color: theme.text, fontSize: '12px' }}>{metricValue}</strong></div>;
}