import React, { useState, useCallback } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

interface CommandSummary {
  commandId: string;
  intent: string;
  requestedBy: string;
  status: string;
  createdAt: string;
  workers: string[];
  decision: string | null;
  authority: string | null;
  policy: string | null;
  execution: { stateAfter: string; consequence: string; attestationId: string } | null;
  reality: { observedState: string; evidence: string; observedAt: string; classification: string } | null;
}

interface ProvenanceDetail {
  commandId: string;
  intent: string;
  requestedBy: string;
  createdAt: string;
  context: Record<string, string>;
  workers: string[];
  status: string;
  ir: any;
  change: any;
  execution: { stateAfter: string; consequence: string; attestationId: string } | null;
  reality: { observedState: string; evidence: string; observedAt: string; classification: string } | null;
  events: Record<string, unknown>[];
  lineage: { type: string; at: string; status: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  PROPOSED: '#94a3b8',
  REVIEW: '#facc15',
  DENIED: '#fca5a5',
  AUTHORIZED: '#38bdf8',
  EXECUTED: '#6ee7b7',
  ATTESTED: '#00ff66',
  VERIFIED: '#00ff66',
  DIVERGENT: '#ffaa00',
  UNKNOWN: '#94a3b8',
  FAILED: '#fca5a5',
};

const TRANSITION_FLOW = [
  'PROPOSED', 'REVIEW', 'AUTHORIZED', 'EXECUTED', 'ATTESTED', 'VERIFIED',
];

export function TransitionProvenancePanel() {
  const [commands, setCommands] = useState<CommandSummary[]>([]);
  const [selected, setSelected] = useState<ProvenanceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCommands = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/omega/commands`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setCommands(data.commands ?? []);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'command list unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProvenance = useCallback(async (commandId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/omega/commands/${commandId}/provenance`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setSelected(data.provenance);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'provenance unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <section
      aria-label="Transition provenance surface"
      style={{
        background: '#07121b',
        border: '1px solid #38bdf844',
        borderRadius: '6px',
        padding: '16px',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <div style={{ color: '#38bdf8', fontSize: '13px', fontWeight: 'bold' }}>
            🔗 TRANSITION PROVENANCE — τ=(S,I,E,A,P,C)→(D,S′,R)
          </div>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>
            Bounded transition lineage · state + causality + justification + consequence
          </div>
        </div>
        <button
          onClick={fetchCommands}
          disabled={loading}
          style={{
            background: '#0a1d2e',
            color: '#38bdf8',
            border: '1px solid #38bdf855',
            borderRadius: '4px',
            padding: '8px 14px',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'LOADING...' : commands.length > 0 ? '↻ REFRESH' : '📋 FETCH COMMANDS'}
        </button>
      </div>

      {error && (
        <div style={{ color: '#fca5a5', fontSize: '11px', marginBottom: '10px' }}>⚠ {error}</div>
      )}

      {commands.length > 0 && !selected && (
        <div>
          <div style={{ color: '#e2e8f0', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' }}>
            COMMAND LEDGER ({commands.length} COMMANDS)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {commands.map((cmd) => {
              const color = STATUS_COLORS[cmd.status] ?? '#94a3b8';
              return (
                <div
                  key={cmd.commandId}
                  onClick={() => fetchProvenance(cmd.commandId)}
                  style={{
                    background: '#03080d',
                    border: `1px solid ${color}33`,
                    borderRadius: '4px',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${color}88`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${color}33`; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ color, fontWeight: 'bold', fontSize: '9px', padding: '2px 6px', borderRadius: '3px', background: `${color}15`, border: `1px solid ${color}44`, whiteSpace: 'nowrap' }}>
                        {cmd.status}
                      </span>
                      <span style={{ color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cmd.intent}
                      </span>
                    </div>
                    <div style={{ color: '#475569', fontSize: '10px', marginTop: '3px' }}>
                      {cmd.commandId.substring(0, 24)}... · by {cmd.requestedBy} · {new Date(cmd.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <span style={{ color: '#334155', fontSize: '14px', marginLeft: '8px' }}>▸</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selected && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: '#38bdf8', fontSize: '11px', fontWeight: 'bold' }}>
              PROVENANCE RECORD — {selected.commandId.substring(0, 24)}...
            </span>
            <button
              onClick={() => setSelected(null)}
              style={{
                background: '#0a1d2e', color: '#94a3b8', border: '1px solid #334155',
                borderRadius: '4px', padding: '4px 10px', fontSize: '10px', cursor: 'pointer',
              }}
            >
              ← BACK TO LIST
            </button>
          </div>

          {/* Transition Flow Visualization */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center', fontSize: '10px', marginBottom: '14px' }}>
            {TRANSITION_FLOW.map((stage, i) => {
              const reached = TRANSITION_FLOW.indexOf(selected.status) >= i;
              const isCurrent = selected.status === stage;
              const color = STATUS_COLORS[stage] ?? '#94a3b8';
              return (
                <React.Fragment key={stage}>
                  <span
                    style={{
                      padding: '3px 8px', borderRadius: '3px', fontWeight: isCurrent ? 'bold' : 'normal',
                      background: reached ? `${color}15` : 'transparent',
                      color: reached ? color : '#334155',
                      border: reached ? `1px solid ${color}44` : '1px solid #1e293b',
                    }}
                  >
                    {stage}
                  </span>
                  {i < TRANSITION_FLOW.length - 1 && <span style={{ color: '#334155' }}>→</span>}
                </React.Fragment>
              );
            })}
          </div>

          {/* τ Record Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px', marginBottom: '14px' }}>
            <ProvenanceField label="S — State Before" value={selected.context?.stateBefore ?? 'unknown'} color="#94a3b8" />
            <ProvenanceField label="I — Intent" value={selected.intent} color="#38bdf8" />
            <ProvenanceField label="E — Evidence" value={selected.change?.evidence ?? 'pending'} color="#6ee7b7" />
            <ProvenanceField label="A — Authority" value={selected.change?.authority ?? 'not-yet-granted'} color="#facc15" />
            <ProvenanceField label="P — Policy" value={selected.change?.policy ?? 'pending'} color="#38bdf8" />
            <ProvenanceField label="C — Context" value={Object.entries(selected.context || {}).map(([k, v]) => `${k}=${v}`).join(', ') || 'none'} color="#94a3b8" />
            <ProvenanceField label="D — Decision" value={selected.change?.decision ?? 'pending'} color={STATUS_COLORS[selected.status] ?? '#94a3b8'} />
            <ProvenanceField label="S′ — State After" value={selected.execution?.stateAfter ?? 'not-executed'} color="#6ee7b7" />
            <ProvenanceField label="R — Consequence" value={selected.execution?.consequence ?? 'not-executed'} color="#6ee7b7" />
            <ProvenanceField label="Attestation" value={selected.execution?.attestationId ?? 'none'} color="#00ff66" />
            <ProvenanceField label="Reality" value={selected.reality?.classification ?? 'not-observed'} color={selected.reality?.classification === 'VERIFIED' ? '#00ff66' : '#facc15'} />
          </div>

          {/* Lineage / Event Trail */}
          <div style={{ background: '#03080d', border: '1px solid #334155', borderRadius: '4px', padding: '12px' }}>
            <div style={{ color: '#6ee7b7', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' }}>
              LINEAGE — APPEND-ONLY EVENT TRAIL ({selected.lineage.length} EVENTS)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {selected.lineage.map((event, i) => {
                const color = STATUS_COLORS[event.status] ?? '#94a3b8';
                return (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '10px' }}>
                    <span style={{ color: '#334155', fontFamily: 'monospace' }}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{event.type}</span>
                    <span style={{ color, fontSize: '9px', padding: '1px 5px', borderRadius: '2px', background: `${color}15` }}>{event.status}</span>
                    <span style={{ color: '#475569', marginLeft: 'auto' }}>{new Date(event.at).toLocaleTimeString()}</span>
                  </div>
                );
              })}
              {selected.lineage.length === 0 && (
                <div style={{ color: '#475569', fontSize: '10px' }}>No events recorded</div>
              )}
            </div>
          </div>
        </div>
      )}

      {commands.length === 0 && !loading && !error && !selected && (
        <div style={{ color: '#475569', fontSize: '11px', textAlign: 'center', padding: '20px' }}>
          No commands yet. Propose a bounded command above to populate the transition provenance ledger.
        </div>
      )}
    </section>
  );
}

function ProvenanceField({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#03080d', border: `1px solid ${color}22`, borderRadius: '4px', padding: '8px 10px' }}>
      <div style={{ color, fontSize: '9px', fontWeight: 'bold', marginBottom: '4px' }}>{label}</div>
      <div style={{ color: '#94a3b8', fontSize: '10px', fontFamily: 'monospace', wordBreak: 'break-word' }}>
        {value.length > 120 ? value.substring(0, 120) + '...' : value}
      </div>
    </div>
  );
}
