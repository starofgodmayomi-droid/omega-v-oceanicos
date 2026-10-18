import { useEffect, useState } from 'react';
import { theme } from './oceanicosTheme';

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

type ReadState<T> =
  | { status: 'loading' }
  | { status: 'available'; data: T }
  | { status: 'access-denied' }
  | { status: 'unavailable' };

type AttestationPolicy = {
  authMode?: string;
  revocationEnabled?: boolean;
  revocationRevision?: number;
  revocationConsistency?: string;
  attestationAlgorithm?: string;
};

type RevocationRecord = {
  id?: string;
  attestationId?: string;
  reason?: string;
  revokedBy?: string;
  revokedAt?: string;
};

type RevocationLedger = {
  data: RevocationRecord[];
  meta?: {
    integrity?: string;
    revision?: number;
    consistency?: string;
    verified?: boolean;
  };
};

async function readEndpoint<T>(
  path: string,
  parsePayload: (value: any) => T | null,
): Promise<ReadState<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`);
    if (response.status === 401 || response.status === 403) return { status: 'access-denied' };
    if (!response.ok) return { status: 'unavailable' };
    const payload = await response.json();
    const data = parsePayload(payload);
    return data === null ? { status: 'unavailable' } : { status: 'available', data };
  } catch {
    return { status: 'unavailable' };
  }
}

const parsePolicy = (payload: any): AttestationPolicy | null =>
  payload?.success === true && payload.policy && typeof payload.policy === 'object'
    ? payload.policy as AttestationPolicy
    : null;

const parseLedger = (payload: any): RevocationLedger | null =>
  payload?.success === true && Array.isArray(payload.data)
    ? { data: payload.data, meta: payload.meta && typeof payload.meta === 'object' ? payload.meta : undefined }
    : null;

function flag(value?: boolean): string {
  if (value === true) return 'enabled';
  if (value === false) return 'disabled';
  return 'UNKNOWN — not supplied by API';
}

function stateMessage(status: ReadState<unknown>['status']): string | null {
  if (status === 'loading') return 'Loading API-reported evidence…';
  if (status === 'access-denied') {
    return 'Read access unavailable. The API did not authorize this request; no evidence is inferred.';
  }
  if (status === 'unavailable') return 'Evidence unavailable. No policy or ledger state is inferred.';
  return null;
}

export function AttestationTrustPanel() {
  const [policy, setPolicy] = useState<ReadState<AttestationPolicy>>({ status: 'loading' });
  const [ledger, setLedger] = useState<ReadState<RevocationLedger>>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    void Promise.all([
      readEndpoint('/attest/policy', parsePolicy),
      readEndpoint('/attest/revocations', parseLedger),
    ]).then(([nextPolicy, nextLedger]) => {
      if (!active) return;
      setPolicy(nextPolicy);
      setLedger(nextLedger);
    });
    return () => { active = false; };
  }, []);

  return (
    <section
      role="region"
      aria-label="Attestation policy and revocation evidence"
      style={{
        padding: '18px 22px',
        fontFamily: theme.fontSans,
        background: theme.surface,
        borderTop: `1px solid ${theme.border}`,
      }}
    >
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: theme.accent }}>
          Attestation trust & revocation evidence
        </div>
        <div style={{ fontSize: '11px', lineHeight: 1.5, color: theme.textDim, marginTop: '3px' }}>
          Read-only view of protected API responses. API-reported values are not independent cryptographic validation.
        </div>
      </div>

      <div
        role="group"
        aria-label="API-reported attestation policy"
        style={{ padding: '12px 14px', border: `1px solid ${theme.border}`, borderRadius: theme.radiusSmall, marginBottom: '10px' }}
      >
        <div style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, marginBottom: '7px' }}>
          Policy
        </div>
        {policy.status === 'available' ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', fontSize: '11px', color: theme.text }}>
            <span>Attestation algorithm: {policy.data.attestationAlgorithm ?? 'UNKNOWN — not supplied by API'}</span>
            <span>Auth mode: {policy.data.authMode ?? 'UNKNOWN — not supplied by API'}</span>
            <span>Revocation enabled: {flag(policy.data.revocationEnabled)}</span>
            <span>Revocation revision: {policy.data.revocationRevision ?? 'UNKNOWN — not supplied by API'}</span>
            <span>Consistency: {policy.data.revocationConsistency ?? 'UNKNOWN — not supplied by API'}</span>
          </div>
        ) : (
          <div role="status" style={{ fontSize: '11px', lineHeight: 1.5, color: policy.status === 'access-denied' ? theme.warning : theme.textDim }}>
            {stateMessage(policy.status)}
          </div>
        )}
      </div>

      <div role="group" aria-label="API-reported revocation ledger" style={{ padding: '12px 14px', border: `1px solid ${theme.border}`, borderRadius: theme.radiusSmall }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: theme.textMuted, marginBottom: '7px' }}>
          Revocation ledger
        </div>
        {ledger.status === 'available' ? (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', fontSize: '11px', color: theme.text }}>
              <span>API-reported ledger integrity: {ledger.data.meta?.integrity ?? 'UNKNOWN — not supplied by API'}</span>
              <span>Revision: {ledger.data.meta?.revision ?? 'UNKNOWN — not supplied by API'}</span>
              <span>Consistency: {ledger.data.meta?.consistency ?? 'UNKNOWN — not supplied by API'}</span>
              <span>Durable-store flag: {ledger.data.meta?.verified === true ? 'configured' : ledger.data.meta?.verified === false ? 'not configured' : 'UNKNOWN — not supplied by API'}</span>
            </div>
            {ledger.data.data.length === 0 ? (
              <div style={{ fontSize: '11px', color: theme.textDim, marginTop: '8px' }}>No revocation records returned by the API.</div>
            ) : (
              <ul style={{ margin: '8px 0 0', paddingLeft: '18px', color: theme.textDim, fontSize: '11px', lineHeight: 1.6 }}>
                {ledger.data.data.map((record, index) => (
                  <li key={record.id ?? `${record.attestationId ?? 'unknown'}-${index}`}>
                    Attestation {record.attestationId ?? 'UNKNOWN ID'} — reason: {record.reason ?? 'UNKNOWN reason'}; revoked by {record.revokedBy ?? 'UNKNOWN actor'}; time {record.revokedAt ?? 'UNKNOWN timestamp'}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div role="status" style={{ fontSize: '11px', lineHeight: 1.5, color: ledger.status === 'access-denied' ? theme.warning : theme.textDim }}>
            {stateMessage(ledger.status)}
          </div>
        )}
      </div>
    </section>
  );
}