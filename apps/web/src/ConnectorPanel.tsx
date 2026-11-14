import React, { useEffect, useRef, useState } from 'react';
import { apiFetch } from './api-client';

const API_BASE_URL = (import.meta.env?.VITE_API_URL ?? '/api').replace(/\/$/, '');

export interface ConnectorAuth {
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string>;
}

type Status = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

interface Observation {
  status: Status;
  authorized: boolean;
  executed: boolean;
  observed: boolean;
  expectedObservation: string;
  actualObservation?: string;
  evidence: string;
  issues: string[];
  observedAt: string;
  admission: { decision: string; admitted: boolean };
}

interface ObservationJournalEntry {
  connectorId: string;
  sequence: number;
  observation: Observation;
}

interface ConnectorApproval {
  id: string;
  expiresAt: number;
}

const STATUSES: Status[] = ['VERIFIED', 'DIVERGENT', 'UNKNOWN', 'NOT_EXECUTED'];

const CONNECTOR = {
  id: 'github.read-repository',
  version: '1.0.0',
  system: 'github',
  capability: 'read repository metadata',
  authRef: 'secret-ref:github-readonly',
  scope: ['repo:starofgodmayomi-droid/omega-v-oceanicos'],
  mode: 'read-only',
  policyRefs: ['policy:connector-read.v1'],
  stopCondition: 'stop after one bounded repository read',
  expectedObservation: 'github:starofgodmayomi-droid/omega-v-oceanicos:metadata',
  timeoutMs: 5000,
  maxAttempts: 1,
  rollbackSupported: false,
};

const STATUS_COLOR: Record<Status, string> = {
  VERIFIED: '#6ee7b7',
  DIVERGENT: '#fca5a5',
  UNKNOWN: '#facc15',
  NOT_EXECUTED: '#94a3b8',
};

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: string;
  json?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isApprovalResponse(value: unknown): value is { approval: ConnectorApproval } {
  if (!isRecord(value) || !isRecord(value.approval)) return false;
  return (
    typeof value.approval.id === 'string' &&
    typeof value.approval.expiresAt === 'number' &&
    Number.isFinite(value.approval.expiresAt)
  );
}

function isObservation(value: unknown): value is Observation {
  if (!isRecord(value) || !isRecord(value.admission)) return false;
  return (
    typeof value.status === 'string' &&
    STATUSES.some((status) => status === value.status) &&
    typeof value.authorized === 'boolean' &&
    typeof value.executed === 'boolean' &&
    typeof value.observed === 'boolean' &&
    typeof value.expectedObservation === 'string' &&
    typeof value.evidence === 'string' &&
    Array.isArray(value.issues) &&
    typeof value.observedAt === 'string' &&
    typeof value.admission.decision === 'string' &&
    typeof value.admission.admitted === 'boolean' &&
    (value.actualObservation === undefined || typeof value.actualObservation === 'string')
  );
}

function isObservationJournalResponse(
  value: unknown,
): value is {
  success: true;
  integrity: 'verified-local-hash-chain';
  entries: ObservationJournalEntry[];
  total: number;
  truncated: boolean;
} {
  if (!isRecord(value) || value.success !== true || value.integrity !== 'verified-local-hash-chain') {
    return false;
  }
  return (
    Array.isArray(value.entries) &&
    typeof value.total === 'number' &&
    Number.isSafeInteger(value.total) &&
    value.total >= value.entries.length &&
    typeof value.truncated === 'boolean' &&
    value.truncated === (value.total > value.entries.length) &&
    value.entries.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.connectorId === 'string' &&
        typeof entry.sequence === 'number' &&
        Number.isSafeInteger(entry.sequence) &&
        entry.sequence > 0 &&
        isObservation(entry.observation),
    )
  );
}

function explainError(error: string): string {
  if (error === 'CONNECTOR_POLICY_DENIED') {
    return 'Server policy denies this connector (CONNECTOR_POLICY_DENIED). Its exact declaration must be reviewed and allowlisted before approval.';
  }
  if (error === 'CONNECTOR_APPROVER_NOT_ALLOWED') {
    return 'This signed-in Auth0 account is not the server-configured approver (CONNECTOR_APPROVER_NOT_ALLOWED).';
  }
  if (error === 'CONNECTOR_IDENTITY_INVALID') {
    return 'The API rejected the Auth0 access token (CONNECTOR_IDENTITY_INVALID). Check its issuer, audience, and signing key configuration.';
  }
  return error;
}

async function request(path: string, token: string, options: RequestOptions = {}): Promise<unknown> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (options.json) headers['Content-Type'] = 'application/json';
  const response = await apiFetch(`${API_BASE_URL}${path}`, {
    method: options.method,
    headers,
    body: options.body,
  });
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`API returned invalid JSON (${response.status})`);
  }
  if (!response.ok) {
    const apiError = isRecord(payload) && typeof payload.error === 'string' ? payload.error : undefined;
    throw new Error(apiError || `API request failed (${response.status})`);
  }
  return payload;
}

