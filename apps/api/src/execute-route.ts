import type { FastifyInstance } from 'fastify';
import { KAIXELION_OMEGA_ID, runKaixelionOmega } from '@oceanicos/mini';
import {
  compressTowardUpgrade,
  deriveAuthorityLevel,
  reconcileEvidence,
  requiredAuthorityFor,
  type AuthorityLevel,
} from './invisible-computer.js';
import type { KaiMemoryStore } from './kai-memory.js';

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
 * POST /api/execute — one caller step of KAI × ELION × OMEGA.
 *
 * The verdict is `runKaixelionOmega`. This route does not read `observed`,
 * `source`, or `witness` from the body, does not call a model, and does not
 * write KaiMemory. A local composition with empty evidence is UNKNOWN.
 * `ledgerMutation` is false. A blocked intent or an unverifiable output is
 * HTTP 200 carrying a verdict, not an HTTP failure.
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
    const cycle = await runKaixelionOmega({
      intent,
      authority: authorityLevel,
      observed: '',
      source: 'caller',
      witness: null,
      memory: [],
    });
    const steps: ExecutionStep[] = cycle.steps.map((step) => ({
      actor: step.actor,
      phase: step.phase,
      status: step.status,
      detail: step.detail,
      at: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
    }));
    const requiredAuthority = requiredAuthorityFor(intent);

    return reply.status(200).send({
      success: true,
      status: cycle.status,
      intent,
      response: cycle.composed,
      evidence_hash: cycle.deltaHash,
      reason: cycle.reason,
      matched_patterns: cycle.matchedLabels,
      ...(cycle.status === 'NOT_EXECUTED'
        ? { authority: { granted: authorityLevel, required: requiredAuthority } }
        : {}),
      steps,
      contract: null,
      memory: null,
      engine: 'kaixelion-omega',
      model_error: null,
      evaluated_at: new Date().toISOString(),
      upgrade: compressTowardUpgrade({
        cycleStatus: cycle.status,
        evidenceHash: cycle.deltaHash,
      }),
      cycle: {
        equation: KAIXELION_OMEGA_ID,
        halt: cycle.halt,
        ledgerMutation: cycle.ledgerMutation,
        remembered: cycle.remembered,
        independentObservation: cycle.independentObservation,
        expected: cycle.expected,
      },
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

  const memoryDetailHandler = async (request: any, reply: any) => {
    const record = store.getMemory(String(request.params?.id ?? ''));
    if (!record) return jsonError(reply, 404, 'MEMORY_NOT_FOUND');
    const contract = record.contract_id ? store.getContract(record.contract_id) : null;
    return { success: true, record, contract };
  };

  // `V ≡ (Expected ≡ Observed)`, reconciled from stored evidence. The output
  // is supplied again because the row keeps the digest, not the text.
  const reconcileHandler = async (request: any, reply: any) => {
    const record = store.getMemory(String(request.params?.id ?? ''));
    if (!record) return jsonError(reply, 404, 'MEMORY_NOT_FOUND');
    const body = parseObject(request.body) ?? {};
    const contract = record.contract_id ? store.getContract(record.contract_id) : null;
    const verdict = reconcileEvidence({
      output: typeof body.output === 'string' ? body.output : null,
      evidenceHash: record.evidence_hash,
      expectedOutcome: contract ? contract.expected_outcome : null,
    });
    return {
      success: true,
      status: verdict.status,
      memory_id: record.id,
      evidence_hash: record.evidence_hash,
      contract_id: record.contract_id,
      checks: verdict.checks,
      reason: verdict.reason,
      evaluated_at: new Date().toISOString(),
    };
  };

  // `/execute` is what the Vite dev proxy targets after rewriting `/api/*`;
  // `/api/execute` is the published endpoint. Both are one handler. The same
  // two prefixes serve memory reads and the after-the-fact reconciliation.
  for (const path of ['/execute', '/api/execute']) fastify.post(path, executeHandler);
  for (const path of ['/kai/memory', '/api/kai/memory']) fastify.get(path, memoryHandler);
  for (const path of ['/kai/memory/:id', '/api/kai/memory/:id']) {
    fastify.get(path, memoryDetailHandler);
  }
  for (const path of ['/kai/memory/:id/reconcile', '/api/kai/memory/:id/reconcile']) {
    fastify.post(path, reconcileHandler);
  }
}
