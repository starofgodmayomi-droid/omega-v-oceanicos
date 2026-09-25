import { useState } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function MoodCodexPanel() {
  const [intent, setIntent] = useState('improve the next bounded interaction');
  const [signal, setSignal] = useState('keep the guidance calm and clear');
  const [codex, setCodex] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const plan = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/mood/codex`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          intent,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mood Codex unavailable');
    } finally {
      setLoading(false);
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
      <button onClick={plan} disabled={loading || !intent.trim()} style={{ marginTop: '12px', border: '1px solid #f0c674', background: '#3a2f16', color: '#ffe2a1', padding: '8px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{loading ? 'PLANNING…' : 'RUN MOOD CODEX'}</button>
      {error && <div role="alert" style={{ color: '#ffaaa0', fontSize: '11px', marginTop: '10px' }}>⚠ {error}</div>}
      {codex && <div style={{ marginTop: '14px', borderTop: '1px solid #6b5a3b', paddingTop: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}><strong style={{ color: '#f4ead4', fontSize: '12px' }}>{codex.decision}</strong><span style={{ color: '#f0c674', font: '10px DM Mono, monospace' }}>{codex.execution}</span><span style={{ color: '#b9a88a', fontSize: '10px' }}>uncertainty {codex.uncertainty}</span></div>
        <ol style={{ color: '#d8c8a6', fontSize: '11px', lineHeight: 1.5, paddingLeft: '20px' }}>{codex.steps.map((step: any) => <li key={step.order}><strong>{step.action}</strong> — {step.instruction}</li>)}</ol>
        <div style={{ color: '#b9a88a', fontSize: '10px', lineHeight: 1.5 }}>{codex.evidenceBoundary}</div>
      </div>}
    </section>
  );
}
