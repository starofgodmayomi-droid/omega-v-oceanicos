import React, { useCallback, useEffect, useMemo, useState } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

type Status = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';
type ClaimKind = 'CURRENT_HYPOTHESIS' | 'HISTORICAL_DECLARATION';
interface Entry {
  kind: 'OMEGA_VALUE_NAVIGATOR';
  claimKind: ClaimKind;
  proposalId: string;
  phase: 'PROPOSAL' | 'OBSERVATION';
  record: {
    id: string;
    subject: string;
    intent: string;
    decision: 'REVIEW';
    authorized: false;
    createdAt: string;
    provenance: { source: string; observedAt: string; lineage?: string[] };
  };
  expectedOutcome: string;
  reconciliationStatus: Status;
  verificationScope: 'hypothesis-reconciliation-only' | 'historical-declaration-reconciliation-only';
  evidenceStatus: 'STATED' | 'NOT_PROVIDED';
  observation?: { observedOutcome?: string; source?: string; evidence?: string; error?: string };
  valuePotentialHypothesis?: { kind: 'hypothesis'; score: number; basis: string; limitation: string };
  supersedesId?: string;
  sequence: number;
}

const STATUS_COLOR: Record<Status, string> = {
  VERIFIED: '#6ee7b7',
  DIVERGENT: '#fca5a5',
  UNKNOWN: '#facc15',
  NOT_EXECUTED: '#94a3b8',
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  const text = await response.text();
  let payload: any = null;
  try { payload = text ? JSON.parse(text) : null; } catch { throw new Error(`API returned invalid JSON (${response.status})`); }
  if (!response.ok) throw new Error(payload?.error || `API request failed (${response.status})`);
  return payload as T;
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: '#03080d', color: '#e2e8f0',
  border: '1px solid #334155', borderRadius: 4, padding: '8px', fontSize: 11,
};
const buttonStyle: React.CSSProperties = {
  background: '#0a1d2e', color: '#6ee7b7', border: '1px solid #6ee7b755',
  borderRadius: 4, padding: '8px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
};

