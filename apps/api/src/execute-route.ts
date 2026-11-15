import type { FastifyInstance } from 'fastify';
import { AttestationService } from '@oceanicos/attestation';
import { runKaixelionOmega } from '@oceanicos/mini';
import type { Attestation } from '@oceanicos/types';
import {
  authoritySatisfies,
  compressTowardUpgrade,
  deriveAuthorityLevel,
  executeElion,
  requiredAuthorityFor,
  reconcileEvidence,
  scanIntent,
  type AuthorityLevel,
} from './invisible-computer.js';
import type { KaiMemoryStore } from './kai-memory.js';

type JsonError = (reply: any, status: number, error: string, extra?: Record<string, unknown>) => unknown;

const MAX_INTENT_LENGTH = 2000;
const MIN_ATTESTATION_KEY_LENGTH = 32;

type ExecutionAttestationStatus = 'SIGNED' | 'NOT_CONFIGURED' | 'KEY_TOO_WEAK' | 'NOT_ELIGIBLE';

function attestExecution(input: {
  status: string;
  evidenceHash: string | null;
  contractId: string | null;
  checks: Array<{ passed: boolean }>;
  signingKey: string | undefined;
}): { status: ExecutionAttestationStatus; attestation: Attestation | null } {
  if (
    input.status !== 'VERIFIED' ||
    !input.evidenceHash ||
    !input.contractId ||
    input.checks.length === 0
  ) {
    return { status: 'NOT_ELIGIBLE', attestation: null };
  }
  if (!input.signingKey) return { status: 'NOT_CONFIGURED', attestation: null };
  if (input.signingKey.length < MIN_ATTESTATION_KEY_LENGTH) {
    return { status: 'KEY_TOO_WEAK', attestation: null };
  }

  const passedChecks = input.checks.filter((check) => check.passed).length;
  const service = new AttestationService({
    signingKey: input.signingKey,
    algorithm: 'HMAC-SHA256',
  });
  const attestation = service.attest({
    id: input.contractId,
    observationId: input.evidenceHash,
    timestamp: new Date().toISOString(),
    summary: {
      passed: true,
      confidence: passedChecks / input.checks.length,
      rulesApplied: input.checks.length,
      rulesPassed: passedChecks,
      rulesFailed: input.checks.length - passedChecks,
    },
    ruleVersions: { 'omega-execution': 'v1' },
    status: 'completed',
  });
  return { status: 'SIGNED', attestation };
}

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
 *   KAI observe → authority → runKaixelionOmega → ELION compose → return
 *
 * A local template is not an observation of reality. This route passes an
 * empty observation and source `caller` into the cycle, so the status stays
 * UNKNOWN, KaiMemory is not written, and no attestation is eligible.
 * A blocked intent (DIVERGENT) or insufficient authority (NOT_EXECUTED) is a
 * successful HTTP response carrying a verdict, not an HTTP failure.
 */
export function registerExecuteRoute(
  fastify: FastifyInstance,
  store: KaiMemoryStore,
  jsonError: JsonError,
  attestationSigningKey?: string
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
        attestation: null,
        attestation_status: 'NOT_ELIGIBLE',
        upgrade: compressTowardUpgrade({ cycleStatus: 'DIVERGENT', evidenceHash: null }),
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
        attestation: null,
        attestation_status: 'NOT_ELIGIBLE',
        upgrade: compressTowardUpgrade({ cycleStatus: 'NOT_EXECUTED', evidenceHash: null }),
      });
    }
    recordStep('KAI', 'OBSERVE', 'OBSERVED', 'No known fraud pattern matched; authority is sufficient. Observation is not verification.');

    const cycle = await runKaixelionOmega({
      intent,
      authority: authorityLevel,
      observed: '',
      source: 'caller',
      witness: null,
      memory: [],
    });
    if (cycle.status === 'DIVERGENT' || cycle.status === 'NOT_EXECUTED') {
      for (const step of cycle.steps) {
        recordStep(step.actor, step.phase, step.status, step.detail);
      }
      const haltedAttestation = attestExecution({
        status: cycle.status,
        evidenceHash: null,
        contractId: null,
        checks: [],
        signingKey: attestationSigningKey,
      });
      return reply.status(200).send({
        success: true,
        status: cycle.status,
        intent,
        response: null,
        evidence_hash: null,
        reason: cycle.reason,
        matched_patterns: cycle.matchedLabels,
        steps,
        contract: null,
        memory: null,
        engine: null,
        model_error: null,
        evaluated_at: new Date().toISOString(),
        attestation: haltedAttestation.attestation,
        attestation_status: haltedAttestation.status,
        cycle: {
          equation: cycle.equation,
          status: cycle.status,
          ledgerMutation: cycle.ledgerMutation,
          remembered: false,
          independentObservation: false,
        },
        upgrade: compressTowardUpgrade({ cycleStatus: cycle.status, evidenceHash: null }),
      });
    }

    const elion = await executeElion(intent, authorityLevel, body.useExternalModel === true);
    recordStep(
      'ELION',
      'EXECUTE',
      elion.error ? 'UNKNOWN' : 'COMPOSED',
      elion.error
        ? `Answer unavailable from ${elion.engine}: ${elion.error}. UNKNOWN preserved.`
        : `Sentence composed via ${elion.engine}. Composition is not verification.`
    );
    recordStep('OMEGA', 'VERIFY', cycle.status, cycle.reason);
    recordStep('KAI', 'REMEMBER', cycle.status, 'Nothing was written to KaiMemory. The cycle tuple is not a ledger write.');

    const executionAttestation = attestExecution({
      status: cycle.status,
      evidenceHash: null,
      contractId: null,
      checks: [],
      signingKey: attestationSigningKey,
    });

    return reply.status(200).send({
      success: true,
      status: cycle.status,
      intent,
      response: elion.output || null,
      evidence_hash: null,
      reason: cycle.reason,
      matched_patterns: [],
      steps,
      contract: null,
      memory: null,
      engine: elion.engine,
      model_error: elion.error,
      evaluated_at: new Date().toISOString(),
      attestation: executionAttestation.attestation,
      attestation_status: executionAttestation.status,
      cycle: {
        equation: cycle.equation,
        status: cycle.status,
        ledgerMutation: cycle.ledgerMutation,
        remembered: false,
        independentObservation: cycle.independentObservation,
      },
      upgrade: compressTowardUpgrade({ cycleStatus: cycle.status, evidenceHash: null }),
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
