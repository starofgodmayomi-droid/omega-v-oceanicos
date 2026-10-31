import type { FastifyInstance } from 'fastify';
import {
  authoritySatisfies,
  deriveAuthorityLevel,
  executeElion,
  requiredAuthorityFor,
  expectedOutcomeFor,
  reconcileEvidence,
  scanIntent,
  sha256Hex,
  verifyOmega,
  type AuthorityLevel,
} from './invisible-computer.js';
import type { KaiMemoryStore, KaiMemoryRecord, OmegaContract } from './kai-memory.js';

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
    // Step 1b — AUTHORITY: CAPABILITY != AUTHORITY. A directive intent needs
    // AUTONOMOUS authority; below that the loop halts NOT_EXECUTED before
    // anything is executed, contracted, or remembered.
    const requiredAuthority = requiredAuthorityFor(intent);
    if (!authoritySatisfies(authorityLevel, requiredAuthority)) {
      recordStep(
        'KAI',
        'OBSERVE',
        'NOT_EXECUTED',
        `Granted ${authorityLevel} < required ${requiredAuthority}. No execution attempted.`
      );
      return reply.status(200).send({
        success: true,
        status: 'NOT_EXECUTED',
        intent,
        response: null,
        evidence_hash: null,
        reason: `Authority ${authorityLevel} is below the required ${requiredAuthority}.`,
        matched_patterns: [],
        authority: { granted: authorityLevel, required: requiredAuthority },
        steps,
        contract: null,
        memory: null,
        engine: null,
        model_error: null,
        evaluated_at: new Date().toISOString(),
      });
    }
    recordStep('KAI', 'OBSERVE', 'VERIFIED', 'No known fraud pattern matched; authority is sufficient.');

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
      memory = store.remember({
        intent,
        evidenceHash,
        status: omega.status,
        contractId: contract.id,
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
