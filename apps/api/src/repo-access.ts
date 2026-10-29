/**
 * Ω∞v Repository Access Control — capability ≠ authority.
 *
 * A repository operation is admitted only when every independent predicate
 * holds; the first failing predicate is the recorded reason:
 *
 *   registered(op) ∧ key(available) ∧ capability(present) ∧ signature(valid)
 *   ∧ notExpired ∧ subject(==) ∧ operation(==) ∧ scope(==)
 *
 * Fail-closed: an absent key, an unparsable capability, or an unknown
 * operation denies. Evaluation never executes a repository operation — it only
 * records the decision in a hash-chained local audit journal.
 */
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { FastifyInstance } from 'fastify';

export const REPO_ACCESS_CONTRACT = 'omega-repo-access.v1';
export const REPO_ACCESS_OPERATIONS = [
  'repo:metadata:read',
  'repo:file:read',
  'repo:file:write',
  'repo:merge',
] as const;

export type RepoAccessOperation = (typeof REPO_ACCESS_OPERATIONS)[number];

export const isRepoAccessOperation = (value: unknown): value is RepoAccessOperation =>
  typeof value === 'string' && (REPO_ACCESS_OPERATIONS as readonly string[]).includes(value);

export interface RepoAccessCapability {
  subject: string;
  operation: RepoAccessOperation;
  scope: string;
  expiresAt: string;
  signature: string;
}

export type RepoAccessDenyReason =
  | 'OPERATION_NOT_REGISTERED'
  | 'CAPABILITY_KEY_UNAVAILABLE'
  | 'CAPABILITY_REQUIRED'
  | 'CAPABILITY_INVALID'
  | 'CAPABILITY_EXPIRED'
  | 'SUBJECT_MISMATCH'
  | 'OPERATION_MISMATCH'
  | 'SCOPE_MISMATCH';

export type RepoAccessCapabilityStatus = 'VERIFIED' | 'ABSENT' | 'INVALID';

export interface RepoAccessDecision {
  decision: 'ALLOW' | 'DENY';
  reason: 'CAPABILITY_VERIFIED' | RepoAccessDenyReason;
  capability: RepoAccessCapabilityStatus;
  executed: false;
}

export type RepoAccessIssueResult =
  | { ok: true; capability: RepoAccessCapability }
  | { ok: false; reason: 'OPERATION_NOT_REGISTERED' | 'INVALID_SUBJECT' | 'INVALID_SCOPE' | 'INVALID_TTL' };

const MIN_KEY_LENGTH = 32;
const DEFAULT_TTL_SECONDS = 900;
const MAX_TTL_SECONDS = 86_400;
const MAX_FIELD_LENGTH = 200;
const MAX_JOURNAL_ENTRIES = 5_000;
const GENESIS = 'omega-repo-access-genesis-v1';

const signedPayload = (capability: Omit<RepoAccessCapability, 'signature'>): string =>
  [REPO_ACCESS_CONTRACT, capability.subject, capability.operation, capability.scope, capability.expiresAt].join('\n');

const sign = (payload: string, key: string): string => createHmac('sha256', key).update(payload).digest('hex');

const signatureMatches = (expected: string, actual: string): boolean => {
  const left = Buffer.from(expected, 'hex');
  const right = Buffer.from(actual, 'hex');
  return left.length > 0 && left.length === right.length && timingSafeEqual(left, right);
};

const boundedText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_FIELD_LENGTH ? trimmed : null;
};

export interface RepoAccessEvaluationInput {
  subject: unknown;
  operation: unknown;
  scope: unknown;
  capability?: unknown;
}

const deny = (reason: RepoAccessDenyReason, capability: RepoAccessCapabilityStatus): RepoAccessDecision => ({
  decision: 'DENY',
  reason,
  capability,
  executed: false,
});

/**
 * Fail-closed decision for one requested repository operation.
 * `now` is injectable so expiry is testable without waiting.
 */
