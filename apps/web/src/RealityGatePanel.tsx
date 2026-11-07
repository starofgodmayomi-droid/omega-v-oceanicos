import { useCallback, useEffect, useState } from 'react';

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');
const REFRESH_MS = 20_000;

type GateStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

type GateStep = {
  status: GateStatus;
  committed: boolean;
  reason: string;
  expected: string;
  observed: string | null;
  entry: { index: number; deltaHash: string; entryHash: string; recordedAt: string } | null;
  memoryTip: string;
  memorySize: number;
};

type GateMemoryEntry = {
  index: number;
  deltaHash: string;
  entryHash: string;
  recordedAt: string;
};

type GateMemory = {
  entries: GateMemoryEntry[];
  total: number;
  integrity: 'empty' | 'verified-local-hash-chain' | 'degraded' | string;
  size: number;
  tip: string;
  memoryScope: string;
  authorityLevels: string[];
};

const DEFAULT_AUTHORITIES = ['READ_ONLY', 'AUTONOMOUS'];

const STATUS_COLORS: Record<GateStatus, string> = {
  VERIFIED: '#8ce8c8',
  DIVERGENT: '#ffc28f',
  UNKNOWN: '#94a3b8',
  NOT_EXECUTED: '#b6d4cd',
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
    ...init,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
  return data as T;
}

