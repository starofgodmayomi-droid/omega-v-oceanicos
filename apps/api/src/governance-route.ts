/**
 * Ω∞v C6/C7/Authorization routes — reconciliation, provenance, and authority.
 *
 * Exposes the three missing roadmap packages as read-evidence / bounded-action
 * endpoints. These routes do not execute mutations on external reality, do
 * not self-authorize, and preserve UNKNOWN where evidence is insufficient.
 */
import type { FastifyInstance } from 'fastify';
import { reconcile, reconcileAll, summarizeReconciliation } from '@omega-v/reconciliation';
import { ProvenanceChain } from '@omega-v/provenance';
import { AuthorizationEngine } from '@omega-v/authorization';

type JsonError = (reply: any, status: number, error: string, extra?: Record<string, unknown>) => any;

// Singleton engines for the API process.
const provenanceChain = new ProvenanceChain();
const authorizationEngine = new AuthorizationEngine();

export function registerGovernanceRoutes(fastify: FastifyInstance, jsonError: JsonError): void {
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
    return { success: true, entry };
  });

  fastify.get('/v1/provenance/verify', async () => {
    return { success: true, integrity: provenanceChain.verifyIntegrity(), length: provenanceChain.length };
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
    return { success: true, tip: provenanceChain.tip, length: provenanceChain.length };
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
      return { success: true, grant };
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
      return { success: true, grantId: body.grantId, revoked: true };
    } catch (error: any) {
      return jsonError(reply, 400, error.message ?? 'REVOKE_FAILED');
    }
  });

  fastify.get('/v1/authorization/grants', async () => {
    return {
      success: true,
      grants: authorizationEngine.getAllGrants(),
      activeCount: authorizationEngine.activeGrantCount,
    };
  });
}
