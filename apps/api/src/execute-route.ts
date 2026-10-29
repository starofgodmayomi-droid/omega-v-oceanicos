import type { FastifyInstance } from 'fastify';
import {
  composeApprovalRequest,
  deriveAuthorityLevel,
  executeElion,
  expectedOutcomeFor,
  nextActionFor,
  scanIntent,
  scanIrreversible,
  sha256Hex,
  verifyOmega,
  type AuthorityLevel,
} from './invisible-computer.js';
import type { KaiMemoryStore, KaiMemoryRecord, OmegaContract } from './kai-memory.js';

type JsonError = (reply: any, status: number, error: string, extra?: Record<string, unknown>) => unknown;

const MAX_INTENT_LENGTH = 2000;

export type ExecutionStep = {
  actor: 'KAI' | 'ELION' | 'OMEGA';
  phase: 'OBSERVE' | 'BOUND' | 'APPROVE' | 'EXECUTE' | 'VERIFY' | 'REMEMBER';
  status: string;
  detail: string;
  at: string;
  elapsedMs: number;
};

/** Collects the steps actually recorded by one run, in order. */
function createStepRecorder(): {
  steps: ExecutionStep[];
  recordStep: (
    actor: ExecutionStep['actor'],
    phase: ExecutionStep['phase'],
    status: string,
    detail: string
  ) => void;
} {
  const startedAt = Date.now();
  const steps: ExecutionStep[] = [];
  const recordStep: ReturnType<typeof createStepRecorder>['recordStep'] = (
    actor,
    phase,
    status,
    detail
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
  return { steps, recordStep };
}

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

    const authorityLevel: AuthorityLevel = deriveAuthorityLevel(body.authorityLevel, intent);
    const { steps, recordStep } = createStepRecorder();

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
        next_action: nextActionFor('DIVERGENT'),
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
    recordStep(
      'ELION',
      'BOUND',
      'VERIFIED',
      `ΩIR contract ${contract.id.slice(0, 8)} written at authority level ${authorityLevel}.`
    );

    // Phase 2 gate — an irreversible action pauses for explicit human
    // authorization; nothing is executed and nothing is remembered.
    if (authorityLevel === 'HUMAN_APPROVAL_REQUIRED') {
      const gate = scanIrreversible(intent);
      const approval = store.createApproval({
        intent,
        gate: gate.matchedLabels.join(', '),
        contractId: contract.id,
      });
      recordStep(
        'ELION',
        'EXECUTE',
        'NOT_EXECUTED',
        `Paused at the LUCID gate: ${gate.matchedLabels.join(', ')}. No tool was called; approval ${approval.id.slice(0, 8)} is pending.`
      );
      recordStep('KAI', 'REMEMBER', 'NOT_EXECUTED', 'Nothing was remembered because nothing was authorized.');
      return reply.status(200).send({
        success: true,
        status: 'AWAITING_APPROVAL',
        intent,
        response: composeApprovalRequest(intent, gate.matchedLabels),
        evidence_hash: null,
        reason: 'Human authorization is required before this irreversible action.',
        matched_patterns: [],
        approval_required_for: gate.matchedLabels,
        checks: [],
        steps,
        contract,
        memory: null,
        engine: null,
        model_error: null,
        approval,
        next_action: nextActionFor('AWAITING_APPROVAL'),
        evaluated_at: new Date().toISOString(),
      });
    }

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
      memory = store.remember({ intent, evidenceHash, status: omega.status });
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
      next_action: nextActionFor(omega.status),
      evaluated_at: new Date().toISOString(),
    });
  };

  const memoryHandler = async (request: any) => {
    const rawLimit = request.query?.limit;
    const limit = rawLimit === undefined ? 10 : Number(rawLimit);
    const bounded = Number.isFinite(limit) ? limit : 10;
    return {
      success: true,
      total: store.count(),
      records: store.listMemory(bounded),
      // A paused intent is deliberately not a memory row, so the panel reads
      // the approvals it is still waiting on from here.
      pending_total: store.countPendingApprovals(),
      pending_approvals: store.listPendingApprovals(bounded),
    };
  };

  /**
   * POST /api/approve — the human side of the LUCID gate.
   *
   * A pending approval can be decided exactly once: AUTHORIZE resumes the
   * bounded flow for that one intent at authority level AUTONOMOUS; REJECT
   * ends it. The decision is recorded, and any second call is 409.
   */
  const approveHandler = async (request: any, reply: any) => {
    const body = parseObject(request.body);
    if (!body) return jsonError(reply, 400, 'APPROVAL_REQUIRED');
    const approvalId = typeof body.approval_id === 'string' ? body.approval_id.trim() : '';
    const decisionRaw = typeof body.decision === 'string' ? body.decision.trim().toUpperCase() : '';
    if (!approvalId) return jsonError(reply, 400, 'APPROVAL_REQUIRED');
    if (decisionRaw !== 'AUTHORIZE' && decisionRaw !== 'REJECT') {
      return jsonError(reply, 400, 'DECISION_REQUIRED', { allowed: ['AUTHORIZE', 'REJECT'] });
    }

    const pending = store.getApproval(approvalId);
    if (!pending) return jsonError(reply, 404, 'APPROVAL_NOT_FOUND');
    if (pending.status !== 'PENDING') {
      return jsonError(reply, 409, 'APPROVAL_ALREADY_DECIDED', {
        status: pending.status,
        decided_at: pending.decided_at,
      });
    }

    if (decisionRaw === 'REJECT') {
      const rejected = store.decideApproval(approvalId, 'REJECTED');
      if (!rejected) return jsonError(reply, 409, 'APPROVAL_ALREADY_DECIDED');
      const { steps, recordStep } = createStepRecorder();
      recordStep('KAI', 'APPROVE', 'REJECTED', 'Human authorization was declined; this approval is spent.');
      recordStep('KAI', 'REMEMBER', 'NOT_EXECUTED', 'Nothing was remembered because nothing was authorized.');
      return reply.status(200).send({
        success: true,
        status: 'REJECTED',
        intent: pending.intent,
        response: null,
        evidence_hash: null,
        reason: 'Human authorization was declined; nothing was executed.',
        matched_patterns: [],
        approval_required_for: [pending.gate],
        checks: [],
        steps,
        contract: store.getContract(pending.contract_id),
        memory: null,
        engine: null,
        model_error: null,
        approval: rejected,
        next_action: nextActionFor('REJECTED'),
        evaluated_at: new Date().toISOString(),
      });
    }

    // AUTHORIZE — resume the bounded flow for this single intent.
    const authorized = store.decideApproval(approvalId, 'AUTHORIZED');
    if (!authorized) return jsonError(reply, 409, 'APPROVAL_ALREADY_DECIDED');
    const { steps, recordStep } = createStepRecorder();
    recordStep(
      'KAI',
      'APPROVE',
      'VERIFIED',
      `Human authorization recorded at ${authorized.decided_at}; approval ${authorized.id.slice(0, 8)} is spent.`
    );

    const elion = await executeElion(authorized.intent, 'AUTONOMOUS', {
      id: authorized.id,
      decidedAt: String(authorized.decided_at),
    });
    recordStep(
      'ELION',
      'EXECUTE',
      elion.error ? 'UNKNOWN' : 'VERIFIED',
      elion.error
        ? `Answer unavailable from ${elion.engine}: ${elion.error}. UNKNOWN preserved.`
        : `Authorized bounded answer composed via ${elion.engine}.`
    );

    const evidenceHash = sha256Hex(elion.output);
    const omega = verifyOmega({ output: elion.output, evidenceHash, authorityLevel: 'AUTONOMOUS' });
    recordStep(
      'OMEGA',
      'VERIFY',
      omega.status,
      omega.status === 'VERIFIED'
        ? 'Output matches the contract and the SHA-256 digest recomputes.'
        : omega.reason ?? 'Output could not be verified.'
    );

    let memory: KaiMemoryRecord | null = null;
    if (omega.status === 'VERIFIED') {
      memory = store.remember({
        intent: authorized.intent,
        evidenceHash,
        status: omega.status,
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
      intent: authorized.intent,
      response: elion.output || null,
      evidence_hash: elion.output ? evidenceHash : null,
      reason: omega.reason,
      matched_patterns: [],
      approval_required_for: [authorized.gate],
      checks: omega.checks,
      steps,
      contract: store.getContract(authorized.contract_id),
      memory,
      engine: elion.engine,
      model_error: elion.error,
      approval: authorized,
      next_action: nextActionFor(omega.status),
      evaluated_at: new Date().toISOString(),
    });
  };

  // `/execute` is what the Vite dev proxy targets after rewriting `/api/*`;
  // `/api/execute` is the published endpoint. Both are one handler.
  for (const path of ['/execute', '/api/execute']) fastify.post(path, executeHandler);
  for (const path of ['/approve', '/api/approve']) fastify.post(path, approveHandler);
  for (const path of ['/kai/memory', '/api/kai/memory']) fastify.get(path, memoryHandler);
}
