import React, { useState } from 'react';

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

type SceneTraceEntry = {
  sequence: number;
  state: string;
  from: string | null;
  to: string;
  transition: 'origin' | 'advance';
  status: 'observed' | 'verified';
  evidence: string;
};

type SceneSimulation = {
  id: string;
  seed: string;
  equation: string;
  states: string[];
  terminalState: string;
  trace: SceneTraceEntry[];
  branches: Array<{ id: string; perspective: string; states: string[]; terminalState: string }>;
  branchCount: number;
  continuation: string;
  provenance: {
    source: string;
    ruleVersion: string;
    deterministic: boolean;
    verified: false;
    note: string;
  };
};

export function SceneSimulationPanel() {
  const [seed, setSeed] = useState('omega-v-scene');
  const [steps, setSteps] = useState(13);
  const [branches, setBranches] = useState(1);
  const [result, setResult] = useState<SceneSimulation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/scene/simulate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ seed, steps, branches }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.data) {
        throw new Error(payload?.message || payload?.code || `simulation refused (${response.status})`);
      }
      setResult(payload.data as SceneSimulation);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'scene simulation unavailable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      aria-label="Bounded Ω∞v scene simulation"
      style={{
        marginBottom: '22px',
        border: '1px solid #24506b',
        borderRadius: '6px',
        background: 'linear-gradient(135deg, #0b1b2a, #071218)',
        padding: '16px',
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline', flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: '#67e8f9', fontSize: '10px', letterSpacing: '0.14em', fontWeight: 700 }}>KAI · Ω∞v BOUNDED SCENE</div>
          <h2 style={{ color: '#e2e8f0', fontSize: '16px', margin: '6px 0 0' }}>Zero-state → form → return</h2>
        </div>
        <span style={{ color: '#fbbf24', fontSize: '10px', letterSpacing: '0.08em' }}>LOCAL · FINITE · NOT COSMOLOGY</span>
      </header>

      <p style={{ color: '#94a3b8', fontSize: '11px', lineHeight: 1.5, margin: '10px 0 14px' }}>
        A deterministic symbolic trace with bounded point-of-view branches. It models meaning, not the physical universe, consciousness, or literal infinity.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 92px 92px auto', gap: '8px', alignItems: 'end' }}>
        <label style={{ color: '#94a3b8', fontSize: '10px' }}>
          SEED
          <input value={seed} onChange={(event) => setSeed(event.target.value.slice(0, 120))} maxLength={120} style={fieldStyle} />
        </label>
        <label style={{ color: '#94a3b8', fontSize: '10px' }}>
          STEPS
          <input type="number" min={1} max={13} value={steps} onChange={(event) => setSteps(Math.max(1, Math.min(13, Number(event.target.value) || 1)))} style={fieldStyle} />
        </label>
        <label style={{ color: '#94a3b8', fontSize: '10px' }}>
          BRANCHES
          <input type="number" min={1} max={8} value={branches} onChange={(event) => setBranches(Math.max(1, Math.min(8, Number(event.target.value) || 1)))} style={fieldStyle} />
        </label>
        <button type="button" onClick={run} disabled={loading || !seed.trim()} style={buttonStyle}>
          {loading ? 'SIMULATING…' : 'RUN BOUNDED SCENE'}
        </button>
      </div>

      {error && <p role="status" style={{ color: '#fca5a5', fontSize: '11px', marginBottom: 0 }}>Simulation halted · {error}</p>}

      {result && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', color: '#cbd5e1', fontSize: '11px' }}>
            <span aria-label={`terminal state ${result.terminalState}`}>terminal <strong style={{ color: '#67e8f9' }}>{result.terminalState}</strong></span>
            <span>{result.branchCount} perspective{result.branchCount === 1 ? '' : 's'} · {result.provenance.ruleVersion}</span>
          </div>
          <ol aria-label="Scene trace" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: 0, margin: '12px 0', listStyle: 'none' }}>
            {result.trace.map((entry) => (
              <li key={`${entry.sequence}-${entry.evidence}`} title={`${entry.from ?? 'origin'} → ${entry.to} · ${entry.evidence}`} style={{ border: `1px solid ${entry.status === 'observed' ? '#fbbf24' : '#2dd4bf'}55`, borderRadius: '4px', padding: '5px 7px', background: '#03080d', color: entry.status === 'observed' ? '#fbbf24' : '#99f6e4', fontSize: '10px' }}>
                {entry.sequence + 1}. {entry.state}
              </li>
            ))}
          </ol>
          {result.branches.length > 1 && (
            <div style={{ display: 'grid', gap: '5px', color: '#94a3b8', fontSize: '10px' }}>
              {result.branches.map((branch) => <div key={branch.id}><strong style={{ color: '#cbd5e1' }}>{branch.perspective}</strong> · {branch.states.join(' → ')}</div>)}
            </div>
          )}
          <small style={{ display: 'block', color: '#64748b', lineHeight: 1.45, marginTop: '10px' }}>
            {result.provenance.note} Rule: {result.equation}. Evidence is deterministic local-simulation output and remains verified: false.
          </small>
        </div>
      )}
    </section>
  );
}

const fieldStyle: React.CSSProperties = {
  display: 'block',
  boxSizing: 'border-box',
  width: '100%',
  marginTop: '5px',
  padding: '7px 8px',
  border: '1px solid #24506b',
  borderRadius: '4px',
  background: '#03080d',
  color: '#e2e8f0',
  font: '11px inherit',
};

const buttonStyle: React.CSSProperties = {
  border: '1px solid #67e8f9',
  borderRadius: '4px',
  background: '#123244',
  color: '#cffafe',
  padding: '8px 10px',
  fontSize: '10px',
  fontWeight: 700,
  cursor: 'pointer',
};
