import { useRef, useState } from 'react';
import { initialOreadSubmissionIdentity, prepareOreadSubmission } from './oreade-submission';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

interface DropResult {
  drop: {
    dropId: string;
    kind: string;
    mode: string;
    intent: string;
    requestedBy: string;
    targetScope: string[];
    idempotencyKey: string;
    authority: string;
    admission: string;
    stopCondition: string;
    expectedObservation: string;
    evidenceBoundary: string;
    createdAt: string;
  };
  command?: {
    commandId: string;
    status: string;
    dryRun: boolean;
    workers: string[];
    change: { authority: string | null; authorized: boolean; decision: string };
  };
  nextAction: string;
  readOnly?: boolean;
  executed?: boolean;
}

async function requestDrop(path: string, payload: Record<string, unknown>): Promise<DropResult> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.error || `API request failed (${response.status})`);
  return data as DropResult;
}

export function OreadConsole() {
  const [intent, setIntent] = useState('');
  const [requestedBy, setRequestedBy] = useState('dashboard-user');
  const [scope, setScope] = useState('oracle:reflection');
  const [stopCondition, setStopCondition] = useState('stop after one bounded response');
  const [expectedObservation, setExpectedObservation] = useState('one response labeled symbolic is returned');
  const [result, setResult] = useState<DropResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'drop' | 'proposal' | 'admit' | null>(null);

  const submissionIdentity = useRef(initialOreadSubmissionIdentity());
  const payload = () => {
    const request = {
      symbolicIntent: intent,
      requestedBy,
      targetScope: scope.split(',').map((item) => item.trim()).filter(Boolean),
      stopCondition,
      expectedObservation,
    };
    const prepared = prepareOreadSubmission(request, submissionIdentity.current);
    submissionIdentity.current = prepared.identity;
    return prepared.payload;
  };

  const translate = async () => {
    setLoading('drop');
    setError(null);
    try {
      setResult(await requestDrop('/v1/omega/oreade/drop', payload()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Drop translation failed');
    } finally {
      setLoading(null);
    }
  };

  const propose = async () => {
    setLoading('proposal');
    setError(null);
    try {
      setResult(await requestDrop('/v1/omega/oreade/proposal', payload()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proposal handoff failed');
    } finally {
      setLoading(null);
    }
  };

  const admit = async () => {
    const commandId = result?.command?.commandId;
    if (!commandId) return;
    setLoading('admit');
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/omega/commands/${commandId}/admit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          authority: 'human:dashboard-operator',
          policy: 'oreade-symbolic-boundary.v1',
          authorityVerified: true,
          policySatisfied: true,
        }),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (!response.ok) throw new Error(data?.error || `Admission failed (${response.status})`);
      setResult((previous) => previous ? { ...previous, command: data.command, nextAction: data.nextAction, executed: false } : previous);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proposal admission failed');
    } finally {
      setLoading(null);
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    background: '#071c19',
    color: '#d9ebe7',
    border: '1px solid #285048',
    borderRadius: '4px',
    padding: '9px 10px',
    fontSize: '12px',
    fontFamily: 'inherit',
  };

  return (
    <section aria-label="ƆREADE symbolic intent console" style={{ marginBottom: '22px', border: '1px solid #3a6d61', borderRadius: '6px', background: 'linear-gradient(135deg, #0b2420, #071512)', padding: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <div style={{ color: '#8ce8c8', fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em' }}>◌ ƆREADE CONSOLE</div>
          <div style={{ color: '#87aaa2', fontSize: '11px', lineHeight: 1.5, marginTop: '4px' }}>Meaning fit guide the Drop; evidence go carry the claim.</div>
        </div>
        <span style={{ color: '#69e7b9', font: '10px DM Mono, monospace', border: '1px solid #69e7b955', padding: '4px 7px', borderRadius: '3px' }}>BOUNDED / READABLE</span>
      </div>

      <label style={{ display: 'block', color: '#9bc4bb', fontSize: '11px', marginBottom: '6px' }}>
        Symbolic intent
        <textarea value={intent} onChange={(event) => setIntent(event.target.value)} maxLength={2000} rows={2} placeholder="What do you want to explore or build?" style={{ ...fieldStyle, resize: 'vertical', marginTop: '5px' }} />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
        <label style={{ color: '#9bc4bb', fontSize: '11px' }}>Requested by<input value={requestedBy} onChange={(event) => setRequestedBy(event.target.value)} maxLength={96} style={{ ...fieldStyle, marginTop: '5px' }} /></label>
        <label style={{ color: '#9bc4bb', fontSize: '11px' }}>Target scope<input value={scope} onChange={(event) => setScope(event.target.value)} maxLength={512} style={{ ...fieldStyle, marginTop: '5px' }} /></label>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
        <label style={{ color: '#9bc4bb', fontSize: '11px' }}>Stop condition<input value={stopCondition} onChange={(event) => setStopCondition(event.target.value)} maxLength={512} style={{ ...fieldStyle, marginTop: '5px' }} /></label>
        <label style={{ color: '#9bc4bb', fontSize: '11px' }}>Expected observation<input value={expectedObservation} onChange={(event) => setExpectedObservation(event.target.value)} maxLength={512} style={{ ...fieldStyle, marginTop: '5px' }} /></label>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '13px' }}>
        <button onClick={translate} disabled={!intent.trim() || loading !== null} style={{ border: '1px solid #67d9b4', background: '#123a31', color: '#b8f5de', padding: '8px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{loading === 'drop' ? 'TRANSLATING…' : 'TRANSLATE DROP'}</button>
        <button onClick={propose} disabled={!intent.trim() || loading !== null} style={{ border: '1px solid #8ce8c8', background: '#8ce8c8', color: '#071312', padding: '8px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{loading === 'proposal' ? 'PERSISTING…' : 'CREATE PROPOSED COMMAND'}</button>
        {result?.command && (result.command.status === 'PROPOSED' || result.command.status === 'REVIEW') && (
          <button onClick={admit} disabled={loading !== null} style={{ border: '1px solid #f0c674', background: '#3a2f16', color: '#ffe2a1', padding: '8px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{loading === 'admit' ? 'CHECKING POLICY…' : 'ADMIT BOUNDED PROPOSAL'}</button>
        )}
      </div>

      {error && <div role="alert" style={{ color: '#ffaaa0', fontSize: '11px', marginTop: '12px' }}>⚠ {error}</div>}
      {result && (
        <div style={{ marginTop: '15px', borderTop: '1px solid #285048', paddingTop: '13px' }}>
          <div style={{ display: 'flex', gap: '7px', alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ color: '#d9ebe7', fontSize: '12px' }}>{result.drop.kind}</strong>
            <span style={{ color: '#69e7b9', font: '10px DM Mono, monospace' }}>{result.command?.status ?? 'TRANSLATED'}</span>
            {result.readOnly && <span style={{ color: '#87aaa2', fontSize: '10px' }}>read-only translation</span>}
          </div>
          <div style={{ color: '#87aaa2', fontSize: '10px', marginTop: '6px', wordBreak: 'break-word' }}>Drop: {result.drop.dropId}{result.command ? ` · Command: ${result.command.commandId}` : ''}</div>
          <div style={{ color: '#b6d4cd', fontSize: '11px', lineHeight: 1.5, marginTop: '8px' }}>{result.drop.evidenceBoundary}</div>
          <div style={{ color: '#8ce8c8', fontSize: '11px', lineHeight: 1.5, marginTop: '7px' }}>Next: {result.nextAction}</div>
        </div>
      )}
    </section>
  );
}
