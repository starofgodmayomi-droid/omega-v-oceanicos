import { useCallback, useEffect, useState } from 'react';

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');
const REFRESH_MS = 20_000;

type RepoAccessPolicy = {
  operations: string[];
  defaultScope: string;
  capabilityKeyConfigured: boolean;
  authMode: string;
};

type RepoAccessAuditEntry = {
  id: string;
  occurredAt: string;
  event: string;
  subject: string;
  operation: string;
  scope: string;
  decision: string;
  reason: string;
  operator: string;
  declaredOperatorId: string | null;
  hash: string;
};

type RepoAccessDecision = {
  decision: 'ALLOW' | 'DENY';
  reason: string;
  capability: string;
  audit?: { id: string; hash: string };
};

const DEFAULT_OPERATIONS = ['repo:metadata:read', 'repo:file:read', 'repo:file:write', 'repo:merge'];

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

const decisionColor = (decision: string) => (decision === 'ALLOW' ? '#8ce8c8' : decision === 'DENY' ? '#ffc28f' : '#b6d4cd');

export function RepoAccessPanel() {
  const [policy, setPolicy] = useState<RepoAccessPolicy | null>(null);
  const [entries, setEntries] = useState<RepoAccessAuditEntry[]>([]);
  const [integrity, setIntegrity] = useState<string>('unknown');
  const [subject, setSubject] = useState('elion-agent');
  const [operation, setOperation] = useState(DEFAULT_OPERATIONS[1]);
  const [scope, setScope] = useState('');
  const [capability, setCapability] = useState('');
  const [decision, setDecision] = useState<RepoAccessDecision | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [policyData, auditData] = await Promise.all([
        request<RepoAccessPolicy & { success: boolean }>('/v1/repo/access/policy'),
        request<{ entries: RepoAccessAuditEntry[]; integrity: string }>('/v1/repo/access/audit?limit=12'),
      ]);
      setPolicy(policyData);
      setEntries(Array.isArray(auditData.entries) ? auditData.entries : []);
      setIntegrity(auditData.integrity ?? 'unknown');
      setScope((current) => current || policyData.defaultScope || '');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Repository access check failed');
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const issue = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await request<{ capability: { signature: string } & Record<string, unknown> }>('/v1/repo/access/grant', {
        method: 'POST',
        body: JSON.stringify({ subject, operation, scope }),
      });
      setCapability(JSON.stringify(data.capability, null, 2));
      setDecision(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Capability issuance failed');
    } finally {
      setBusy(false);
    }
  };

  const evaluate = async () => {
    setBusy(true);
    setError(null);
    try {
      let parsed: unknown = undefined;
      if (capability.trim()) {
        try {
          parsed = JSON.parse(capability);
        } catch {
          throw new Error('The capability is not valid JSON');
        }
      }
      const data = await request<RepoAccessDecision>('/v1/repo/access/evaluate', {
        method: 'POST',
        body: JSON.stringify({ subject, operation, scope, capability: parsed }),
      });
      setDecision(data);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Access evaluation failed');
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

  return (
    <section
      aria-label="Repository access control"
      style={{ marginBottom: '22px', border: '1px solid #24506a', borderRadius: '6px', background: 'linear-gradient(135deg, #0a141c, #0b1d1a)', padding: '16px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div>
          <div style={{ color: '#8ecdf0', fontSize: '13px', fontWeight: 700 }}>🔐 REPOSITORY ACCESS CONTROL</div>
          <div style={{ color: '#87aaa2', fontSize: '11px', marginTop: '4px' }}>
            Capability ≠ authority · every predicate must hold · evaluation never executes a repository operation
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
        <span>operations: {(policy?.operations ?? DEFAULT_OPERATIONS).length}</span>
        <span>key: {policy?.capabilityKeyConfigured ? 'configured' : 'unavailable (fail closed)'}</span>
        <span>mode: {policy?.authMode ?? 'unknown'}</span>
        <span>audit: {integrity}</span>
      </div>

      <div style={{ display: 'grid', gap: '8px', marginTop: '14px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <label style={{ color: '#87aaa2', fontSize: '10px' }}>
          SUBJECT
          <input value={subject} onChange={(event) => setSubject(event.target.value)} style={inputStyle} />
        </label>
        <label style={{ color: '#87aaa2', fontSize: '10px' }}>
          OPERATION
          <select value={operation} onChange={(event) => setOperation(event.target.value)} style={inputStyle}>
            {(policy?.operations ?? DEFAULT_OPERATIONS).map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label style={{ color: '#87aaa2', fontSize: '10px' }}>
          SCOPE
          <input value={scope} onChange={(event) => setScope(event.target.value)} style={inputStyle} />
        </label>
      </div>

      <label style={{ display: 'block', color: '#87aaa2', fontSize: '10px', marginTop: '10px' }}>
        CAPABILITY (JSON)
        <textarea
          value={capability}
          onChange={(event) => setCapability(event.target.value)}
          rows={3}
          placeholder="Issue a capability below, or paste one to evaluate"
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </label>

      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={issue}
          disabled={busy}
          style={{ border: '1px solid #4a7f9c', background: 'transparent', color: '#8ecdf0', borderRadius: '4px', padding: '6px 10px', fontSize: '10px' }}
        >
          {busy ? 'WORKING…' : 'ISSUE CAPABILITY'}
        </button>
        <button
          onClick={evaluate}
          disabled={busy}
          style={{ border: '1px solid #547b74', background: 'transparent', color: '#b6d4cd', borderRadius: '4px', padding: '6px 10px', fontSize: '10px' }}
        >
          EVALUATE ACCESS
        </button>
      </div>

      {decision && (
        <div
          style={{ marginTop: '12px', border: `1px solid ${decision.decision === 'ALLOW' ? '#285048' : '#9d6546'}`, borderRadius: '4px', background: '#0b1412', padding: '10px' }}
        >
          <div style={{ color: decisionColor(decision.decision), fontSize: '12px', fontWeight: 700 }}>
            {decision.decision} · {decision.reason}
          </div>
          <div style={{ color: '#87aaa2', font: '10px DM Mono, monospace', marginTop: '4px' }}>
            capability {decision.capability.toLowerCase()} · executed false · audit {decision.audit?.id?.slice(0, 8) ?? 'not recorded'}
          </div>
        </div>
      )}

      <div style={{ marginTop: '14px' }}>
        <div style={{ color: '#87aaa2', fontSize: '10px', letterSpacing: '0.08em' }}>AUDIT · APPEND-ONLY HASH CHAIN</div>
        {entries.length === 0 ? (
          <div style={{ color: '#547b74', font: '10px DM Mono, monospace', marginTop: '6px' }}>No access decisions recorded yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: '6px', marginTop: '8px' }}>
            {entries.slice().reverse().map((entry) => (
              <div key={entry.id} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid #16302a', paddingTop: '6px', font: '10px DM Mono, monospace', color: '#87aaa2' }}>
                <span style={{ color: decisionColor(entry.decision), minWidth: '54px' }}>{entry.decision}</span>
                <span>{entry.operation}</span>
                <span>{entry.subject || '—'}</span>
                <span style={{ color: '#547b74' }}>{entry.decision === 'DENY' ? entry.reason : entry.event.toLowerCase()}</span>
                <span style={{ marginLeft: 'auto', color: '#547b74' }}>{new Date(entry.occurredAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