export function RealityGatePanel() {
  const [memory, setMemory] = useState<GateMemory | null>(null);
  const [step, setStep] = useState<GateStep | null>(null);
  const [memoryWritten, setMemoryWritten] = useState<boolean | null>(null);
  const [intent, setIntent] = useState('record the verified state of the drop');
  const [expected, setExpected] = useState('S1');
  const [observed, setObserved] = useState('S1');
  const [authorityLevel, setAuthorityLevel] = useState('AUTONOMOUS');
  const [requiredAuthority, setRequiredAuthority] = useState('AUTONOMOUS');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await request<GateMemory>('/v1/reality/gate/memory?limit=8');
      setMemory(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reality memory read failed');
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const runStep = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await request<{ step: GateStep; memoryWritten: boolean; memory: GateMemory }>(
        '/v1/reality/gate/step',
        {
          method: 'POST',
          body: JSON.stringify({ intent, expected, observed, authorityLevel, requiredAuthority }),
        },
      );
      setStep(data.step);
      setMemoryWritten(data.memoryWritten);
      // The step answer already carries the post-step chain, so the header
      // agrees with the verdict instead of lagging one refresh behind it.
      setMemory((current) => ({ ...(current ?? ({} as GateMemory)), ...data.memory, entries: current?.entries ?? [] }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reality gate step failed');
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    width: '100%',
    border: '1px solid #285048',
    borderRadius: '4px',
    background: '#08120f',
    color: '#d8f3ec',
    font: '11px DM Mono, monospace',
    padding: '6px 8px',
  } as const;

  const authorities = memory?.authorityLevels?.length ? memory.authorityLevels : DEFAULT_AUTHORITIES;

  return (
    <section
      aria-label="Reality gate"
      style={{ marginBottom: '22px', border: '1px solid #24506a', borderRadius: '6px', background: 'linear-gradient(135deg, #0a141c, #0b1d1a)', padding: '16px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div>
          <div style={{ color: '#8ecdf0', fontSize: '13px', fontWeight: 700 }}>🌊 REALITY GATE · Ω∞v FIXED POINT</div>
          <div style={{ color: '#87aaa2', fontSize: '11px', marginTop: '4px' }}>
            M<sub>t+1</sub> = M<sub>t</sub> ∪ Δ | V(Δ) = ⊤ · a step appends only what matched, and executes nothing
          </div>
        </div>
        <button
          onClick={load}
          style={{ border: '1px solid #547b74', background: 'transparent', color: '#b6d4cd', borderRadius: '4px', padding: '6px 9px', fontSize: '10px' }}
        >
          REFRESH
        </button>
      </div>

      {error && (
        <div role="alert" style={{ color: '#ffaaa0', fontSize: '11px', marginTop: '10px' }}>⚠ {error}</div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '12px', font: '10px DM Mono, monospace', color: '#87aaa2' }}>
        <span>size: {memory?.size ?? 0}</span>
        <span>chain: {memory?.integrity ?? 'unknown'}</span>
        <span>scope: {memory?.memoryScope ?? 'process'}</span>
        <span>tip: {memory?.tip ? memory.tip.slice(0, 12) : '—'}</span>
      </div>

      <div style={{ display: 'grid', gap: '8px', marginTop: '14px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <label style={{ color: '#87aaa2', fontSize: '10px' }}>
          INTENT
          <input value={intent} onChange={(event) => setIntent(event.target.value)} style={inputStyle} />
        </label>
        <label style={{ color: '#87aaa2', fontSize: '10px' }}>
          EXPECTED
          <input value={expected} onChange={(event) => setExpected(event.target.value)} style={inputStyle} />
        </label>
        <label style={{ color: '#87aaa2', fontSize: '10px' }}>
          OBSERVED
          <input value={observed} onChange={(event) => setObserved(event.target.value)} placeholder="leave empty to halt as UNKNOWN" style={inputStyle} />
        </label>
        <label style={{ color: '#87aaa2', fontSize: '10px' }}>
          AUTHORITY
          <select value={authorityLevel} onChange={(event) => setAuthorityLevel(event.target.value)} style={inputStyle}>
            {authorities.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label style={{ color: '#87aaa2', fontSize: '10px' }}>
          REQUIRED
          <select value={requiredAuthority} onChange={(event) => setRequiredAuthority(event.target.value)} style={inputStyle}>
            {authorities.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={runStep}
          disabled={busy}
          style={{ border: '1px solid #4a7f9c', background: 'transparent', color: '#8ecdf0', borderRadius: '4px', padding: '6px 10px', fontSize: '10px' }}
        >
          {busy ? 'WORKING…' : 'STEP THE GATE'}
        </button>
      </div>

      {step && (
        <div
          style={{ marginTop: '12px', border: `1px solid ${step.committed ? '#285048' : '#9d6546'}`, borderRadius: '4px', background: '#0b1412', padding: '10px' }}
        >
          <div style={{ color: STATUS_COLORS[step.status] ?? '#b6d4cd', fontSize: '12px', fontWeight: 700 }}>
            {step.status} · memory {memoryWritten ? 'grown' : 'unchanged'}
          </div>
          <div style={{ color: '#87aaa2', fontSize: '11px', marginTop: '4px' }}>{step.reason}</div>
          <div style={{ color: '#547b74', font: '10px DM Mono, monospace', marginTop: '4px' }}>
            expected {step.expected || '—'} · observed {step.observed ?? '∅'} · size {step.memorySize}
          </div>
        </div>
      )}

      <div style={{ marginTop: '14px' }}>
        <div style={{ color: '#87aaa2', fontSize: '10px', letterSpacing: '0.08em' }}>MEMORY Σ · APPEND-ONLY HASH CHAIN</div>
        {!memory || memory.entries.length === 0 ? (
          <div style={{ color: '#547b74', font: '10px DM Mono, monospace', marginTop: '6px' }}>
            Nothing committed yet — memory equals genesis.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '6px', marginTop: '8px' }}>
            {memory.entries.slice().reverse().map((entry) => (
              <div key={entry.entryHash} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid #16302a', paddingTop: '6px', font: '10px DM Mono, monospace', color: '#87aaa2' }}>
                <span style={{ color: '#8ce8c8', minWidth: '28px' }}>#{entry.index}</span>
                <span>{entry.deltaHash.slice(0, 12)}</span>
                <span style={{ color: '#547b74' }}>→ {entry.entryHash.slice(0, 12)}</span>
                <span style={{ marginLeft: 'auto', color: '#547b74' }}>{new Date(entry.recordedAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
