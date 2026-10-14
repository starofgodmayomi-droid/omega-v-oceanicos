/**
 * Ω∞v Biblical Engine & Covenant State Machine Route.
 *
 * Exposes the cryptographic Covenant lifecycle (PROMISED -> SEALED -> TESTED -> FULFILLED)
 * and Temple Thread Sanctum verification over HTTP with strict fail-closed security.
 */
import type { FastifyInstance } from 'fastify';
import {
  createCovenant,
  transitionCovenant,
  validateSanctumAccess,
  CANONICAL_STEWARD_DID,
} from '@oceanicos/authorization';
import type {
  CovenantRecord,
  CovenantStatus,
  TempleSanctum,
} from '@oceanicos/types';

type JsonError = (
  reply: any,
  status: number,
  error: string,
  extra?: Record<string, unknown>,
) => unknown;

export function registerCovenantRoute(
  fastify: FastifyInstance,
  jsonError: JsonError,
): void {
  // In-memory covenant ledger initialized with the Genesis Covenant
  const covenantStore = new Map<string, CovenantRecord>();

  const genesisCovenant = createCovenant({
    covenantId: 'cov-genesis-1111',
    title: 'Whole-Ecosystem Living Genesis Covenant',
    threadId: 'thread-genesis-000',
    sanctum: 'HOLY_OF_HOLIES',
    stewardDid: CANONICAL_STEWARD_DID,
    parentThreadHash: '0'.repeat(64),
    terms: [
      'Preserve human root and unconditioned origin',
      'Fail closed on uncertainty or absent evidence',
      'One root. One current. Infinite forms.',
    ],
    failClosedCondition: 'EVIDENCE_ABSENCE_OR_BREACH',
  });
  covenantStore.set(genesisCovenant.covenantId, genesisCovenant);

  /**
   * GET /v1/covenant
   * List all registered covenants and their status.
   */
  fastify.get('/v1/covenant', async (_request, reply) => {
    return reply.status(200).send({
      success: true,
      count: covenantStore.size,
      covenants: Array.from(covenantStore.values()),
    });
  });

  /**
   * GET /v1/covenant/:id
   * Get a single covenant by canonical ID.
   */
  fastify.get('/v1/covenant/:id', async (request: any, reply) => {
    const id = request.params?.id;
    const covenant = covenantStore.get(id);
    if (!covenant) {
      return jsonError(reply, 404, 'COVENANT_NOT_FOUND', { covenantId: id });
    }
    return reply.status(200).send({
      success: true,
      covenant,
    });
  });

  /**
   * POST /v1/covenant
   * Initialize a new Covenant in PROMISED state.
   */
  fastify.post('/v1/covenant', async (request: any, reply) => {
    const body = request.body || {};
    const covenantId = typeof body.covenantId === 'string' ? body.covenantId.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const threadId = typeof body.threadId === 'string' ? body.threadId.trim() : `thread-${Date.now()}`;
    const terms = Array.isArray(body.terms) ? body.terms.map(String) : [];
    const sanctum: TempleSanctum = body.sanctum || 'HOLY_PLACE';
    const stewardDid = body.stewardDid || CANONICAL_STEWARD_DID;
    const parentThreadHash = body.parentThreadHash || '0'.repeat(64);

    if (!covenantId) {
      return jsonError(reply, 400, 'MISSING_COVENANT_ID');
    }
    if (!title) {
      return jsonError(reply, 400, 'MISSING_COVENANT_TITLE');
    }
    if (terms.length === 0) {
      return jsonError(reply, 400, 'MISSING_COVENANT_TERMS');
    }

    if (covenantStore.has(covenantId)) {
      return jsonError(reply, 409, 'COVENANT_ALREADY_EXISTS', { covenantId });
    }

    const covenant = createCovenant({
      covenantId,
      title,
      threadId,
      sanctum,
      stewardDid,
      parentThreadHash,
      terms,
      failClosedCondition: body.failClosedCondition,
    });

    covenantStore.set(covenantId, covenant);

    return reply.status(201).send({
      success: true,
      covenant,
    });
  });

  /**
   * POST /v1/covenant/transition
   * Deterministically advance a covenant through its lifecycle:
   * PROMISED -> SEALED -> TESTED -> FULFILLED (or BREACHED -> RESTORED).
   */
  fastify.post('/v1/covenant/transition', async (request: any, reply) => {
    const body = request.body || {};
    const covenantId = typeof body.covenantId === 'string' ? body.covenantId.trim() : '';
    const targetStatus: CovenantStatus = body.targetStatus;
    const requestedBy = typeof body.requestedBy === 'string' ? body.requestedBy.trim() : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const evidenceReceipts = Array.isArray(body.evidenceReceipts)
      ? body.evidenceReceipts.map(String)
      : [];
    const stewardSignature =
      typeof body.stewardSignature === 'string' ? body.stewardSignature.trim() : undefined;

    if (!covenantId) {
      return jsonError(reply, 400, 'MISSING_COVENANT_ID');
    }
    if (!targetStatus) {
      return jsonError(reply, 400, 'MISSING_TARGET_STATUS');
    }
    if (!requestedBy) {
      return jsonError(reply, 400, 'MISSING_REQUESTED_BY');
    }

    const covenant = covenantStore.get(covenantId);
    if (!covenant) {
      return jsonError(reply, 404, 'COVENANT_NOT_FOUND', { covenantId });
    }

    const result = transitionCovenant(covenant, {
      covenantId,
      targetStatus,
      requestedBy,
      reason,
      evidenceReceipts,
      stewardSignature,
      timestamp: new Date().toISOString(),
    });

    if (!result.success) {
      return reply.status(403).send({
        success: false,
        error: result.error,
        rationale: result.rationale,
        previousStatus: result.previousStatus,
        newStatus: result.newStatus,
      });
    }

    if (result.updatedCovenant) {
      covenantStore.set(covenantId, result.updatedCovenant);
    }

    return reply.status(200).send({
      success: true,
      rationale: result.rationale,
      previousStatus: result.previousStatus,
      newStatus: result.newStatus,
      covenant: result.updatedCovenant,
    });
  });

  /**
   * POST /v1/covenant/sanctum/verify
   * Verify whether a requester can access or operate within a given Temple Thread Sanctum.
   */
  fastify.post('/v1/covenant/sanctum/verify', async (request: any, reply) => {
    const body = request.body || {};
    const sanctum: TempleSanctum = body.sanctum || 'OUTER_COURT';
    const requesterDid = typeof body.requesterDid === 'string' ? body.requesterDid.trim() : '';
    const stewardSignature =
      typeof body.stewardSignature === 'string' ? body.stewardSignature.trim() : undefined;

    if (!requesterDid) {
      return jsonError(reply, 400, 'MISSING_REQUESTER_DID');
    }

    const check = validateSanctumAccess(sanctum, requesterDid, stewardSignature);
    const statusCode = check.allowed ? 200 : 403;

    return reply.status(statusCode).send({
      allowed: check.allowed,
      sanctum,
      requesterDid,
      rationale: check.rationale,
    });
  });
}
