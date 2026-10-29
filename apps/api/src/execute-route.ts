import type { FastifyInstance } from 'fastify';
import { deriveAuthorityLevel, executeElion, expectedOutcomeFor } from '@oceanicos/elion';
import { scanIntent, type AuthorityLevel, type OmegaContract } from '@oceanicos/kai';
import { omegaFixpoint, replayVerdict, sha256Hex, verifyOmega } from '@oceanicos/omega';
import type { KaiMemoryStore, KaiMemoryRecord } from './kai-memory.js';

type JsonError = (reply: any, status: number, error: string, extra?: Record<string, unknown>) => unknown;

const MAX_INTENT_LENGTH = 2000;

export type ExecutionStep = {
  actor: 'KAI' | 'ELION' | 'OMEGA';
  phase: 'OBSERVE' | 'EXECUTE' | 'VERIFY' | 'REMEMBER';
  status: string;
  detail: string;
  at: string;
  elapsedMs: number;
};

function parseObject(body: unknown): Record<string, unknown> | null {
  return body && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
}

/**
 * POST /api/execute — the Invisible Online Computer loop.
 *
 *   KAI observe → ELION execute → OMEGA verify → KAI remember → return
 *
 * A blocked intent (DIVERGENT) or an unverifiable output (UNKNOWN) is a
 * successful HTTP response carrying a verdict, not an HTTP failure.
 */
