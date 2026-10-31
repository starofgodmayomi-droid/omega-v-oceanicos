/**
 * Ω∞v C6/C7/Authorization routes — reconciliation, provenance, and authority.
 *
 * Exposes the three missing roadmap packages as read-evidence / bounded-action
 * endpoints. These routes do not execute mutations on external reality, do
 * not self-authorize, and preserve UNKNOWN where evidence is insufficient.
 */
import type { FastifyInstance } from 'fastify';
import { reconcile, reconcileAll, summarizeReconciliation } from '@omega-v/reconciliation';
import { ProvenanceChain, type ProvenanceEntry } from '@omega-v/provenance';
import { AuthorizationEngine, type AuthorityGrant } from '@omega-v/authorization';
import { appendEvent, readEventLog } from './persistence.js';

type JsonError = (reply: any, status: number, error: string, extra?: Record<string, unknown>) => any;

/**
 * Where governance state is journaled between processes.
 *
 * `path` is the append-only log the runtime writes each mutation to; `secret`
 * is the same persistence key the runtime already uses for its event log, so
 * the journal inherits that encryption rather than inventing a second one.
 */
export type GovernancePersistence = {
  enabled: boolean;
  path: string;
  secret?: string;
};

type GovernanceRecord =
  | { kind: 'provenance.append'; entry: ProvenanceEntry }
  | { kind: 'authorization.grant'; grant: AuthorityGrant }
  | { kind: 'authorization.revoke'; grantId: string; revokedBy: string; revokedAt: string };

// Singleton engines for the API process.
const provenanceChain = new ProvenanceChain();
const authorizationEngine = new AuthorizationEngine();

/**
 * Replay the journal into the engines.
 *
 * A history that cannot be read is not a reason to refuse service: the engine
 * is rehydrated with whatever is recoverable, `GET /v1/provenance/verify`
 * reports the chain's actual integrity, and `/health` already reports the
 * event log as `partial`. Nothing is repaired or synthesized here.
 */
function restoreGovernance(persistence?: GovernancePersistence): void {
  if (!persistence?.enabled) {
    // No journal: start empty rather than inheriting a previous app instance
    // in this process (integration suites build several apps per run).
    provenanceChain.restore([]);
    authorizationEngine.restore([]);
    return;
  }

  const read = readEventLog<GovernanceRecord>(persistence.path, true, persistence.secret);
  const provenance: ProvenanceEntry[] = [];
  const grants: AuthorityGrant[] = [];

  for (const record of read.entries) {
    if (record?.kind === 'provenance.append') provenance.push(record.entry);
    else if (record?.kind === 'authorization.grant') grants.push(record.grant);
    else if (record?.kind === 'authorization.revoke') {
      const grant = grants.find((candidate) => candidate.id === record.grantId);
      if (grant) Object.assign(grant, { revoked: true, revokedBy: record.revokedBy, revokedAt: record.revokedAt });
    }
  }

  provenanceChain.restore(provenance);
  authorizationEngine.restore(grants);
}

