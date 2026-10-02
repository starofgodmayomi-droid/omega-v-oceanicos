import { createHash } from 'node:crypto';
import type {
  OmegaChangeRecord,
  OmegaIR,
  OmegaStatusVector,
  OmegaWorkerCapability,
  OmegaWorkerRegistry,
} from '@oceanicos/types';
import { resolveChangeAdmission, type OmegaAdmissionEvidence } from './admission.js';
import { admitOmegaIR } from './admission-bridge.js';
import { compileOmegaIntent, type OmegaCompileInput } from './compiler.js';
import { validateOmegaIR, type OmegaIRValidation } from './ir-validator.js';
import {
  executeAuthorizedTransition,
  type TransitionExecution,
  type TransitionExecutorOptions,
  type TransitionHandler,
  type TransitionMemory,
} from './transition.js';
import {
  verifyExecutedReality,
  type RealityObserverOptions,
  type RealityVerification,
} from './reality.js';
import { getOmegaWorker } from './worker-registry.js';
import { createRealityAttestation, type RealityAttestation } from './causal-memory.js';

export type PipelineStage =
  | 'COMPILE'
  | 'VALIDATE'
  | 'ADMIT'
  | 'EXECUTE'
  | 'OBSERVE'
  | 'RECONCILE'
  | 'HALTED';

export type PipelineHaltReason =
  | 'IR_INVALID'
  | 'DENIED'
  | 'REVIEW_REQUIRED'
  | 'REFUSED'
  | 'WORKER_NOT_FOUND'
  | 'WORKER_APPROVAL_REQUIRED'
  | 'DRY_RUN';

export interface OmegaPipelineInput {
  readonly compile: OmegaCompileInput;
  /** Explicit authority/policy gate evidence. Never inferred. */
  readonly admission: OmegaAdmissionEvidence;
  /** Authority and policy identity recorded on the change (references only). */
  readonly authority: string;
  readonly policy: string;
  /** Optional worker registry for bounded handler resolution. */
  readonly registry?: OmegaWorkerRegistry;
  /** Preferred worker id from IR plan; falls back to first plan entry. */
  readonly workerId?: string;
  /**
   * Explicit transition handler. Required unless a registry worker can be
   * resolved and a default local-mutating handler is acceptable.
   */
  readonly handler?: TransitionHandler;
  /** External observation of post-execution state. Required for VERIFIED. */
  readonly observeState?: () => string;
  readonly memory?: TransitionMemory;
  readonly now?: () => string;
  /** Deterministic change id for tests; otherwise derived from IR + time. */
  readonly changeId?: string;
  /** Explicit human approval evidence when a planned worker requires it. Never inferred true. */
  readonly approvalVerified?: boolean;
  /** Explicit C7 signing key; absent means no reality attestation is created. */
  readonly realityAttestationKey?: string;
  readonly realityAttestationSignerId?: string;
  readonly realityAttestationKeyVersion?: string;
}

export interface OmegaPipelineResult {
  readonly stage: PipelineStage;
  readonly halted: boolean;
  readonly haltReason?: PipelineHaltReason;
  readonly ir?: OmegaIR;
  readonly validation?: OmegaIRValidation;
  readonly record?: OmegaChangeRecord;
  readonly execution?: TransitionExecution;
  readonly reality?: RealityVerification;
  readonly realityAttestation?: RealityAttestation;
  readonly statusVector: OmegaStatusVector;
  readonly provenanceRoot: string;
  readonly lineage: readonly string[];
}

const sha256 = (payload: string): string => createHash('sha256').update(payload).digest('hex');

const buildProvenanceRoot = (parts: readonly string[]): string =>
  `prov-root-${sha256(JSON.stringify(parts))}`;

const statusVector = (overrides: Partial<OmegaStatusVector> = {}): OmegaStatusVector => ({
  declared: 'YES',
  represented: 'UNKNOWN',
  implemented: 'UNKNOWN',
  tested: 'UNKNOWN',
  admitted: 'UNKNOWN',
  executed: 'UNKNOWN',
  observed: 'UNKNOWN',
  verified: 'UNKNOWN',
  attested: 'UNKNOWN',
  deployed: 'UNKNOWN',
  healthy: 'UNKNOWN',
  ...overrides,
});

/**
 * Resolve a bounded transition handler from the worker registry.
 *
 * Workers are not sovereign. Missing workers, approval-required workers without
 * explicit handler override, and external-consequence modes without an explicit
 * handler all fail closed.
 */
