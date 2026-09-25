import { useState } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function MoodCodexPanel() {
  const [intent, setIntent] = useState('improve the next bounded interaction');
  const [signal, setSignal] = useState('keep the guidance calm and clear');
  const [observedState, setObservedState] = useState('bounded-local-action-complete');
  const [codex, setCodex] = useState<any>(null);
  const [command, setCommand] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'plan' | 'proposal' | 'admit' | 'execute' | 'observe' | null>(null);

  const plan = async (persist = false) => {
    setLoading(persist ? 'proposal' : 'plan');
    setError(null);
    setCommand(null);
    try {
      const response = await fetch(`${API_BASE_URL}${persist ? '/v1/mood/codex/proposal' : '/v1/mood/codex'}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          intent,
          requestedBy: 'human:dashboard-operator',
          status: 'USER_STATED',
          uncertainty: 0,
          language: 'en-NG-pidgin',
          signals: [{ signal, status: 'USER_STATED', source: 'dashboard-user', provenance: 'explicit-dashboard-input' }],
        }),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (!response.ok) throw new Error(data?.error || `Codex request failed (${response.status})`);
      setCodex(data.codex);
      setCommand(data.command ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mood Codex unavailable');
    } finally {
      setLoading(null);
    }
  };

  const admit = async () => {
    if (!command?.commandId) return;
    setLoading('admit');
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/omega/commands/${command.commandId}/admit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          authority: 'human:dashboard-operator',
          policy: 'mood-codex-boundary.v1',
          authorityVerified: true,
          policySatisfied: true,
        }),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (!response.ok) throw new Error(data?.error || `Admission failed (${response.status})`);
      setCommand(data.command);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mood Codex admission failed');
    } finally {
      setLoading(null);
    }
  };

  const transition = async (action: 'execute' | 'observe') => {
    if (!command?.commandId) return;
    setLoading(action);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/omega/commands/${command.commandId}/${action}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        ...(action === 'observe' ? { body: JSON.stringify({ observedState }) } : {}),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (!response.ok) throw new Error(data?.error || `${action} failed (${response.status})`);
      setCommand(data.command);
    } catch (err) {
      setError(err instanceof Error ? err.message : `${action} failed`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <section aria-label="Mood Codex autopilot planner" style={{ marginBottom: '22px', border: '1px solid #6b5a3b', borderRadius: '6px', background: 'linear-gradient(135deg, #211b12, #0e1513)', padding: '18px' }}>
      <div style={{ color: '#f0c674', fontSize: '13px', fontWeight: 700 }}>✦ MOOD CODEX · AUTOPILOT PLANNER</div>
      <div style={{ color: '#b9a88a', fontSize: '11px', lineHeight: 1.5, marginTop: '4px' }}>Autopilot fit plan the next finite step; e no get authority to change repo or execute action.</div>
      <label style={{ display: 'block', color: '#d8c8a6', fontSize: '11px', marginTop: '13px' }}>Intent
        <textarea value={intent} onChange={(event) => setIntent(event.target.value)} maxLength={2000} rows={2} style={{ width: '100%', boxSizing: 'border-box', marginTop: '5px', padding: '9px', borderRadius: '4px', border: '1px solid #6b5a3b', background: '#161b16', color: '#efe7d2', fontFamily: 'inherit', fontSize: '12px', resize: 'vertical' }} />
      </label>
      <label style={{ display: 'block', color: '#d8c8a6', fontSize: '11px', marginTop: '9px' }}>Mood signal
        <input value={signal} onChange={(event) => setSignal(event.target.value)} maxLength={512} style={{ width: '100%', boxSizing: 'border-box', marginTop: '5px', padding: '9px', borderRadius: '4px', border: '1px solid #6b5a3b', background: '#161b16', color: '#efe7d2', fontFamily: 'inherit', fontSize: '12px' }} />
      </label>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
        <button onClick={() => plan(false)} disabled={loading !== null || !intent.trim()} style={{ border: '1px solid #f0c674', background: '#3a2f16', color: '#ffe2a1', padding: '8px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{loading === 'plan' ? 'PLANNING…' : 'RUN MOOD CODEX'}</button>
        <button onClick={() => plan(true)} disabled={loading !== null || !intent.trim()} style={{ border: '1px solid #8ce8c8', background: '#8ce8c8', color: '#071312', padding: '8px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{loading === 'proposal' ? 'PERSISTING…' : 'CREATE CODEX PROPOSAL'}</button>
        {command && (command.status === 'PROPOSED' || command.status === 'REVIEW') && <button onClick={admit} disabled={loading !== null} style={{ border: '1px solid #f0c674', background: '#3a2f16', color: '#ffe2a1', padding: '8px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{loading === 'admit' ? 'CHECKING POLICY…' : 'ADMIT CODEX PROPOSAL'}</button>}
        {command?.status === 'AUTHORIZED' && <button onClick={() => transition('execute')} disabled={loading !== null} style={{ border: '1px solid #ffb18d', background: '#3a2118', color: '#ffd3bd', padding: '8px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{loading === 'execute' ? 'EXECUTING…' : 'EXECUTE BOUNDED ACTION'}</button>}
        {command?.status === 'EXECUTED' && <><input value={observedState} onChange={(event) => setObservedState(event.target.value)} maxLength={512} aria-label="Observed state" style={{ border: '1px solid #6b5a3b', background: '#161b16', color: '#efe7d2', padding: '8px', borderRadius: '4px', fontSize: '11px' }} /><button onClick={() => transition('observe')} disabled={loading !== null || !observedState.trim()} style={{ border: '1px solid #8ce8c8', background: '#123a31', color: '#b8f5de', padding: '8px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{loading === 'observe' ? 'OBSERVING…' : 'RECORD OBSERVATION'}</button></>}
      </div>
      {error && <div role="alert" style={{ color: '#ffaaa0', fontSize: '11px', marginTop: '10px' }}>⚠ {error}</div>}
      {codex && <div style={{ marginTop: '14px', borderTop: '1px solid #6b5a3b', paddingTop: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}><strong style={{ color: '#f4ead4', fontSize: '12px' }}>{codex.decision}</strong><span style={{ color: '#f0c674', font: '10px DM Mono, monospace' }}>{command?.status ?? codex.execution}</span><span style={{ color: '#b9a88a', fontSize: '10px' }}>uncertainty {codex.uncertainty}</span></div>
        <ol style={{ color: '#d8c8a6', fontSize: '11px', lineHeight: 1.5, paddingLeft: '20px' }}>{codex.steps.map((step: any) => <li key={step.order}><strong>{step.action}</strong> — {step.instruction}</li>)}</ol>
        <div style={{ color: '#b9a88a', fontSize: '10px', lineHeight: 1.5 }}>{codex.evidenceBoundary}</div>
        {command && <div style={{ color: '#8ce8c8', fontSize: '10px', marginTop: '7px' }}>Command {command.commandId} · {command.status === 'AUTHORIZED' ? 'authorized bounded action; click execute only when ready' : command.status === 'EXECUTED' ? 'executed; independent observation required' : command.status === 'VERIFIED' || command.status === 'DIVERGENT' || command.status === 'UNKNOWN' ? `reality classified ${command.status}` : 'planner only · review/admission required'}</div>}
      </div>}
    </section>
  );
}
