import React, { useState, useCallback, useEffect } from 'react';

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

interface KaiRecord {
  id: string;
  index: number;
  timestamp: string;
  distinction: string;
  statement: string;
  subject: string;
  source: string;
  author: string;
  policyOrAuthority?: string;
  evidenceRef?: string;
  previousHash: string;
  hash: string;
  metadata?: Record<string, unknown>;
}

interface KaiIntegrityReport {
  valid: boolean;
  count: number;
  genesisHash: string;
  tipHash: string;
  distinctions: Record<string, number>;
  evaluatedAt: string;
}

const DISTINCTION_COLORS: Record<string, string> = {
  OBSERVED: '#38bdf8',
  'USER-STATED': '#c084fc',
  DOCUMENTED: '#60a5fa',
  INFERRED: '#fbbf24',
  PROPOSED: '#94a3b8',
  VERIFIED: '#34d399',
  DIVERGENT: '#fb7185',
  UNKNOWN: '#a1a1aa',
  BLOCKED: '#f87171',
  'NOT-AUTHORIZED': '#ef4444',
  CORRECTED: '#2dd4bf',
};

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
  const [activeTab, setActiveTab] = useState<'kai' | 'commands'>('kai');

  // Command ledger state
  const [commands, setCommands] = useState<CommandSummary[]>([]);
  const [selected, setSelected] = useState<ProvenanceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // KAI memory ledger state
  const [kaiRecords, setKaiRecords] = useState<KaiRecord[]>([]);
  const [kaiIntegrity, setKaiIntegrity] = useState<KaiIntegrityReport | null>(null);
  const [kaiFilter, setKaiFilter] = useState<string>('ALL');
  const [kaiLoading, setKaiLoading] = useState(false);
  const [newStatement, setNewStatement] = useState('');
  const [newDistinction, setNewDistinction] = useState('OBSERVED');
  const [newSubject, setNewSubject] = useState('system:state');
  const [newEvidenceRef, setNewEvidenceRef] = useState('live-telemetry');
  const [kaiMessage, setKaiMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

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

  const fetchKaiLedger = useCallback(async () => {
    setKaiLoading(true);
    try {
      const [recordsRes, integrityRes] = await Promise.all([
        fetch(`${API_BASE_URL}/v1/kai/records`),
        fetch(`${API_BASE_URL}/v1/kai/integrity`),
      ]);
      const recordsData = await recordsRes.json();
      const integrityData = await integrityRes.json();
      if (recordsData.success) {
        setKaiRecords(recordsData.records || []);
      }
      if (integrityData.success) {
        setKaiIntegrity(integrityData.report || null);
      }
    } catch (err: any) {
      setKaiMessage({ type: 'err', text: `Failed to load KAI ledger: ${err.message}` });
    } finally {
      setKaiLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKaiLedger();
  }, [fetchKaiLedger]);

  const handleAppendKai = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatement.trim() || !newSubject.trim()) return;

    setKaiLoading(true);
    setKaiMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/kai/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distinction: newDistinction,
          statement: newStatement.trim(),
          subject: newSubject.trim(),
          source: 'web:TransitionProvenancePanel',
          author: 'operator',
          evidenceRef: newEvidenceRef.trim() || undefined,
          policyOrAuthority: 'CONSTITUTION §13',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.detail || data.error || 'Failed to append KAI record');
      }
      setKaiMessage({ type: 'ok', text: `✓ Appended record #${data.record.index} [${data.record.distinction}]` });
      setNewStatement('');
      await fetchKaiLedger();
    } catch (err: any) {
      setKaiMessage({ type: 'err', text: err.message });
    } finally {
      setKaiLoading(false);
    }
  };

  const handleVerifyInference = async (record: KaiRecord) => {
    setKaiLoading(true);
    setKaiMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/kai/verify-inference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inferredRecordId: record.id,
          evidenceRef: `verified-via-ui:${Date.now()}`,
          statement: `Verified hypothesis: ${record.statement}`,
          author: 'operator:verifier',
          policyOrAuthority: 'CONSTITUTION §13',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.detail || data.error || 'Verification failed');
      }
      setKaiMessage({ type: 'ok', text: `✓ Verified inference into record #${data.record.index}` });
      await fetchKaiLedger();
    } catch (err: any) {
      setKaiMessage({ type: 'err', text: err.message });
    } finally {
      setKaiLoading(false);
    }
  };

  const filteredKaiRecords = kaiRecords.filter((r) => {
    if (kaiFilter === 'ALL') return true;
    return r.distinction === kaiFilter;
  });

  return (
    <section
      aria-label="Transition provenance and KAI memory surface"
      style={{
        background: '#07121b',
        border: '1px solid #38bdf844',
        borderRadius: '8px',
        padding: '18px',
        marginBottom: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Header and Tab Selection */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ color: '#38bdf8', fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.05em' }}>
            🧠 KAI MEMORY & TRANSITION PROVENANCE
          </div>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '3px' }}>
            Constitution §13 · Append-only SHA-256 hash chain · Non-conversion invariant
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { setActiveTab('kai'); fetchKaiLedger(); }}
            style={{
              background: activeTab === 'kai' ? '#0284c7' : '#0a1d2e',
              color: activeTab === 'kai' ? '#ffffff' : '#38bdf8',
              border: '1px solid #38bdf866',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            🧠 KAI CONTINUITY ({kaiRecords.length})
          </button>
          <button
            onClick={() => { setActiveTab('commands'); fetchCommands(); }}
            style={{
              background: activeTab === 'commands' ? '#0284c7' : '#0a1d2e',
              color: activeTab === 'commands' ? '#ffffff' : '#38bdf8',
              border: '1px solid #38bdf866',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            🔗 COMMAND LEDGER ({commands.length})
          </button>
        </div>
      </div>

      {/* KAI CONTINUITY TAB */}
      {activeTab === 'kai' && (
        <div>
          {/* Integrity Banner */}
          <div
            style={{
              background: 'linear-gradient(90deg, rgba(8, 47, 73, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)',
              border: '1px solid #0284c744',
              borderRadius: '6px',
              padding: '10px 14px',
              marginBottom: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  background: kaiIntegrity?.valid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: kaiIntegrity?.valid ? '#34d399' : '#f87171',
                  border: `1px solid ${kaiIntegrity?.valid ? '#10b98188' : '#ef444488'}`,
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontWeight: 'bold',
                }}
              >
                {kaiIntegrity?.valid ? '✓ HASH-CHAIN INTEGRITY: PRISTINE' : '⚠ INTEGRITY DIVERGENT'}
              </span>
              <span style={{ color: '#94a3b8' }}>
                Tip: <code style={{ color: '#38bdf8' }}>{kaiIntegrity?.tipHash.substring(0, 16)}...</code>
              </span>
            </div>
            <button
              onClick={fetchKaiLedger}
              disabled={kaiLoading}
              style={{
                background: '#082f49',
                color: '#38bdf8',
                border: '1px solid #38bdf844',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '10px',
                cursor: kaiLoading ? 'wait' : 'pointer',
              }}
            >
              {kaiLoading ? 'VERIFYING...' : '↻ VERIFY CHAIN'}
            </button>
          </div>

          {/* Feedback message */}
          {kaiMessage && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                marginBottom: '12px',
                fontSize: '11px',
                background: kaiMessage.type === 'ok' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${kaiMessage.type === 'ok' ? '#10b98144' : '#ef444444'}`,
                color: kaiMessage.type === 'ok' ? '#34d399' : '#fca5a5',
              }}
            >
              {kaiMessage.text}
            </div>
          )}

          {/* Append Form */}
          <form
            onSubmit={handleAppendKai}
            style={{
              background: '#03080d',
              border: '1px solid #1e293b',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <select
                value={newDistinction}
                onChange={(e) => setNewDistinction(e.target.value)}
                style={{
                  background: '#07121b',
                  color: DISTINCTION_COLORS[newDistinction] || '#38bdf8',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}
              >
                {Object.keys(DISTINCTION_COLORS).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Subject (e.g. system:runtime, user:goal)"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                style={{
                  background: '#07121b',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  flex: '1 1 180px',
                }}
              />

              <input
                type="text"
                placeholder="Evidence Ref (required for verified claims)"
                value={newEvidenceRef}
                onChange={(e) => setNewEvidenceRef(e.target.value)}
                style={{
                  background: '#07121b',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  flex: '1 1 200px',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Record statement (continuity, observation, or proposition)..."
                value={newStatement}
                onChange={(e) => setNewStatement(e.target.value)}
                style={{
                  background: '#07121b',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  flex: 1,
                }}
              />
              <button
                type="submit"
                disabled={kaiLoading || !newStatement.trim()}
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: kaiLoading ? 'wait' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                + APPEND KAI RECORD
              </button>
            </div>
          </form>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <button
              onClick={() => setKaiFilter('ALL')}
              style={{
                background: kaiFilter === 'ALL' ? '#38bdf8' : '#0a1d2e',
                color: kaiFilter === 'ALL' ? '#000' : '#94a3b8',
                border: '1px solid #38bdf844',
                borderRadius: '12px',
                padding: '2px 10px',
                fontSize: '10px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              ALL ({kaiRecords.length})
            </button>
            {Object.keys(DISTINCTION_COLORS).map((dist) => {
              const count = kaiIntegrity?.distinctions[dist] || 0;
              if (count === 0 && kaiFilter !== dist) return null;
              const color = DISTINCTION_COLORS[dist];
              return (
                <button
                  key={dist}
                  onClick={() => setKaiFilter(dist)}
                  style={{
                    background: kaiFilter === dist ? color : '#0a1d2e',
                    color: kaiFilter === dist ? '#000' : color,
                    border: `1px solid ${color}66`,
                    borderRadius: '12px',
                    padding: '2px 10px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  {dist} ({count})
                </button>
              );
            })}
          </div>

          {/* Records Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
            {filteredKaiRecords.map((r) => {
              const color = DISTINCTION_COLORS[r.distinction] || '#94a3b8';
              return (
                <div
                  key={r.id}
                  style={{
                    background: '#03080d',
                    border: `1px solid ${color}33`,
                    borderRadius: '6px',
                    padding: '10px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span
                        style={{
                          background: `${color}20`,
                          color,
                          border: `1px solid ${color}55`,
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '9px',
                          fontWeight: 'bold',
                        }}
                      >
                        #{r.index} {r.distinction}
                      </span>
                      <span style={{ color: '#38bdf8', fontSize: '11px', fontFamily: 'monospace' }}>
                        {r.subject}
                      </span>
                    </div>
                    <span style={{ color: '#475569', fontSize: '10px' }}>
                      {new Date(r.timestamp).toLocaleTimeString()} · by {r.author}
                    </span>
                  </div>

                  <div style={{ color: '#e2e8f0', fontSize: '12px', lineHeight: '1.4' }}>
                    {r.statement}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: '#64748b' }}>
                    <div>
                      {r.evidenceRef && (
                        <span style={{ color: '#10b981', marginRight: '8px' }}>
                          Evidence: {r.evidenceRef}
                        </span>
                      )}
                      <span>Prev: {r.previousHash.substring(0, 10)}... ➔ Hash: {r.hash.substring(0, 10)}...</span>
                    </div>

                    {r.distinction === 'INFERRED' && (
                      <button
                        onClick={() => handleVerifyInference(r)}
                        style={{
                          background: '#064e3b',
                          color: '#34d399',
                          border: '1px solid #059669',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          fontSize: '9px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                        }}
                      >
                        ✓ VERIFY INFERENCE
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredKaiRecords.length === 0 && (
              <div style={{ color: '#475569', fontSize: '11px', textAlign: 'center', padding: '24px' }}>
                No records match distinction filter '{kaiFilter}'.
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMMAND LEDGER TAB */}
      {activeTab === 'commands' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ color: '#94a3b8', fontSize: '11px' }}>
              Bounded transition lineage · state + causality + justification + consequence
            </div>
            <button
              onClick={fetchCommands}
              disabled={loading}
              style={{
                background: '#0a1d2e',
                color: '#38bdf8',
                border: '1px solid #38bdf855',
                borderRadius: '4px',
                padding: '6px 12px',
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
                  const current = selected.status === stage;
                  const color = current ? '#38bdf8' : reached ? '#00ff66' : '#334155';
                  return (
                    <React.Fragment key={stage}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '3px',
                        background: current ? '#38bdf822' : reached ? '#00ff6611' : '#03080d',
                        border: `1px solid ${color}44`, color, fontWeight: current ? 'bold' : 'normal',
                      }}>
                        {reached ? '✓ ' : ''}{stage}
                      </span>
                      {i < TRANSITION_FLOW.length - 1 && <span style={{ color: '#334155' }}>→</span>}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Provenance Fields Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '14px' }}>
                <ProvenanceField label="INTENT" value={selected.intent} color="#38bdf8" />
                <ProvenanceField label="REQUESTED BY" value={selected.requestedBy} color="#94a3b8" />
                <ProvenanceField label="WORKERS" value={selected.workers?.join(', ') || 'none'} color="#a78bfa" />
                <ProvenanceField label="DECISION" value={selected.change?.decision ?? 'N/A'} color="#38bdf8" />
                <ProvenanceField label="AUTHORITY" value={selected.change?.authority ?? 'N/A'} color="#facc15" />
                <ProvenanceField label="POLICY" value={selected.change?.policy ?? 'N/A'} color="#facc15" />
                <ProvenanceField label="STATE AFTER" value={selected.execution?.stateAfter ?? 'N/A'} color="#6ee7b7" />
                <ProvenanceField label="ATTESTATION ID" value={selected.execution?.attestationId ?? 'N/A'} color="#00ff66" />
                <ProvenanceField label="REALITY STATUS" value={selected.reality?.classification ?? 'N/A'} color={STATUS_COLORS[selected.reality?.classification ?? ''] ?? '#94a3b8'} />
              </div>

              {/* Lineage Event Timeline */}
              <div style={{ background: '#03080d', border: '1px solid #1e293b', borderRadius: '4px', padding: '10px 12px' }}>
                <div style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold', marginBottom: '6px' }}>
                  LINEAGE EVENTS ({selected.lineage.length})
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
              No commands yet. Propose a bounded command to populate the transition provenance ledger.
            </div>
          )}
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