export function resolveBoundedWorkerHandler(
  registry: OmegaWorkerRegistry | undefined,
  workerId: string | undefined,
  planWorkerId: string | undefined,
  explicitHandler: TransitionHandler | undefined,
  requestedStateAfter: string | undefined,
  consequence: string | undefined,
  dryRun: boolean,
): { handler?: TransitionHandler; worker?: OmegaWorkerCapability; error?: PipelineHaltReason } {
  if (explicitHandler) {
    return { handler: explicitHandler };
  }

  const id = workerId ?? planWorkerId;
  if (!id || !registry) {
    return { error: 'WORKER_NOT_FOUND' };
  }

  const worker = getOmegaWorker(registry, id);
  if (!worker) {
    return { error: 'WORKER_NOT_FOUND' };
  }

  if (worker.approvalRequired) {
    return { worker, error: 'WORKER_APPROVAL_REQUIRED' };
  }

  if (worker.mode === 'external-consequence' && !explicitHandler) {
    return { worker, error: 'WORKER_APPROVAL_REQUIRED' };
  }

  if (dryRun) {
    return { worker, error: 'DRY_RUN' };
  }

  if (!requestedStateAfter?.trim()) {
    return { worker, error: 'WORKER_NOT_FOUND' };
  }

  // Local bounded default: only returns the declared requested state.
  // No network, no shell, no hidden side effects.
  const handler: TransitionHandler = () => ({
    stateAfter: requestedStateAfter.trim(),
    consequence: consequence ?? `worker:${worker.id} advanced state`,
  });

  return { handler, worker };
}

/**
 * Unified Ω∞v change pipeline:
 *
 *   COMPILE → VALIDATE → ADMIT → EXECUTE → OBSERVE → (VERIFIED|DIVERGENT|HALTED)
 *
 * Composes existing modules only. Does not grant authority, invent evidence,
 * or claim reality beyond the supplied observation function.
 */
