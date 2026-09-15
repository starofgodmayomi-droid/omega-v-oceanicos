import { createHash, timingSafeEqual } from 'node:crypto';
import type { Attestation } from '@oceanicos/types';

export const constantTimeTokenMatch = (supplied: string, expected: string): boolean => {
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return (
    suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes)
  );
};

export const AUTH_MODE_ENV = 'OMEGA_AUTH_MODE';
export type ApiAuthMode = 'local' | 'required';

export const parseAuthMode = (value?: string): ApiAuthMode => {
  const normalized = value?.trim() || 'local';
  if (normalized !== 'local' && normalized !== 'required') {
    throw new Error(
      `${AUTH_MODE_ENV} must be "local" or "required", received ${JSON.stringify(value)}`
    );
  }
  return normalized;
};

export const missingRequiredAuthTokens = (
  mode: ApiAuthMode,
  readToken?: string,
  adminToken?: string
): string[] =>
  mode === 'required'
    ? [
        !readToken?.trim() ? 'OMEGA_READ_TOKEN' : null,
        !adminToken?.trim() ? 'OMEGA_ADMIN_TOKEN' : null,
      ].filter((name): name is string => name !== null)
    : [];

export const invalidRequiredAuthTokenConfiguration = (
  mode: ApiAuthMode,
  readToken?: string,
  adminToken?: string
): string | null => {
  const normalizedReadToken = readToken?.trim();
  const normalizedAdminToken = adminToken?.trim();
  if (
    mode === 'required' &&
    normalizedReadToken &&
    normalizedAdminToken &&
    normalizedReadToken === normalizedAdminToken
  ) {
    return 'OMEGA_READ_TOKEN and OMEGA_ADMIN_TOKEN must be distinct';
  }
  return null;
};

export type RuntimeEvent = {
  id: string;
  type: string;
  stage?: string;
  status: 'active' | 'passed' | 'failed';
  timestamp: string;
  data?: unknown;
};

export type CompletedRun = {
  id: string;
  observationId: string;
  verificationId: string;
  attestation?: Attestation;
  passed: boolean;
  timestamp: string;
};

export type AuditQuery = {
  type?: string;
  stage?: string;
  status?: RuntimeEvent['status'];
  from?: string;
  to?: string;
  limit?: number;
};

const queryValue = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export const parseAuditQuery = (
  query: Record<string, unknown>
): { query: AuditQuery } | { error: string } => {
  const type = queryValue(query.type);
  const stage = queryValue(query.stage);
  const status = queryValue(query.status) as RuntimeEvent['status'] | undefined;
  const from = queryValue(query.from);
  const to = queryValue(query.to);
  const rawLimit = queryValue(query.limit);

  if (status !== undefined && !['active', 'passed', 'failed'].includes(status)) {
    return { error: 'status must be active, passed, or failed' };
  }
  if (from !== undefined && Number.isNaN(Date.parse(from))) {
    return { error: 'from must be an ISO-8601 timestamp' };
  }
  if (to !== undefined && Number.isNaN(Date.parse(to))) {
    return { error: 'to must be an ISO-8601 timestamp' };
  }

  let limit: number | undefined;
  if (rawLimit !== undefined) {
    const parsed = parseInt(rawLimit, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 500) {
      return { error: 'limit must be between 1 and 500' };
    }
    limit = parsed;
  }

  return {
    query: {
      type,
      stage,
      status,
      from,
      to,
      limit,
    },
  };
};

export type RuntimeRevocation = {
  id: string;
  attestationId: string;
  reason: string;
  revokedBy: string;
  revokedAt: string;
};

export type RevocationIntegrityStatus = 'disabled' | 'legacy' | 'intact' | 'mismatch';

export const revocationRegistryDigest = (revocations: RuntimeRevocation[]): string =>
  `sha256:${createHash('sha256').update(JSON.stringify(revocations), 'utf8').digest('hex')}`;

export const revocationRegistryRevision = (revocations: RuntimeRevocation[]): number =>
  revocations.length;

export const revocationRegistryStatus = (
  persistenceEnabled: boolean,
  persistedDigest: string | undefined,
  currentDigest: string
): RevocationIntegrityStatus =>
  !persistenceEnabled
    ? 'disabled'
    : persistedDigest === undefined
      ? 'legacy'
      : persistedDigest === currentDigest
        ? 'intact'
        : 'mismatch';

export const ADMIN_TOKEN_ENV = 'OMEGA_ADMIN_TOKEN';
export const OPERATOR_ALLOWLIST_ENV = 'OMEGA_ADMIN_OPERATOR_ALLOWLIST';

const configuredOperatorAllowlist = (): string[] =>
  (process.env[OPERATOR_ALLOWLIST_ENV] || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

export const operatorAllowlistConfigured = (): boolean => configuredOperatorAllowlist().length > 0;
export const adminOperatorAllowlistRequired = (): boolean =>
  process.env.OMEGA_ADMIN_REQUIRE_ALLOWLIST?.trim() === 'on';

export const operatorIdentityAllowed = (
  operatorId: string | undefined,
  allowlist: string[],
  requireAllowlist = false
): boolean =>
  !(requireAllowlist && allowlist.length === 0) &&
  (allowlist.length === 0 || (operatorId !== undefined && allowlist.includes(operatorId)));

export const configuredAttestationTtlMs = (): number | null => {
  const raw = process.env.OMEGA_ATTESTATION_TTL_MS?.trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const isAttestationExpired = (
  attestation: Attestation,
  now = Date.now(),
  ttlMs = configuredAttestationTtlMs()
): boolean => {
  if (ttlMs === null) return false;
  const attestedAt = Date.parse(attestation.attestedAt);
  return !Number.isFinite(attestedAt) || now - attestedAt >= ttlMs;
};