export function registerGovernanceRoutes(
  fastify: FastifyInstance,
  jsonError: JsonError,
  persistence?: GovernancePersistence,
): void {
  restoreGovernance(persistence);

  const durable = Boolean(persistence?.enabled);

  /** Journal one mutation. A failed append is reported, never swallowed. */
  const journal = (record: GovernanceRecord): boolean => {
    if (!persistence?.enabled) return false;
    return appendEvent(persistence.path, record, true, persistence.secret).appended;
  };

  // ── C6: Reconciliation ──────────────────────────────────────────────

  fastify.post('/v1/reconciliation/reconcile', async (request: any, reply: any) => {
    const body = request.body ?? {};
    if (typeof body.changeId !== 'string' || !body.changeId.trim())
      return jsonError(reply, 400, 'CHANGE_ID_REQUIRED');
    if (typeof body.expectedState !== 'string' || !body.expectedState.trim())
      return jsonError(reply, 400, 'EXPECTED_STATE_REQUIRED');

    const result = reconcile({
      changeId: body.changeId,
      expectedState: body.expectedState,
      observedState: typeof body.observedState === 'string' ? body.observedState : undefined,
      attestationId: body.attestationId,
      provenanceLineage: Array.isArray(body.provenanceLineage) ? body.provenanceLineage : undefined,
    });
    return { success: true, reconciliation: result };
  });

  fastify.post('/v1/reconciliation/batch', async (request: any, reply: any) => {
    const body = request.body ?? {};
    if (!Array.isArray(body.items) || body.items.length === 0)
      return jsonError(reply, 400, 'ITEMS_REQUIRED');

    const results = reconcileAll(
      body.items.map((item: any) => ({
        changeId: String(item.changeId ?? ''),
        expectedState: String(item.expectedState ?? ''),
        observedState: item.observedState !== undefined ? String(item.observedState) : undefined,
        attestationId: item.attestationId,
        provenanceLineage: item.provenanceLineage,
      })),
    );
    return { success: true, results, summary: summarizeReconciliation(results) };
  });

  // ── C7: Provenance ───────────────────────────────────────────────────

  fastify.post('/v1/provenance/append', async (request: any, reply: any) => {
    const body = request.body ?? {};
    if (typeof body.changeId !== 'string' || !body.changeId.trim())
      return jsonError(reply, 400, 'CHANGE_ID_REQUIRED');
    if (typeof body.source !== 'string' || !body.source.trim())
      return jsonError(reply, 400, 'SOURCE_REQUIRED');

    const entry = provenanceChain.append(
      body.changeId,
      body.source,
      typeof body.attributedTo === 'string' ? body.attributedTo : null,
      Array.isArray(body.lineage) ? body.lineage : [],
    );
    const persisted = journal({ kind: 'provenance.append', entry });
    return { success: true, entry, durable: persisted };
  });

  fastify.get('/v1/provenance/verify', async () => {
    return {
      success: true,
      integrity: provenanceChain.verifyIntegrity(),
      length: provenanceChain.length,
      durable,
    };
  });

  fastify.get('/v1/provenance/lineage/:changeId', async (request: any, reply: any) => {
    const changeId = request.params?.changeId;
    if (!changeId) return jsonError(reply, 400, 'CHANGE_ID_REQUIRED');
    const lineage = provenanceChain.getLineage(changeId);
    const entry = provenanceChain.getEntry(changeId);
    if (!entry) return jsonError(reply, 404, 'PROVENANCE_ENTRY_NOT_FOUND');
    return { success: true, changeId, entry, lineage };
  });

  fastify.get('/v1/provenance/tip', async () => {
    return { success: true, tip: provenanceChain.tip, length: provenanceChain.length, durable };
  });

  // ── Authorization ────────────────────────────────────────────────────

  fastify.post('/v1/authorization/grant', async (request: any, reply: any) => {
    const body = request.body ?? {};
    if (typeof body.subject !== 'string' || !body.subject.trim())
      return jsonError(reply, 400, 'SUBJECT_REQUIRED');
    if (typeof body.scope !== 'string' || !body.scope.trim())
      return jsonError(reply, 400, 'SCOPE_REQUIRED');
    if (typeof body.grantedBy !== 'string' || !body.grantedBy.trim())
      return jsonError(reply, 400, 'GRANTED_BY_REQUIRED');

    try {
      const grant = authorizationEngine.grant({
        subject: body.subject,
        scope: body.scope,
        policyRefs: Array.isArray(body.policyRefs) ? body.policyRefs : [],
        grantedBy: body.grantedBy,
        expiresAt: body.expiresAt,
      });
      const persisted = journal({ kind: 'authorization.grant', grant });
      return { success: true, grant, durable: persisted };
    } catch (error: any) {
      return jsonError(reply, 400, error.message ?? 'GRANT_FAILED');
    }
  });

  fastify.post('/v1/authorization/evaluate', async (request: any, reply: any) => {
    const body = request.body ?? {};
    if (typeof body.subject !== 'string' || !body.subject.trim())
      return jsonError(reply, 400, 'SUBJECT_REQUIRED');
    if (typeof body.scope !== 'string' || !body.scope.trim())
      return jsonError(reply, 400, 'SCOPE_REQUIRED');

    const result = authorizationEngine.evaluate({
      changeId: String(body.changeId ?? `eval-${Date.now()}`),
      subject: body.subject,
      scope: body.scope,
      policyRefs: Array.isArray(body.policyRefs) ? body.policyRefs : [],
      evidence: Array.isArray(body.evidence) ? body.evidence : [],
    });
    return { success: true, authorization: result };
  });

  fastify.post('/v1/authorization/revoke', async (request: any, reply: any) => {
    const body = request.body ?? {};
    if (typeof body.grantId !== 'string' || !body.grantId.trim())
      return jsonError(reply, 400, 'GRANT_ID_REQUIRED');
    if (typeof body.revokedBy !== 'string' || !body.revokedBy.trim())
      return jsonError(reply, 400, 'REVOKED_BY_REQUIRED');

    try {
      authorizationEngine.revoke(body.grantId, body.revokedBy);
      const grant = authorizationEngine.getAllGrants().find((candidate) => candidate.id === body.grantId);
      const persisted = journal({
        kind: 'authorization.revoke',
        grantId: body.grantId,
        revokedBy: body.revokedBy,
        revokedAt: grant?.revokedAt ?? new Date().toISOString(),
      });
      return { success: true, grantId: body.grantId, revoked: true, durable: persisted };
    } catch (error: any) {
      return jsonError(reply, 400, error.message ?? 'REVOKE_FAILED');
    }
  });

  fastify.get('/v1/authorization/grants', async () => {
    return {
      success: true,
      grants: authorizationEngine.getAllGrants(),
      activeCount: authorizationEngine.activeGrantCount,
      durable,
    };
  });
}
