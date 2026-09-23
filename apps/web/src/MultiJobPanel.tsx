import React, { useState } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

type Job = {
  jobId: string;
  intent: string;
  mode: 'sequential' | 'parallel';
  status: string;
  approvedBy: string | null;
  steps: Array<{
    stepId: string;
    intent: string;
    worker: string;
    commandId: string;
    status: string;
    execution?: { stateAfter: string; consequence: string; attestationId: string };
    reality?: { observedState: string; evidence: string; classification: string; observedAt: string };
  }>;
};

const DEFAULT_STEPS = [
  { stepId: 'inspect', intent: 'inspect the current repository evidence', worker: 'observer' },
  { stepId: 'test', intent: 'run the bounded local test plan', worker: 'tester' },
  { stepId: 'security', intent: 'review the current security boundary', worker: 'security-reviewer' },
];

export function MultiJobPanel() {
  const [intent, setIntent] = useState('');
  const [mode, setMode] = useState<'sequential' | 'parallel'>('parallel');
  const [job, setJob] = useState<Job | null>(null);
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = async (path: string, init?: RequestInit) => {
    const response = await fetch(`${API_BASE_URL}${path}`, init);
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
    return data;
  };

  const propose = async () => {
    if (!intent.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const data = await request('/v1/omega/jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          requestedBy: 'navigator-user',
          intent: intent.trim(),
          mode,
          idempotencyKey: `navigator-job-${Date.now()}`,
          steps: DEFAULT_STEPS,
        }),
      });
      setJob(data.job);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'multi-job proposal failed');
    } finally {
      setBusy(false);
    }
  };

  const mutate = async (action: 'approve' | 'execute') => {
    if (!job) return;
    setBusy(true);
    setError(null);
    try {
      const data = await request(`/v1/omega/jobs/${job.jobId}/${action}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: action === 'approve' ? JSON.stringify({ operator: 'navigator-operator' }) : JSON.stringify({}),
      });
      setJob(data.job);
    } catch (e) {
      setError(e instanceof Error ? e.message : `multi-job ${action} failed`);
    } finally {
      setBusy(false);
    }
  };

  const observe = async () => {
    if (!job) return;
    const payload = job.steps.map((step) => ({ stepId: step.stepId, observedState: observations[step.stepId] || '' }));
    if (payload.some((item) => !item.observedState.trim())) {
      setError('Every executed step requires an attributable observed state.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await request(`/v1/omega/jobs/${job.jobId}/observe`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ observations: payload }),
      });
      setJob(data.job);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'multi-job observation failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={{ border: '1px solid #38bdf833', borderRadius: 8, background: '#07121b', padding: 18, marginBottom: 20 }}>
      <div style={{ color: '#38bdf8', fontSize: 13, fontWeight: 800, letterSpacing: '0.04em' }}>
        MULTI-JOB BUILDER
      </div>
      <div style={{ color: '#64748b', fontSize: 11, marginTop: 5 }}>
        One intent → bounded worker plan → human approval → multi-step execution → attributable observation.
      </div>

      {!job && (
        <>
          <textarea
            value={intent}
            onChange={(event) => setIntent(event.target.value)}
            placeholder="Describe the bounded multi-job you want Oceanicos to coordinate…"
            maxLength={2000}
            style={{ width: '100%', minHeight: 78, boxSizing: 'border-box', marginTop: 12, padding: 12, background: '#03080d', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 9, alignItems: 'center' }}>
            <select value={mode} onChange={(event) => setMode(event.target.value as 'sequential' | 'parallel')} style={{ background: '#03080d', color: '#94a3b8', border: '1px solid #334155', borderRadius: 5, padding: '7px 9px' }}>
              <option value="parallel">Parallel bounded steps</option>
              <option value="sequential">Sequential bounded steps</option>
            </select>
            <button onClick={propose} disabled={busy || !intent.trim()} style={buttonStyle(busy || !intent.trim())}>
              {busy ? 'PROPOSING…' : 'PROPOSE MULTI-JOB'}
            </button>
          </div>
        </>
      )}

      {error && <div style={{ color: '#fca5a5', fontSize: 11, marginTop: 10 }}>⚠ {error}</div>}

      {job && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700 }}>{job.intent}</div>
              <div style={{ color: '#64748b', fontSize: 10, marginTop: 3 }}>{job.jobId} · {job.mode} · {job.status}</div>
            </div>
            {job.status === 'REVIEW' && <button onClick={() => mutate('approve')} disabled={busy} style={buttonStyle(busy)}>HUMAN APPROVE</button>}
            {job.status === 'AUTHORIZED' && <button onClick={() => mutate('execute')} disabled={busy} style={buttonStyle(busy)}>EXECUTE BOUNDED JOB</button>}
          </div>

          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {job.steps.map((step) => (
              <div key={step.stepId} style={{ background: '#03080d', border: '1px solid #1e293b', borderRadius: 6, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 700 }}>{step.stepId}</span>
                  <span style={{ color: step.status === 'VERIFIED' ? '#6ee7b7' : '#94a3b8', fontSize: 9, fontWeight: 800 }}>{step.status}</span>
                </div>
                <div style={{ color: '#64748b', fontSize: 10, marginTop: 3 }}>{step.worker} · {step.intent}</div>
                {step.execution && <div style={{ color: '#64748b', fontSize: 10, marginTop: 5 }}>executed: {step.execution.stateAfter}</div>}
                {step.status === 'EXECUTED' && (
                  <input
                    value={observations[step.stepId] || ''}
                    onChange={(event) => setObservations((current) => ({ ...current, [step.stepId]: event.target.value }))}
                    placeholder="Observed state — enter what was actually observed"
                    style={{ width: '100%', boxSizing: 'border-box', marginTop: 8, padding: 8, background: '#07121b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 5, fontSize: 10 }}
                  />
                )}
                {step.reality && <div style={{ color: step.reality.classification === 'VERIFIED' ? '#6ee7b7' : '#facc15', fontSize: 10, marginTop: 6 }}>reconciled: {step.reality.classification} · {step.reality.evidence}</div>}
              </div>
            ))}
          </div>

          {job.status === 'COMPLETED' && <button onClick={observe} disabled={busy} style={{ ...buttonStyle(busy), marginTop: 10 }}>RECONCILE OBSERVATIONS</button>}
          {(job.status === 'VERIFIED' || job.status === 'DIVERGENT' || job.status === 'UNKNOWN' || job.status === 'FAILED') && (
            <button onClick={() => { setJob(null); setIntent(''); setObservations({}); setError(null); }} style={{ ...buttonStyle(false), marginTop: 10, background: '#0f172a', color: '#94a3b8' }}>NEW MULTI-JOB</button>
          )}
        </div>
      )}
    </section>
  );
}

function buttonStyle(disabled: boolean): React.CSSProperties {
  return {
    border: '1px solid #38bdf855',
    borderRadius: 5,
    padding: '8px 12px',
    background: disabled ? '#0f172a' : '#38bdf8',
    color: disabled ? '#64748b' : '#031018',
    fontSize: 10,
    fontWeight: 800,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