export function ValueNavigatorPanel() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState('');
  const [subject, setSubject] = useState('');
  const [claimKind, setClaimKind] = useState<ClaimKind>('CURRENT_HYPOTHESIS');
  const [intent, setIntent] = useState('');
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [evidence, setEvidence] = useState('');
  const [score, setScore] = useState('');
  const [observedOutcome, setObservedOutcome] = useState('');
  const [observationSource, setObservationSource] = useState('');
  const [observationEvidence, setObservationEvidence] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const proposals = useMemo(() => entries.filter((entry) => entry.phase === 'PROPOSAL'), [entries]);
  const selectedProposal = proposals.find((entry) => entry.proposalId === selectedProposalId) ?? proposals[0];

  const refresh = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const data = await request<{ success: true; entries: Entry[] }>('/v1/value-navigator/proposals');
      setEntries(data.entries);
      if (!selectedProposalId && data.entries.length) setSelectedProposalId(data.entries.find((entry) => entry.phase === 'PROPOSAL')?.proposalId ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Value Navigator records unavailable');
    } finally {
      setBusy(false);
    }
  }, [selectedProposalId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const submitProposal = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const payload: Record<string, unknown> = {
        claimKind, subject: subject.trim(), intent: intent.trim(), stateBefore: 'proposal', expectedOutcome: expectedOutcome.trim(),
      };
      if (beneficiary.trim()) payload.beneficiary = beneficiary.trim();
      const evidenceRefs = evidence.split('\n').map((line) => line.trim()).filter(Boolean);
      if (evidenceRefs.length) payload.evidence = evidenceRefs;
      if (score.trim()) payload.valuePotentialScore = Number(score);
      if (score.trim()) payload.valuePotentialBasis = 'operator-entered prioritization hypothesis';
      const data = await request<{ success: true; entry: Entry }>('/v1/value-navigator/proposals', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
      });
      setSelectedProposalId(data.entry.proposalId);
      setSubject(''); setClaimKind('CURRENT_HYPOTHESIS'); setIntent(''); setExpectedOutcome(''); setBeneficiary(''); setEvidence(''); setScore('');
      await refresh();
      setNotice('Proposal appended as REVIEW / unauthorized. No external action was performed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proposal was not recorded');
    } finally { setBusy(false); }
  };

  const appendObservation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProposal) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const payload: Record<string, unknown> = {};
      if (observedOutcome.trim()) payload.observedOutcome = observedOutcome.trim();
      if (observationSource.trim()) payload.source = observationSource.trim();
      if (observationEvidence.trim()) payload.evidence = observationEvidence.trim();
      if (!observedOutcome.trim() || !observationSource.trim() || !observationEvidence.trim()) {
        payload.error = 'Observation incomplete; preserve UNKNOWN';
      }
      const data = await request<{ success: true; entry: Entry }>(
        `/v1/value-navigator/proposals/${encodeURIComponent(selectedProposal.proposalId)}/observe`,
        { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) },
      );
      setObservedOutcome(''); setObservationSource(''); setObservationEvidence('');
      await refresh();
      setNotice(`Observation appended: ${data.entry.reconciliationStatus}. A match only reconciles the submitted hypothesis; it is not proof of demand or earnings.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Observation was not recorded');
    } finally { setBusy(false); }
  };

  return (
    <section aria-label="Value Navigator proposal and observation" style={{ background: '#07121b', border: '1px solid #38bdf844', borderRadius: 6, padding: 16, marginBottom: 20 }}>
      <header style={{ marginBottom: 12 }}>
        <div style={{ color: '#38bdf8', fontSize: 13, fontWeight: 700 }}>VALUE NAVIGATOR — PROPOSAL / OBSERVATION / RECONCILIATION</div>
        <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>
          Local append-only change records · proposals always REVIEW / unauthorized · no network, shell, outreach, spending, or execution
        </div>
      </header>
      {error && <div role="alert" style={{ color: '#fca5a5', fontSize: 11, marginBottom: 8 }}>{error}</div>}
      {notice && <div role="status" style={{ color: '#6ee7b7', fontSize: 11, marginBottom: 8 }}>{notice}</div>}

      <form onSubmit={submitProposal} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 16 }}>
        <label style={{ color: '#cbd5e1', fontSize: 10 }}>Claim kind<select aria-label="Claim kind" value={claimKind} onChange={(e) => setClaimKind(e.target.value as ClaimKind)} style={{ ...inputStyle, display: 'block', marginTop: 4 }}><option value="CURRENT_HYPOTHESIS">Current hypothesis</option><option value="HISTORICAL_DECLARATION">Historical declaration</option></select></label>
        <label style={{ color: '#cbd5e1', fontSize: 10 }}>Need / subject<input required value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={2000} style={{ ...inputStyle, display: 'block', marginTop: 4 }} /></label>
        <label style={{ color: '#cbd5e1', fontSize: 10 }}>Intent<input required value={intent} onChange={(e) => setIntent(e.target.value)} maxLength={2000} style={{ ...inputStyle, display: 'block', marginTop: 4 }} /></label>
        <label style={{ color: '#cbd5e1', fontSize: 10 }}>Expected outcome (hypothesis)<input required value={expectedOutcome} onChange={(e) => setExpectedOutcome(e.target.value)} maxLength={2000} style={{ ...inputStyle, display: 'block', marginTop: 4 }} /></label>
        <label style={{ color: '#cbd5e1', fontSize: 10 }}>Beneficiary (optional)<input value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} maxLength={2000} style={{ ...inputStyle, display: 'block', marginTop: 4 }} /></label>
        <label style={{ color: '#cbd5e1', fontSize: 10 }}>Stated evidence references (one per line)<textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} rows={2} style={{ ...inputStyle, display: 'block', marginTop: 4 }} /></label>
        <label style={{ color: '#cbd5e1', fontSize: 10 }}>Value-potential prioritization hypothesis (0–100; not demand/revenue)<input type="number" min="0" max="100" step="any" value={score} onChange={(e) => setScore(e.target.value)} style={{ ...inputStyle, display: 'block', marginTop: 4 }} /></label>
        <div style={{ display: 'flex', alignItems: 'end' }}><button type="submit" disabled={busy} style={buttonStyle}>APPEND PROPOSAL · REVIEW ONLY</button></div>
      </form>

      <div style={{ borderTop: '1px solid #334155', paddingTop: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
          <strong style={{ color: '#e2e8f0', fontSize: 11 }}>Observe a proposal</strong>
          <select aria-label="Select proposal" value={selectedProposal?.proposalId ?? ''} onChange={(e) => setSelectedProposalId(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 220 }}>
            {proposals.map((item) => <option key={item.proposalId} value={item.proposalId}>{item.record.subject} · {item.proposalId.slice(-8)}</option>)}
          </select>
          <button type="button" disabled={busy} onClick={() => void refresh()} style={buttonStyle}>{busy ? 'LOADING…' : 'REFRESH RECORDS'}</button>
        </div>
        {selectedProposal ? (
          <form onSubmit={appendObservation} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
            <label style={{ color: '#cbd5e1', fontSize: 10 }}>Observed outcome (leave blank to record UNKNOWN)<input value={observedOutcome} onChange={(e) => setObservedOutcome(e.target.value)} maxLength={2000} style={{ ...inputStyle, display: 'block', marginTop: 4 }} /></label>
            <label style={{ color: '#cbd5e1', fontSize: 10 }}>Observation source<input value={observationSource} onChange={(e) => setObservationSource(e.target.value)} maxLength={2000} style={{ ...inputStyle, display: 'block', marginTop: 4 }} /></label>
            <label style={{ color: '#cbd5e1', fontSize: 10 }}>Evidence for this observation<textarea value={observationEvidence} onChange={(e) => setObservationEvidence(e.target.value)} rows={2} style={{ ...inputStyle, display: 'block', marginTop: 4 }} /></label>
            <div style={{ display: 'flex', alignItems: 'end' }}><button disabled={busy} type="submit" style={buttonStyle}>APPEND OBSERVATION</button></div>
          </form>
        ) : <div style={{ color: '#64748b', fontSize: 11 }}>No proposals recorded yet.</div>}
      </div>

      <div style={{ marginTop: 14, display: 'grid', gap: 7 }}>
        {entries.slice().reverse().map((entry) => (
          <article key={`${entry.sequence}:${entry.record.id}`} style={{ background: '#03080d', border: '1px solid #334155', borderRadius: 4, padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ color: '#e2e8f0', fontSize: 11 }}>{entry.record.subject} · {entry.claimKind === 'HISTORICAL_DECLARATION' ? 'HISTORICAL DECLARATION' : entry.phase}</strong>
              <span style={{ color: STATUS_COLOR[entry.reconciliationStatus], fontSize: 10, fontWeight: 700 }}>{entry.reconciliationStatus} · decision {entry.record.decision} · authorized {String(entry.record.authorized)}</span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 5 }}>Expected: {entry.expectedOutcome}{entry.observation?.observedOutcome ? ` · Observed: ${entry.observation.observedOutcome}` : ''}</div>
            {entry.valuePotentialHypothesis && <div style={{ color: '#facc15', fontSize: 10, marginTop: 4 }}>Value-potential hypothesis: {entry.valuePotentialHypothesis.score}/100 — {entry.valuePotentialHypothesis.limitation}</div>}
            <div style={{ color: '#64748b', fontSize: 9, marginTop: 4 }}>scope: {entry.verificationScope} · {entry.record.provenance.source} · append #{entry.sequence}{entry.supersedesId ? ` · supersedes ${entry.supersedesId}` : ''}</div>
          </article>
        ))}
      </div>
      <footer style={{ color: '#64748b', fontSize: 9, marginTop: 10 }}>
        A VERIFIED label here means only that a submitted, sourced observation matches the stated outcome hypothesis. It does not attest external truth, execution, demand, value, revenue, deployment, or health.
      </footer>
    </section>
  );
}
