import React, { useState } from 'react';

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

type ReceiptResponse = { success: boolean; receipt?: { status: string; phase_t: number; action: string; reason: string; next_delta: string; evidence_hash: string }; execution?: string; verified?: boolean };

export function OvoosPanel() {
  const [intent, setIntent] = useState('Map one observable local step.');
  const [result, setResult] = useState<ReceiptResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/ovoos/receipt`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ intent, phaseT: 0 }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setResult(payload);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Receipt unavailable'); }
    finally { setLoading(false); }
  };
  return <section aria-label="ΩVØØS bounded receipt" style={{ border: '1px solid #315b55', borderRadius: 8, padding: 16, marginTop: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}><strong>ΩVØØS · BOUNDED RECEIPT</strong><span style={{ color: '#8dbbb0', fontSize: 11 }}>read-only · verified: false</span></div>
    <p style={{ color: '#9ebbb5', fontSize: 12 }}>Stored directive surface. Composition is not execution or independent verification.</p>
    <div style={{ display: 'flex', gap: 8 }}><input aria-label="ΩVØØS intent" value={intent} onChange={(event) => setIntent(event.target.value)} style={{ flex: 1, background: '#0d1918', color: '#d7eee8', border: '1px solid #315b55', padding: 8 }} /><button onClick={run} disabled={loading || !intent.trim()}>{loading ? 'RUNNING…' : 'RUN RECEIPT'}</button></div>
    {error && <p role="alert" style={{ color: '#e8a69b' }}>{error}</p>}
    {result?.receipt && <div style={{ marginTop: 12, fontSize: 12 }}><div><strong>STATUS:</strong> {result.receipt.status} · <strong>EXECUTION:</strong> {result.execution}</div><p>{result.receipt.action}</p><p style={{ color: '#9ebbb5' }}>{result.receipt.reason}</p><small>next Δ: {result.receipt.next_delta} · hash: {result.receipt.evidence_hash}</small></div>}
  </section>;
}