export function runOmegaChangePipeline(input: OmegaPipelineInput): OmegaPipelineResult {
  const now = input.now ?? (() => new Date().toISOString());
  const lineage: string[] = [];
  const memory = input.memory;
  const appendRecord = (record: OmegaChangeRecord): void => {
    if (!memory?.appendCausal) memory?.append(record);
  };

  // C0/C1 — Compile
  const ir = compileOmegaIntent(input.compile);
  lineage.push(`compile:${sha256(JSON.stringify(ir)).slice(0, 16)}`);

  // C2 — Validate
  const validation = validateOmegaIR(ir);
  if (!validation.valid) {
    return {
      stage: 'VALIDATE',
      halted: true,
      haltReason: 'IR_INVALID',
      ir,
      validation,
      statusVector: statusVector({ represented: 'YES', implemented: 'NO' }),
      provenanceRoot: buildProvenanceRoot(lineage),
      lineage,
    };
  }
  lineage.push('validate:ok');

  // Build change record from IR (still unauthorized until admission)
  const changeId =
    input.changeId ??
    `change-${sha256(`${ir.intent}:${ir.transitionSpec.subject}:${now()}`).slice(0, 24)}`;
  const observedAt = now();
  let record: OmegaChangeRecord = {
    id: changeId,
    subject: ir.transitionSpec.subject,
    intent: ir.intent,
    stateBefore: ir.transitionSpec.stateBefore,
    evidence: ir.evidenceRefs.map((ref) => ref.digest ?? `${ref.kind}:${ref.id}`),
    authority: input.authority,
    policy: input.policy,
    context: {
      omegaIrVersion: ir.version,
      workerPlan: ir.workerPlan,
      observationSpec: ir.observationSpec,
      dryRun: ir.transitionSpec.dryRun,
    },
    decision: 'REVIEW',
    authorized: false,
    provenance: {
      source: 'mini-pipeline',
      observedAt,
      attributedTo: null,
      lineage: [...lineage],
    },
    createdAt: observedAt,
  };

  // C4 — Admit. When a worker plan and registry are both present, bind IR
  // declarations to the registry before the authority/policy gate.
  if (input.registry && ir.workerPlan.length > 0) {
    const approvalRequired = ir.workerPlan.some((plan) => plan.approvalRequired);
    const bridge = admitOmegaIR({
      ir,
      registry: input.registry,
      change: record,
      authorityVerified: input.admission.authorityVerified,
      policySatisfied: input.admission.policySatisfied,
      approvalVerified: input.approvalVerified ?? !approvalRequired,
    });
    record = bridge.change;
    lineage.push(`admit:${record.decision}`);
    if (bridge.issues.length > 0) {
      lineage.push(`admit-bridge:${bridge.issues[0]}`);
    }
  } else {
    record = resolveChangeAdmission(record, input.admission);
    lineage.push(`admit:${record.decision}`);
  }
  if (record.decision === 'DENY') {
    appendRecord(record);
    return {
      stage: 'ADMIT',
      halted: true,
      haltReason: 'DENIED',
      ir,
      validation,
      record,
      statusVector: statusVector({ represented: 'YES', implemented: 'YES', admitted: 'NO' }),
      provenanceRoot: buildProvenanceRoot(lineage),
      lineage,
    };
  }
  if (record.decision !== 'ALLOW') {
    appendRecord(record);
    return {
      stage: 'ADMIT',
      halted: true,
      haltReason: 'REVIEW_REQUIRED',
      ir,
      validation,
      record,
      statusVector: statusVector({ represented: 'YES', implemented: 'YES', admitted: 'UNKNOWN' }),
      provenanceRoot: buildProvenanceRoot(lineage),
      lineage,
    };
  }

  // C3/C5 — Worker resolution + execute
  const planWorkerId = ir.workerPlan[0]?.workerId;
  const resolved = resolveBoundedWorkerHandler(
    input.registry,
    input.workerId,
    planWorkerId,
    input.handler,
    ir.transitionSpec.requestedStateAfter,
    ir.transitionSpec.consequence,
    ir.transitionSpec.dryRun,
  );

  if (!resolved.handler) {
    appendRecord(record);
    return {
      stage: 'EXECUTE',
      halted: true,
      haltReason: resolved.error ?? 'WORKER_NOT_FOUND',
      ir,
      validation,
      record,
      statusVector: statusVector({ represented: 'YES', implemented: 'YES', admitted: 'YES', executed: 'NO' }),
      provenanceRoot: buildProvenanceRoot(lineage),
      lineage: [...lineage, `worker:${resolved.error ?? 'missing'}`],
    };
  }

  if (resolved.worker) {
    lineage.push(`worker:${resolved.worker.id}@${resolved.worker.version}`);
  }

  const execOptions: TransitionExecutorOptions = {
    memory: memory?.appendCausal ? { append: () => undefined } : memory,
    now,
  };
  const execution = executeAuthorizedTransition(record, resolved.handler, execOptions);
  lineage.push(`execute:${execution.status}`);
  if (execution.attestationId) {
    lineage.push(execution.attestationId);
  }

  if (execution.status !== 'EXECUTED') {
    return {
      stage: 'EXECUTE',
      halted: true,
      haltReason: execution.status === 'REFUSED' ? 'REFUSED' : 'REVIEW_REQUIRED',
      ir,
      validation,
      record: execution.record,
      execution,
      statusVector: statusVector({ represented: 'YES', implemented: 'YES', tested: 'YES', admitted: 'YES', executed: 'NO' }),
      provenanceRoot: buildProvenanceRoot(lineage),
      lineage,
    };
  }

  // C6 — Reality observation (optional; without observeState we stop at EXECUTE)
  if (!input.observeState) {
    return {
      stage: 'EXECUTE',
      halted: false,
      ir,
      validation,
      record: execution.record,
      execution,
      statusVector: statusVector({ represented: 'YES', implemented: 'YES', admitted: 'YES', executed: 'YES' }),
      provenanceRoot: buildProvenanceRoot(lineage),
      lineage,
    };
  }

  const realityMemory = memory?.appendCausal
    ? { append: (_record: OmegaChangeRecord) => undefined }
    : memory;
  const realityOptions: RealityObserverOptions = { memory: realityMemory, now };
  const reality = verifyExecutedReality(execution, input.observeState, realityOptions);
  lineage.push(`reality:${reality.status}`);
  if (reality.evidence.startsWith('sha256:')) {
    lineage.push(reality.evidence);
  }

  let realityAttestation: RealityAttestation | undefined;
  if (input.realityAttestationKey?.trim()) {
    realityAttestation = createRealityAttestation(reality.record, reality, {
      key: input.realityAttestationKey,
      signerId: input.realityAttestationSignerId,
      keyVersion: input.realityAttestationKeyVersion,
      attestedAt: now(),
    });
    if (memory?.appendCausal) {
      memory.appendCausal(reality.record, reality, realityAttestation);
    }
  } else if (memory?.appendCausal) {
    throw new Error('durable causal memory requires a reality attestation key');
  }

  return {
    stage: 'RECONCILE',
    halted: false,
    ir,
    validation,
    record: reality.record,
    execution,
    reality,
    realityAttestation,
    statusVector: statusVector({
      represented: 'YES',
      implemented: 'YES',
      tested: 'YES',
      admitted: 'YES',
      executed: 'YES',
      observed: 'YES',
      verified: reality.status === 'VERIFIED' ? 'YES' : reality.status === 'DIVERGENT' ? 'NO' : 'UNKNOWN',
      attested: execution.attestationId ? 'YES' : 'UNKNOWN',
    }),
    provenanceRoot: buildProvenanceRoot(lineage),
    lineage,
  };
}
