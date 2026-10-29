import React, { useCallback, useEffect, useState } from 'react';
import { theme, statusColor } from './oceanicosTheme';

/**
 * Governance evidence panel (C6 reconciliation, C7 provenance, authorization).
 *
 * Reads the live governance surfaces and lets the operator reconcile an
 * expected state against an observed one. Reconciliation is a pure comparison:
 * it does not mutate state, and UNKNOWN is never presented as VERIFIED.
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

interface ReconciliationResult {
  status: string;
  changeId: string;
  expectedState: string;
  observedState?: string;
  evidence: string;
  divergence?: string;
}

interface ProvenanceTip {
  changeId: string;
  hash: string;
  sequence: number;
}

interface GrantSummary {
  id: string;
  subject: string;
  scope: string;
  revoked: boolean;
}

async function readJson(path: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: theme.textDim,
};

const valueStyle: React.CSSProperties = {
  fontFamily: theme.fontMono,
  fontSize: '11px',
  color: theme.text,
  wordBreak: 'break-all',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: theme.surfaceDeep,
  border: `1px solid ${theme.border}`,
  borderRadius: theme.radiusSmall,
  color: theme.text,
  fontFamily: theme.fontMono,
  fontSize: '11px',
  outline: 'none',
};

export function GovernancePanel() {
  const [integrity, setIntegrity] = useState<{ integrity: boolean; length: number } | null>(null);
  const [tip, setTip] = useState<ProvenanceTip | null>(null);
  const [grants, setGrants] = useState<{ grants: GrantSummary[]; activeCount: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  const [changeId, setChangeId] = useState('');
  const [expected, setExpected] = useState('');
  const [observed, setObserved] = useState('');
  const [reconciling, setReconciling] = useState(false);
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [reconError, setReconError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setReadError(null);
    try {
      const [verifyData, tipData, grantData] = await Promise.all([
        readJson('/v1/provenance/verify'),
        readJson('/v1/provenance/tip'),
        readJson('/v1/authorization/grants'),
      ]);
      setIntegrity({ integrity: verifyData.integrity === true, length: verifyData.length ?? 0 });
      setTip(tipData.tip ?? null);
      setGrants({ grants: grantData.grants ?? [], activeCount: grantData.activeCount ?? 0 });
    } catch (err: any) {
      setReadError(err instanceof Error ? err.message : 'governance evidence unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runReconciliation = async () => {
    if (!changeId.trim() || !expected.trim()) return;
    setReconciling(true);
    setReconError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/reconciliation/reconcile`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          changeId,
          expectedState: expected,
          ...(observed.trim() ? { observedState: observed } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.reconciliation) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setResult(data.reconciliation);
    } catch (err: any) {
      setReconError(err instanceof Error ? err.message : 'reconciliation unavailable');
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div
      style={{
        marginTop: '12px',
        padding: '14px',
        borderRadius: theme.radiusSmall,
        border: `1px solid ${theme.border}`,
        background: theme.surfaceDeep,
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {/* C6 — Reconciliation */}
      <div>
        <div style={{ ...labelStyle, marginBottom: '8px' }}>C6 · Reconcile expected ↔ observed</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <input
            value={changeId}
            onChange={(e) => setChangeId(e.target.value)}
            maxLength={200}
            placeholder="change id"
            style={inputStyle}
          />
          <input
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
            maxLength={500}
            placeholder="expected state"
            style={inputStyle}
          />
          <input
            value={observed}
            onChange={(e) => setObserved(e.target.value)}
            maxLength={500}
            placeholder="observed state (leave empty if not executed)"
            style={inputStyle}
          />
          <button
            onClick={runReconciliation}
            disabled={reconciling || !changeId.trim() || !expected.trim()}
            style={{
              alignSelf: 'flex-start',
              padding: '7px 14px',
              borderRadius: theme.radiusPill,
              border: `1px solid ${theme.borderBright}`,
              background: 'transparent',
              color: theme.accent,
              fontFamily: theme.fontSans,
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              cursor: reconciling ? 'not-allowed' : 'pointer',
              opacity: reconciling || !changeId.trim() || !expected.trim() ? 0.5 : 1,
            }}
          >
            {reconciling ? 'RECONCILING…' : 'RECONCILE'}
          </button>
        </div>

        {reconError && (
          <div style={{ marginTop: '8px', fontSize: '11px', color: theme.divergent }}>
            {reconError}
          </div>
        )}

        {result && (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  padding: '2px 8px',
                  borderRadius: theme.radiusPill,
                  color: statusColor(result.status),
                  border: `1px solid ${statusColor(result.status)}55`,
                }}
              >
                {result.status}
              </span>
              <span style={{ ...valueStyle, color: theme.textMuted }}>{result.changeId}</span>
            </div>
            <div style={{ ...valueStyle, color: theme.textMuted }}>
              observed: {result.observedState ?? 'not executed'}
            </div>
            <div style={{ ...valueStyle, color: theme.textDim }}>{result.evidence}</div>
            {result.divergence && (
              <div style={{ fontSize: '11px', color: theme.divergent }}>{result.divergence}</div>
            )}
          </div>
        )}
      </div>

      <div style={{ height: '1px', background: theme.borderSubtle }} />

      {/* C7 — Provenance */}
      <div>
        <div style={{ ...labelStyle, marginBottom: '6px' }}>C7 · Provenance chain</div>
        {readError ? (
          <div style={{ fontSize: '11px', color: theme.divergent }}>{readError}</div>
        ) : loading && !integrity ? (
          <div style={{ ...valueStyle, color: theme.textMuted }}>reading…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  color: integrity?.integrity ? theme.verified : theme.divergent,
                }}
              >
                {integrity?.integrity ? 'INTACT' : 'BROKEN'}
              </span>
              <span style={{ ...valueStyle, color: theme.textMuted }}>
                {integrity?.length ?? 0} entries
              </span>
            </div>
            <div style={{ ...valueStyle, color: theme.textMuted }}>
              tip: {tip ? `${tip.changeId} · seq ${tip.sequence}` : 'none'}
            </div>
            {tip && <div style={{ ...valueStyle, color: theme.textDim }}>{tip.hash}</div>}
          </div>
        )}
      </div>

      <div style={{ height: '1px', background: theme.borderSubtle }} />

      {/* Authorization */}
      <div>
        <div style={{ ...labelStyle, marginBottom: '6px' }}>Authority · grants</div>
        {readError ? (
          <div style={{ fontSize: '11px', color: theme.divergent }}>{readError}</div>
        ) : loading && !grants ? (
          <div style={{ ...valueStyle, color: theme.textMuted }}>reading…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ ...valueStyle, color: theme.textMuted }}>
              {grants?.activeCount ?? 0} active of {grants?.grants.length ?? 0}
            </div>
            {(grants?.grants ?? []).slice(0, 4).map((grant) => (
              <div key={grant.id} style={{ ...valueStyle, color: theme.textDim }}>
                {grant.revoked ? 'revoked' : 'active'} · {grant.subject} · {grant.scope}
              </div>
            ))}
          </div>
        )}
        <button
          onClick={refresh}
          disabled={loading}
          style={{
            marginTop: '8px',
            padding: '5px 12px',
            borderRadius: theme.radiusPill,
            border: `1px solid ${theme.border}`,
            background: 'transparent',
            color: theme.textMuted,
            fontFamily: theme.fontSans,
            fontSize: '10px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          REFRESH EVIDENCE
        </button>
      </div>
    </div>
  );
}
