import { useEffect, useState } from 'react';

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');
const HOUSE_VALUE = 'ΔVRØ HOUSE';
const HOUSE_DIGEST = 'eddcd34a48a3d4966c874c6cb4b57dea0718a4a82a09acb0ce079c3d1056f718';

type HouseStatus = {
  house: string;
  equation: string;
  phases: string[];
  capabilities: Array<{ id: string; status: string; evidence?: string }>;
  scheduling: { model: string; maxConcurrency: number; maxTasks: number };
};

export function HouseFlowPanel() {
  const [status, setStatus] = useState<HouseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [flow, setFlow] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/v1/house/flow/status`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HOUSE_STATUS_HTTP_${response.status}`);
        return response.json();
      })
      .then((body) => setStatus(body))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'HOUSE_STATUS_UNAVAILABLE');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const runDemo = async () => {
    setRunning(true);
    setError('');
    setFlow(null);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/house/flow/run`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          maxConcurrency: 3,
          tasks: [
            { id: 'observe-soul', organ: 'SOUL', action: 'OBSERVE_ORGAN' },
            { id: 'observe-kai', organ: 'KAI', action: 'OBSERVE_ORGAN' },
            { id: 'observe-mirrio', organ: 'MIRRIO', action: 'OBSERVE_ORGAN' },
            { id: 'observe-lucid', organ: 'LUCID', action: 'OBSERVE_ORGAN' },
            { id: 'observe-truth-weaver', organ: 'TRUTH_WEAVER', action: 'OBSERVE_ORGAN' },
            { id: 'observe-truthos', organ: 'TRUTHOS', action: 'OBSERVE_ORGAN' },
            { id: 'observe-echoframe', organ: 'ECHOFRAME', action: 'OBSERVE_ORGAN' },
            { id: 'observe-oceanicos', organ: 'OCEANICOS', action: 'OBSERVE_ORGAN' },
            { id: 'observe-omega-v', organ: 'OMEGA_V', action: 'OBSERVE_ORGAN' },
            { id: 'observe-dav', organ: 'DAV', action: 'OBSERVE_ORGAN' },
            { id: 'verify-house', organ: 'OMEGA_V', action: 'VERIFY_SHA256', dependsOn: ['observe-soul', 'observe-kai', 'observe-mirrio', 'observe-lucid', 'observe-truth-weaver', 'observe-truthos', 'observe-echoframe', 'observe-oceanicos', 'observe-omega-v', 'observe-dav'], input: { value: HOUSE_VALUE, expectedSha256: HOUSE_DIGEST } },
            { id: 'reconcile', organ: 'MIRRIO', action: 'RECONCILE', dependsOn: ['verify-house'], input: { expected: 'VERIFY(ΔREALITY)', observed: 'VERIFY(ΔREALITY)' } },
            { id: 'value', organ: 'DAV', action: 'VALUE_SCORE', input: { benefit: 0.8, risk: 0.1, cost: 0.1 } },
          ],
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || `HOUSE_FLOW_HTTP_${response.status}`);
      setFlow(body.flow);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'HOUSE_FLOW_FAILED');
    } finally {
      setRunning(false);
    }
  };

  return (
    <section aria-label="ΔVRØ House pluralistic flow" style={{
      margin: '24px auto', padding: '22px', width: 'min(1120px, calc(100% - 32px))',
      border: '1px solid rgba(100, 190, 190, .28)', borderRadius: '18px',
      background: 'linear-gradient(145deg, rgba(5, 28, 34, .96), rgba(8, 17, 30, .96))',
      color: '#e8f4f4', boxSizing: 'border-box', fontFamily: 'inherit',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '.2em', opacity: .7 }}>THE UNIFIED HOUSE RUNTIME</div>
          <h2 style={{ margin: '7px 0', fontSize: '22px' }}>ΔVRØ HOUSE · Pluralistic Flow</h2>
          <p style={{ margin: 0, maxWidth: '720px', opacity: .78, lineHeight: 1.5 }}>
            One coordinated body: independent lanes move together, dependencies stay ordered, and consequential actions stop at the authority gate.
          </p>
        </div>
        <button type="button" onClick={runDemo} disabled={running || loading || !status}
          style={{ border: 0, borderRadius: '999px', padding: '11px 18px', background: '#b6e5dd', color: '#09252a', fontWeight: 700, cursor: running ? 'wait' : 'pointer', opacity: running || loading || !status ? .6 : 1 }}>
          {running ? 'Running flow…' : 'Run verification flow'}
        </button>
      </div>
      <div style={{ margin: '18px 0 12px', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,.045)', fontSize: '12px', lineHeight: 1.7, overflowWrap: 'anywhere' }}>
        <strong>House equation</strong><br />{status?.equation || 'Loading House equation…'}
      </div>
      {loading && <p>Observing House runtime…</p>}
      {error && <p role="alert" style={{ color: '#ffb9a9' }}>{error}</p>}
      {status && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {status.capabilities.map((capability) => (
            <span key={capability.id} style={{ border: '1px solid rgba(180,220,220,.2)', borderRadius: '999px', padding: '6px 10px', fontSize: '11px' }}>
              {capability.id.replace(/-/g, ' ')} · {capability.status}
            </span>
          ))}
        </div>
      )}
      {flow && (
        <div style={{ marginTop: '16px', borderTop: '1px solid rgba(180,220,220,.16)', paddingTop: '14px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <strong>Run {flow.runId}</strong>
            <span>{flow.state}</span>
            <span>{flow.succeeded}/{flow.total} succeeded</span>
            <span>{flow.maxConcurrency} max parallel lanes</span>
          </div>
          <ol style={{ paddingLeft: '22px', lineHeight: 1.8 }}>
            {flow.tasks.map((task: any) => (
              <li key={task.id}>{task.organ} / {task.id}: <strong>{task.status}</strong>{task.outputDigest ? ` · ${task.outputDigest.slice(0, 12)}…` : ''}</li>
            ))}
          </ol>
          <p style={{ fontSize: '12px', opacity: .72 }}>Output digests preserve integrity; they do not independently prove external truth. External mutations remain approval-gated.</p>
        </div>
      )}
    </section>
  );
}
