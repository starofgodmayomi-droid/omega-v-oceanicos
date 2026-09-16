import type {
  OmegaIR,
  OmegaWorkerRegistry,
  OmegaChangeRecord,
} from '@oceanicos/types';
import { resolveChangeAdmission, type OmegaAdmissionEvidence } from './admission.js';

export interface OmegaAdmissionBridgeInput extends OmegaAdmissionEvidence {
  readonly ir: OmegaIR;
  readonly registry: OmegaWorkerRegistry;
  readonly change: OmegaChangeRecord;
  /** Explicitly verified human approval when any planned worker requires it. */
  readonly approvalVerified: boolean;
}

export interface OmegaAdmissionBridgeResult {
  readonly change: OmegaChangeRecord;
  readonly registryMatched: boolean;
  readonly policyReferencesSatisfied: boolean;
  readonly evidenceRequirementsSatisfied: boolean;
  readonly approvalRequirementSatisfied: boolean;
  readonly issues: readonly string[];
}

const normalize = (value: string): string => value.trim();

/**
 * Binds declarative ΩIR to the bounded worker registry and existing
 * authority/policy admission gate. This bridge validates declarations only;
 * it does not grant authority, execute workers, or inspect external reality.
 */
export function admitOmegaIR(input: OmegaAdmissionBridgeInput): OmegaAdmissionBridgeResult {
  const issues: string[] = [];
  const workersById = new Map(input.registry.workers.map((worker) => [worker.id, worker]));
  let approvalRequired = false;

  for (const plan of input.ir.workerPlan) {
    const worker = workersById.get(normalize(plan.workerId));
    if (!worker) {
      issues.push(`Unknown worker: ${plan.workerId}`);
      continue;
    }

    approvalRequired ||= worker.approvalRequired;

    if (worker.version !== normalize(plan.version)) {
      issues.push(`Worker version mismatch: ${plan.workerId}`);
    }
    if (worker.mode !== plan.mode) {
      issues.push(`Worker mode mismatch: ${plan.workerId}`);
    }
    if (worker.id !== normalize(plan.workerId)) {
      issues.push(`Worker id mismatch: ${plan.workerId}`);
    }
    if (worker.capability !== normalize(plan.capability)) {
      issues.push(`Worker capability mismatch: ${plan.workerId}`);
    }
    if (worker.approvalRequired !== plan.approvalRequired) {
      issues.push(`Worker approval requirement mismatch: ${plan.workerId}`);
    }
  }

  const policyReferences = new Set(input.ir.policyRefs.map((policy) => policy.id));
  const registryPolicyReferences = new Set(
    input.ir.workerPlan.flatMap((plan) => workersById.get(normalize(plan.workerId))?.policyRefs ?? []),
  );
  const policyReferencesSatisfied = [...registryPolicyReferences].every((policy) => policyReferences.has(policy));
  if (!policyReferencesSatisfied) {
    issues.push('IR policy references do not satisfy declared worker policy requirements');
  }
  if (input.change.policy && !policyReferences.has(normalize(input.change.policy))) {
    issues.push('Change policy reference is not declared by the IR');
  }

  const evidenceReferencesById = new Map(input.ir.evidenceRefs.map((evidence) => [evidence.id, evidence]));
  const evidenceReferences = new Set(input.ir.evidenceRefs.map((evidence) => evidence.kind));
  const registryEvidenceRequirements = new Set(
    input.ir.workerPlan.flatMap((plan) => workersById.get(normalize(plan.workerId))?.evidenceRequired ?? []),
  );
  const evidenceRequirementsSatisfied = [...registryEvidenceRequirements].every((evidence) => evidenceReferences.has(evidence));
  if (!evidenceRequirementsSatisfied) {
    issues.push('IR evidence references do not satisfy declared worker evidence requirements');
  }
  if (!input.change.evidence.every((evidenceId) => evidenceReferencesById.has(normalize(evidenceId)))) {
    issues.push('Change evidence contains references not declared by the IR');
  }

  const approvalRequirementSatisfied = !approvalRequired || input.approvalVerified;
  if (!approvalRequirementSatisfied) {
    issues.push('Required worker approval evidence is missing');
  }

  const registryMatched = issues.length === 0;
  const admitted = registryMatched
    ? resolveChangeAdmission(input.change, input)
    : { ...input.change, decision: 'DENY' as const, authorized: false };

  return {
    change: admitted,
    registryMatched,
    policyReferencesSatisfied,
    evidenceRequirementsSatisfied,
    approvalRequirementSatisfied,
    issues,
  };
}