export function evaluateRepoAccess(
  input: RepoAccessEvaluationInput,
  key: string | null,
  now: number = Date.now(),
): RepoAccessDecision {
  if (!isRepoAccessOperation(input.operation)) return deny('OPERATION_NOT_REGISTERED', 'ABSENT');
  if (!key) return deny('CAPABILITY_KEY_UNAVAILABLE', 'ABSENT');

  const capability = input.capability;
  if (capability === undefined || capability === null) return deny('CAPABILITY_REQUIRED', 'ABSENT');
  if (typeof capability !== 'object' || Array.isArray(capability)) return deny('CAPABILITY_INVALID', 'INVALID');

  const candidate = capability as Record<string, unknown>;
  const fields = ['subject', 'operation', 'scope', 'expiresAt', 'signature'] as const;
  if (fields.some((field) => typeof candidate[field] !== 'string')) return deny('CAPABILITY_INVALID', 'INVALID');

  const presented: RepoAccessCapability = {
    subject: candidate.subject as string,
    operation: candidate.operation as RepoAccessOperation,
    scope: candidate.scope as string,
    expiresAt: candidate.expiresAt as string,
    signature: candidate.signature as string,
  };

  const expected = sign(signedPayload(presented), key);
  if (!signatureMatches(expected, presented.signature)) return deny('CAPABILITY_INVALID', 'INVALID');

  const expiresAt = new Date(presented.expiresAt).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return deny('CAPABILITY_EXPIRED', 'INVALID');

  if (presented.subject !== input.subject) return deny('SUBJECT_MISMATCH', 'VERIFIED');
  if (presented.operation !== input.operation) return deny('OPERATION_MISMATCH', 'VERIFIED');
  if (presented.scope !== input.scope) return deny('SCOPE_MISMATCH', 'VERIFIED');

  return { decision: 'ALLOW', reason: 'CAPABILITY_VERIFIED', capability: 'VERIFIED', executed: false };
}

export interface RepoAccessIssueInput {
  subject: unknown;
  operation: unknown;
  scope: unknown;
  ttlSeconds?: unknown;
}

const resolveTtl = (value: unknown): number | null => {
  if (value === undefined) return DEFAULT_TTL_SECONDS;
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_TTL_SECONDS ? value : null;
};

export function issueRepoAccessCapability(
  input: RepoAccessIssueInput,
  key: string,
  now: number = Date.now(),
): RepoAccessIssueResult {
  if (!isRepoAccessOperation(input.operation)) return { ok: false, reason: 'OPERATION_NOT_REGISTERED' };
  const subject = boundedText(input.subject);
  if (!subject) return { ok: false, reason: 'INVALID_SUBJECT' };
  const scope = boundedText(input.scope);
  if (!scope) return { ok: false, reason: 'INVALID_SCOPE' };
  const ttlSeconds = resolveTtl(input.ttlSeconds);
  if (ttlSeconds === null) return { ok: false, reason: 'INVALID_TTL' };

  const unsigned = {
    subject,
    operation: input.operation,
    scope,
    expiresAt: new Date(now + ttlSeconds * 1_000).toISOString(),
  };
  return { ok: true, capability: { ...unsigned, signature: sign(signedPayload(unsigned), key) } };
}

/** True when the configured key can issue and verify repository capabilities. */
export const repoAccessKeyFrom = (source: Record<string, string | undefined>): string | null => {
  const configured = (source.OMEGA_REPO_ACCESS_KEY?.trim() || source.OMEGA_SIGNING_KEY?.trim() || '');
  return configured.length >= MIN_KEY_LENGTH ? configured : null;
};

export interface RepoAccessAuditEntry {
  kind: 'OMEGA_REPO_ACCESS';
  sequence: number;
  previousHash: string;
  hash: string;
  id: string;
  occurredAt: string;
  event: 'CAPABILITY_ISSUED' | 'ACCESS_EVALUATED';
  subject: string;
  operation: string;
  scope: string;
  decision: 'ISSUED' | 'ALLOW' | 'DENY';
  reason: string;
  operator: string;
  declaredOperatorId: string | null;
  executed: false;
}

export type RepoAccessAuditDraft = Omit<RepoAccessAuditEntry, 'sequence' | 'previousHash' | 'hash'>;

export interface RepoAccessStore {
  append(draft: RepoAccessAuditDraft): RepoAccessAuditEntry;
  all(): readonly RepoAccessAuditEntry[];
  verifyIntegrity(): boolean;
}

const hashEntry = (entry: Omit<RepoAccessAuditEntry, 'hash'>): string =>
  createHash('sha256').update(JSON.stringify(entry)).digest('hex');