export function registerExecuteRoute(
  fastify: FastifyInstance,
  store: KaiMemoryStore,
  jsonError: JsonError
): void {
  const executeHandler = async (request: any, reply: any) => {
    const body = parseObject(request.body);
    if (!body) return jsonError(reply, 400, 'INTENT_REQUIRED');
    const intent = typeof body.intent === 'string' ? body.intent.trim() : '';
    if (!intent) return jsonError(reply, 400, 'INTENT_REQUIRED');
    if (intent.length > MAX_INTENT_LENGTH) {
      return jsonError(reply, 400, 'INTENT_TOO_LONG', { maxLength: MAX_INTENT_LENGTH });
    }

    const authorityLevel: AuthorityLevel = deriveAuthorityLevel(body.authorityLevel);
    const startedAt = Date.now();
    const steps: ExecutionStep[] = [];
    const recordStep = (
      actor: ExecutionStep['actor'],
      phase: ExecutionStep['phase'],
      status: string,
      detail: string
    ) => {
      steps.push({
        actor,
        phase,
        status,
        detail,
        at: new Date().toISOString(),
        elapsedMs: Date.now() - startedAt,
      });
    };

    // Step 1 — KAI observe: the shield halts before anything is executed.
    const shield = scanIntent(intent);
    if (shield.blocked) {
      recordStep(
        'KAI',
        'OBSERVE',
        'DIVERGENT',
        `Matched ${shield.matchedLabels.join(', ')}. No execution attempted.`
      );
      return reply.status(200).send({
        success: true,
        status: 'DIVERGENT',
        intent,
        response: null,
        evidence_hash: null,
        reason: 'KAI Shield blocked this intent.',
        matched_patterns: shield.matchedLabels,
        steps,
        contract: null,
        memory: null,
        engine: null,
        model_error: null,
        evaluated_at: new Date().toISOString(),
      });
    }
    recordStep('KAI', 'OBSERVE', 'VERIFIED', 'No known fraud pattern matched.');

    // The OmegaIR contract is written before execution so the output is
    // verified against a declared expectation, not against itself.
    const contract: OmegaContract = store.createContract({
      intent,
      authorityLevel,
      expectedOutcome: expectedOutcomeFor(authorityLevel),
    });

    // Step 2 — ELION execute: bounded answer, model or local composer.
    const elion = await executeElion(intent, authorityLevel);
    recordStep(
      'ELION',
      'EXECUTE',
      elion.error ? 'UNKNOWN' : 'VERIFIED',
      elion.error
        ? `Answer unavailable from ${elion.engine}: ${elion.error}. UNKNOWN preserved.`
        : `Bounded answer composed via ${elion.engine}.`
    );

    // Step 3 — OMEGA verify: hash the output, compare it to the contract.
    const evidenceHash = sha256Hex(elion.output);
    const omega = verifyOmega({ output: elion.output, evidenceHash, authorityLevel });
    recordStep(
      'OMEGA',
      'VERIFY',
      omega.status,
      omega.status === 'VERIFIED'
        ? 'Output matches the contract and the SHA-256 digest recomputes.'
        : omega.reason ?? 'Output could not be verified.'
    );

    // Step 4 — KAI remember: only a verified outcome is written to memory.
    let memory: KaiMemoryRecord | null = null;
    if (omega.status === 'VERIFIED') {
      // The evidence text is retained so the digest can be recomputed later;
      // a remembered row that cannot be replayed would be an assertion, not memory.
      memory = store.remember({
        intent,
        evidenceHash,
        status: omega.status,
        evidenceText: elion.output,
      });
      recordStep('KAI', 'REMEMBER', 'VERIFIED', `Evidence stored as ${memory.id}.`);
    } else {
      recordStep(
        'KAI',
        'REMEMBER',
        'NOT_EXECUTED',
        'Nothing was remembered because verification did not pass.'
      );
    }

    return reply.status(200).send({
      success: true,
      status: omega.status,
      intent,
      response: elion.output || null,
      evidence_hash: elion.output ? evidenceHash : null,
      reason: omega.reason,
      matched_patterns: [],
      checks: omega.checks,
      steps,
      contract,
      memory,
      engine: elion.engine,
      model_error: elion.error,
      evaluated_at: new Date().toISOString(),
    });
  };

  const memoryHandler = async (request: any) => {
    const rawLimit = request.query?.limit;
    const limit = rawLimit === undefined ? 10 : Number(rawLimit);
    return {
      success: true,
      total: store.count(),
      records: store.listMemory(Number.isFinite(limit) ? limit : 10),
    };
  };

  /**
   * GET /api/kai/memory/:id/replay — recompute a remembered record's digest
   * from the evidence text that was retained with it.
   *
   * VERIFIED means the digest still recomputes. DIVERGENT means it does not:
   * the row is preserved and reported as broken memory, never served as good.
   * A row written before evidence was retained is UNKNOWN, not VERIFIED.
   */
  const replayHandler = async (request: any, reply: any) => {
    const id = typeof request.params?.id === 'string' ? request.params.id : '';
    const record = store.findMemory(id);
    if (!record) return jsonError(reply, 404, 'MEMORY_NOT_FOUND');

    return reply.status(200).send({
      success: true,
      id: record.id,
      intent: record.intent,
      remembered_status: record.status,
      stored_hash: record.evidence_hash,
      ...replayVerdict(record),
    });
  };

  /**
   * GET /api/kai/memory/audit — replay the remembered ledger in one call.
   *
   * The ledger verdict is the worst row in the audited window: any DIVERGENT
   * row makes the ledger DIVERGENT, otherwise any UNKNOWN row makes it UNKNOWN.
   * Only a ledger whose every audited row recomputes is VERIFIED. Rows beyond
   * the bound are counted in `not_audited`, never assumed good.
   *
   * `fixpoint` folds the same rows through the loop law: memory grows only
   * with hashes whose evidence still recomputes, and every other row halts
   * with DIVERGENT / UNKNOWN / NOT_EXECUTED without touching it.
   */
  const auditHandler = async (request: any) => {
    const rawLimit = request.query?.limit;
    const limit = rawLimit === undefined ? 50 : Number(rawLimit);
    const evidence = store.listEvidence(Number.isFinite(limit) ? limit : 50);
    const rows = evidence.map((record) => ({
      id: record.id,
      intent: record.intent,
      stored_hash: record.evidence_hash,
      ...replayVerdict(record),
    }));
    const total = store.count();
    const countOf = (status: string) => rows.filter((row) => row.status === status).length;
    const divergent = countOf('DIVERGENT');
    const unknown = countOf('UNKNOWN');

    // The ledger as a fixed point: `M_{t+1} = M_t ∪ { Hash(x) | V(x) = ⊤ }`.
    // Only a row whose evidence still recomputes may stay in memory; every
    // other row halts with its own verdict and is counted, never assumed good.
    const fixpoint = omegaFixpoint(
      evidence.map((record) => ({
        observed: record.evidence_text,
        expectedHash: record.evidence_hash,
        scam: scanIntent(record.intent).blocked,
      }))
    );
    const haltedOf = (verdict: string) =>
      fixpoint.halted.filter((halt) => halt.verdict === verdict).length;

    return {
      success: true,
      status:
        rows.length === 0
          ? 'NOT_EXECUTED'
          : divergent > 0
            ? 'DIVERGENT'
            : unknown > 0
              ? 'UNKNOWN'
              : 'VERIFIED',
      total,
      audited: rows.length,
      not_audited: Math.max(total - rows.length, 0),
      verified: countOf('VERIFIED'),
      divergent,
      unknown,
      fixpoint: {
        verdict: fixpoint.verdict,
        memory: fixpoint.memory.length,
        admitted: fixpoint.admitted,
        halted: {
          divergent: haltedOf('DIVERGENT'),
          unknown: haltedOf('UNKNOWN'),
          not_executed: haltedOf('NOT_EXECUTED'),
        },
        steps: fixpoint.steps,
        fixed: fixpoint.fixed,
      },
      records: rows,
    };
  };

  // `/execute` is what the Vite dev proxy targets after rewriting `/api/*`;
  // `/api/execute` is the published endpoint. Both are one handler.
  for (const path of ['/execute', '/api/execute']) fastify.post(path, executeHandler);
  for (const path of ['/kai/memory', '/api/kai/memory']) fastify.get(path, memoryHandler);
  for (const path of ['/kai/memory/audit', '/api/kai/memory/audit']) fastify.get(path, auditHandler);
  for (const path of ['/kai/memory/:id/replay', '/api/kai/memory/:id/replay']) {
    fastify.get(path, replayHandler);
  }
}