const buttonStyle: React.CSSProperties = {
  background: '#0a1d2e',
  color: '#67e8f9',
  border: '1px solid #67e8f955',
  borderRadius: 4,
  padding: '8px 12px',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
};

export function ConnectorPanel({ auth }: { auth?: ConnectorAuth }) {
  const [approval, setApproval] = useState<ConnectorApproval | null>(null);
  const [latest, setLatest] = useState<Observation | null>(null);
  const [journalState, setJournalState] = useState<
    'unloaded' | 'loading' | 'loaded' | 'incomplete' | 'error'
  >('unloaded');
  const [journalError, setJournalError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'approve' | 'observe' | 'login' | 'logout' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const getAccessTokenRef = useRef(auth?.getAccessToken);
  const hasObservedInSession = useRef(false);
  const isAuthLoading = auth?.isLoading ?? false;
  const isAuthenticated = auth?.isAuthenticated ?? false;
  getAccessTokenRef.current = auth?.getAccessToken;

  useEffect(() => {
    let cancelled = false;
    hasObservedInSession.current = false;
    setLatest(null);
    setJournalError(null);
    if (isAuthLoading || !isAuthenticated) {
      setJournalState('unloaded');
      return () => {
        cancelled = true;
      };
    }

    setJournalState('loading');
    const loadLatestObservation = async () => {
      try {
        const getAccessToken = getAccessTokenRef.current;
        if (!getAccessToken) throw new Error('Auth0 access token provider is unavailable');
        const token = await getAccessToken();
        const response = await request('/v1/omega/connectors/observations', token);
        if (!isObservationJournalResponse(response)) {
          throw new Error('API returned an invalid or unverified connector journal');
        }
        const latestEntry = response.entries
          .filter((entry) => entry.connectorId === CONNECTOR.id)
          .reduce<ObservationJournalEntry | null>(
            (latestEntry, entry) =>
              !latestEntry || entry.sequence > latestEntry.sequence ? entry : latestEntry,
            null,
          );
        if (!cancelled) {
          if (!hasObservedInSession.current) setLatest(latestEntry?.observation ?? null);
          setJournalState(!latestEntry && response.truncated ? 'incomplete' : 'loaded');
        }
      } catch (err) {
        if (!cancelled) {
          setJournalError(err instanceof Error ? err.message : 'Connector journal could not be loaded');
          setJournalState('error');
        }
      }
    };
    void loadLatestObservation();

    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, isAuthenticated]);

  const registryStatusText = latest
    ? `Last recorded result: ${latest.status} · ${latest.observedAt}`
    : !auth
      ? 'UNKNOWN · Auth0 is not configured; journal not loaded'
      : isAuthLoading
        ? 'Checking Auth0 sign-in…'
        : !isAuthenticated
          ? 'Sign in to load the last recorded observation'
          : journalState === 'loading'
            ? 'Loading last recorded observation…'
            : journalState === 'loaded'
              ? 'NOT_EXECUTED · no recorded observation'
              : journalState === 'incomplete'
                ? 'UNKNOWN · older journal entries are outside the returned window'
                : journalState === 'error'
                  ? 'UNKNOWN · last observation unavailable'
                  : 'Sign in to load the last recorded observation';
  const registryStatusColor = latest
    ? STATUS_COLOR[latest.status]
    : registryStatusText.startsWith('NOT_EXECUTED')
      ? STATUS_COLOR.NOT_EXECUTED
      : STATUS_COLOR.UNKNOWN;

  const registry = (
    <div
      aria-label="Connector registry"
      style={{ border: '1px solid #334155', borderRadius: 4, padding: 10, marginBottom: 12 }}
    >
      <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, marginBottom: 6 }}>
        DECLARED CONNECTOR · READ-ONLY
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ color: '#cbd5e1', fontSize: 11 }}>GitHub public repository metadata</strong>
        <span
          role="status"
          aria-label="Connector observation status"
          style={{ color: registryStatusColor, fontSize: 10 }}
        >
          {registryStatusText}
        </span>
      </div>
      <div style={{ color: '#64748b', fontSize: 10, marginTop: 6 }}>
        Server policy and approval are checked when requested. This declaration does not prove connectivity or service health.
      </div>
      {journalError && (
        <div role="alert" style={{ color: '#fca5a5', fontSize: 10, marginTop: 6 }}>
          Journal read failed: {journalError}
        </div>
      )}
    </div>
  );

  if (!auth) {
    return (
      <section aria-label="GitHub connector observation" style={sectionStyle}>
        <ConnectorDescription />
        {registry}
        <div style={{ color: '#facc15', fontSize: 11 }}>
          Auth0 is not configured. Set VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, and
          VITE_AUTH0_AUDIENCE to enable sign-in. Connector actions remain unavailable.
        </div>
      </section>
    );
  }

  const approve = async () => {
    setBusy('approve');
    setError(null);
    setApproval(null);
    try {
      const token = await auth.getAccessToken();
      const result = await request(
        '/v1/omega/connectors/approvals',
        token,
        { method: 'POST', json: true, body: JSON.stringify({ connector: CONNECTOR }) },
      );
      if (!isApprovalResponse(result)) throw new Error('API returned an invalid connector approval');
      setApproval(result.approval);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval was not created');
    } finally {
      setBusy(null);
    }
  };

  const observe = async () => {
    if (!approval) return;
    const approvalId = approval.id;
    setApproval(null);
    setBusy('observe');
    setError(null);
    setLatest(null);
    try {
      const token = await auth.getAccessToken();
      const result = await request('/v1/omega/connectors/observe', token, {
        method: 'POST',
        json: true,
        body: JSON.stringify({
          connector: CONNECTOR,
          approvalId,
          liveAdapter: 'github-public-repository',
        }),
      });
      if (!isObservation(result)) throw new Error('API returned an invalid connector observation');
      hasObservedInSession.current = true;
      setLatest(result);
      setJournalState('loaded');
      setJournalError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connector observation failed');
    } finally {
      setBusy(null);
    }
  };

  const signIn = async () => {
    setBusy('login');
    setError(null);
    try {
      await auth.login();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auth0 sign-in could not start');
    } finally {
      setBusy(null);
    }
  };

  const signOut = async () => {
    setBusy('logout');
    setError(null);
    setApproval(null);
    setLatest(null);
    hasObservedInSession.current = false;
    try {
      await auth.logout();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auth0 sign-out failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-label="GitHub connector observation" style={sectionStyle}>
      <ConnectorDescription />
      {registry}
      {auth.isLoading ? (
        <div role="status" style={{ color: '#94a3b8', fontSize: 11 }}>
          Checking Auth0 sign-in…
        </div>
      ) : auth.isAuthenticated ? (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {!approval && (
              <button style={buttonStyle} disabled={busy !== null} onClick={() => void approve()}>
                {busy === 'approve' ? 'APPROVING…' : 'APPROVE THIS EXACT READ'}
              </button>
            )}
            {approval && (
              <button style={buttonStyle} disabled={busy !== null} onClick={() => void observe()}>
                {busy === 'observe' ? 'RUNNING…' : 'RUN APPROVED READ'}
              </button>
            )}
            <button style={buttonStyle} disabled={busy !== null} onClick={() => void signOut()}>
              {busy === 'logout' ? 'SIGNING OUT…' : 'SIGN OUT'}
            </button>
          </div>
          {approval && (
            <div role="status" aria-label="Connector approval" style={{ color: '#6ee7b7', fontSize: 11, marginBottom: 10 }}>
              Approval ready · single use · expires {new Date(approval.expiresAt * 1000).toLocaleString()}
            </div>
          )}
          {busy === 'observe' && (
            <div role="status" style={{ color: '#94a3b8', fontSize: 11, marginBottom: 10 }}>
              Running the approved public read…
            </div>
          )}
        </>
      ) : (
        <button style={buttonStyle} disabled={busy !== null} onClick={() => void signIn()}>
          {busy === 'login' ? 'OPENING AUTH0…' : 'SIGN IN WITH AUTH0'}
        </button>
      )}
      {error && <div role="alert" style={{ color: '#fca5a5', fontSize: 11, marginTop: 8 }}>⚠ {explainError(error)}</div>}
      {latest && (
        <div role="status" aria-label="Connector observation result" style={{ fontSize: 11, color: '#cbd5e1', marginTop: 12 }}>
          <span style={{ color: STATUS_COLOR[latest.status], fontWeight: 700 }}>{latest.status}</span>
          {' · '}admitted {String(latest.admission.admitted)}
          {' · '}executed {String(latest.executed)}
          {' · '}observed {String(latest.observed)}
          {latest.actualObservation ? ` · ${latest.actualObservation}` : ''}
          <div style={{ color: '#64748b', marginTop: 4, wordBreak: 'break-all' }}>{latest.evidence}</div>
        </div>
      )}
    </section>
  );
}

function ConnectorDescription() {
  return (
    <>
      <div style={{ color: '#67e8f9', fontSize: 13, fontWeight: 'bold' }}>
        CONNECTOR — GITHUB PUBLIC READ
      </div>
      <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4, marginBottom: 12 }}>
        Review the exact connector before approving. The API checks the signed-in subject and policy;
        approval expires in five minutes and can be used once.
      </div>
      <dl style={{ color: '#cbd5e1', fontSize: 11, margin: '0 0 12px' }}>
        <dt style={{ color: '#64748b' }}>Action</dt>
        <dd style={{ margin: '2px 0 8px' }}>Read public repository metadata</dd>
        <dt style={{ color: '#64748b' }}>Target</dt>
        <dd style={{ margin: '2px 0 8px' }}>starofgodmayomi-droid/omega-v-oceanicos</dd>
        <dt style={{ color: '#64748b' }}>Limits</dt>
        <dd style={{ margin: '2px 0 0' }}>Read-only · one attempt · 5-second timeout · no writes</dd>
      </dl>
    </>
  );
}

const sectionStyle: React.CSSProperties = {
  background: '#07121b',
  border: '1px solid #67e8f944',
  borderRadius: 6,
  padding: 16,
  marginBottom: 20,
};