const auditDraft = (values: Omit<RepoAccessAuditDraft, 'id' | 'occurredAt' | 'kind' | 'executed'>): RepoAccessAuditDraft => ({
  kind: 'OMEGA_REPO_ACCESS',
  id: randomUUID(),
  occurredAt: new Date().toISOString(),
  executed: false,
  ...values,
});

export const repoAccessAuditDraft = auditDraft;

export class FileRepoAccessStore implements RepoAccessStore {
  private entries: RepoAccessAuditEntry[];
  private integrity = true;

  constructor(private readonly path: string) {
    this.entries = path === ':memory:' ? [] : this.load();
  }

  append(draft: RepoAccessAuditDraft): RepoAccessAuditEntry {
    if (!this.integrity) throw new Error('repo access audit integrity is degraded');
    if (this.entries.length >= MAX_JOURNAL_ENTRIES) throw new Error('repo access audit capacity exhausted');
    const previousHash = this.entries.at(-1)?.hash ?? GENESIS;
    const unsigned = { ...draft, sequence: this.entries.length + 1, previousHash };
    const entry: RepoAccessAuditEntry = { ...unsigned, hash: hashEntry(unsigned) };
    if (this.path !== ':memory:') {
      mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 });
      appendFileSync(this.path, `${JSON.stringify(entry)}\n`, { encoding: 'utf8', flag: 'a', mode: 0o600 });
    }
    this.entries.push(entry);
    return entry;
  }

  all(): readonly RepoAccessAuditEntry[] {
    return [...this.entries];
  }

  verifyIntegrity(): boolean {
    return this.integrity;
  }

  private load(): RepoAccessAuditEntry[] {
    let raw: string;
    try {
      raw = readFileSync(this.path, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      this.integrity = false;
      return [];
    }
    const loaded: RepoAccessAuditEntry[] = [];
    let previousHash = GENESIS;
    try {
      for (const line of raw.split('\n')) {
        if (!line.trim()) continue;
        const parsed = JSON.parse(line) as RepoAccessAuditEntry;
        const { hash, ...unsigned } = parsed;
        if (
          parsed.kind !== 'OMEGA_REPO_ACCESS' ||
          parsed.sequence !== loaded.length + 1 ||
          parsed.previousHash !== previousHash ||
          parsed.executed !== false ||
          !['CAPABILITY_ISSUED', 'ACCESS_EVALUATED'].includes(parsed.event) ||
          !['ISSUED', 'ALLOW', 'DENY'].includes(parsed.decision) ||
          hashEntry(unsigned) !== hash
        ) throw new Error('repo access audit integrity check failed');
        loaded.push(parsed);
        previousHash = parsed.hash;
      }
      this.integrity = true;
      return loaded;
    } catch {
      this.integrity = false;
      return loaded;
    }
  }
}

type JsonError = (reply: any, status: number, error: string, extra?: Record<string, unknown>) => unknown;
type PreHandler = (request: any, reply: any) => Promise<unknown> | void;

export interface RepoAccessRouteOptions {
  store: RepoAccessStore;
  resolveKey: () => string | null;
  jsonError: JsonError;
  requireReadAccess: PreHandler;
  requireAdminAccess: PreHandler;
  authMode: string;
  defaultScope: string;
}

const MAX_AUDIT_LIST = 200;
const grantFields = new Set(['subject', 'operation', 'scope', 'ttlSeconds']);
const evaluateFields = new Set(['subject', 'operation', 'scope', 'capability']);

const bodyObject = (body: unknown): Record<string, unknown> | null =>
  body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;

export function registerRepoAccessRoute(fastify: FastifyInstance, options: RepoAccessRouteOptions): void {
  const { store, resolveKey, jsonError, requireReadAccess, requireAdminAccess, authMode, defaultScope } = options;

  const operatorOf = (request: any): { operator: string; declaredOperatorId: string | null } => {
    const raw = request.headers?.['x-omega-operator-id'];
    return {
      operator: authMode === 'local' ? 'local-mode' : 'admin-bearer',
      declaredOperatorId: typeof raw === 'string' && raw.trim() ? raw.trim().slice(0, MAX_FIELD_LENGTH) : null,
    };
  };

  fastify.get('/v1/repo/access/policy', { preHandler: requireReadAccess }, async (_request, reply) => {
    if (!store.verifyIntegrity()) return jsonError(reply, 503, 'REPO_ACCESS_AUDIT_INTEGRITY_DEGRADED');
    return {
      success: true,
      contract: REPO_ACCESS_CONTRACT,
      operations: [...REPO_ACCESS_OPERATIONS],
      defaultScope,
      capabilityKeyConfigured: Boolean(resolveKey()),
      authMode,
      executed: false,
      invariants: [
        'capability is not authority: every predicate must hold',
        'evaluation records a decision and never executes a repository operation',
        'audit is append-only and hash-chained',
      ],
      evaluatedAt: new Date().toISOString(),
    };
  });

  fastify.post('/v1/repo/access/grant', { preHandler: requireAdminAccess }, async (request: any, reply) => {
    const body = bodyObject(request.body);
    if (!body) return jsonError(reply, 400, 'INVALID_BODY');
    if (Object.keys(body).some((field) => !grantFields.has(field))) return jsonError(reply, 400, 'UNSUPPORTED_FIELDS');

    const key = resolveKey();
    if (!key) return jsonError(reply, 503, 'CAPABILITY_KEY_UNAVAILABLE');

    const scope = body.scope === undefined ? defaultScope : body.scope;
    const result = issueRepoAccessCapability(
      { subject: body.subject, operation: body.operation, scope, ttlSeconds: body.ttlSeconds },
      key,
    );
    if (!result.ok) return jsonError(reply, 400, result.reason);

    if (!store.verifyIntegrity()) return jsonError(reply, 503, 'REPO_ACCESS_AUDIT_INTEGRITY_DEGRADED');
    const { operator, declaredOperatorId } = operatorOf(request);
    const entry = store.append(repoAccessAuditDraft({
      event: 'CAPABILITY_ISSUED',
      subject: result.capability.subject,
      operation: result.capability.operation,
      scope: result.capability.scope,
      decision: 'ISSUED',
      reason: 'CAPABILITY_ISSUED',
      operator,
      declaredOperatorId,
    }));

    return reply.status(201).send({
      success: true,
      contract: REPO_ACCESS_CONTRACT,
      capability: result.capability,
      executed: false,
      audit: { id: entry.id, hash: entry.hash },
    });
  });

  fastify.post('/v1/repo/access/evaluate', { preHandler: requireAdminAccess }, async (request: any, reply) => {
    const body = bodyObject(request.body);
    if (!body) return jsonError(reply, 400, 'INVALID_BODY');
    if (Object.keys(body).some((field) => !evaluateFields.has(field))) return jsonError(reply, 400, 'UNSUPPORTED_FIELDS');

    const scope = body.scope === undefined ? defaultScope : body.scope;
    const decision = evaluateRepoAccess(
      { subject: body.subject, operation: body.operation, scope, capability: body.capability },
      resolveKey(),
    );

    if (!store.verifyIntegrity()) return jsonError(reply, 503, 'REPO_ACCESS_AUDIT_INTEGRITY_DEGRADED');
    const { operator, declaredOperatorId } = operatorOf(request);
    const entry = store.append(repoAccessAuditDraft({
      event: 'ACCESS_EVALUATED',
      subject: typeof body.subject === 'string' ? body.subject.slice(0, MAX_FIELD_LENGTH) : '',
      operation: typeof body.operation === 'string' ? body.operation.slice(0, MAX_FIELD_LENGTH) : '',
      scope: typeof scope === 'string' ? scope.slice(0, MAX_FIELD_LENGTH) : '',
      decision: decision.decision,
      reason: decision.reason,
      operator,
      declaredOperatorId,
    }));

    return {
      success: true,
      contract: REPO_ACCESS_CONTRACT,
      ...decision,
      audit: { id: entry.id, hash: entry.hash },
      evaluatedAt: entry.occurredAt,
    };
  });

  fastify.get('/v1/repo/access/audit', { preHandler: requireReadAccess }, async (request: any, reply) => {
    if (!store.verifyIntegrity()) return jsonError(reply, 503, 'REPO_ACCESS_AUDIT_INTEGRITY_DEGRADED');
    const rawLimit = Number.parseInt(String(request.query?.limit ?? ''), 10);
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_AUDIT_LIST) : 50;
    const all = store.all();
    const entries = all.slice(-limit);
    return {
      success: true,
      contract: REPO_ACCESS_CONTRACT,
      entries,
      total: all.length,
      truncated: all.length > entries.length,
      integrity: all.length ? 'verified-local-hash-chain' : 'empty',
      executed: false,
    };
  });
}
