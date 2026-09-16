/**
 * Versioned, declarative Ω∞v intermediate representation.
 *
 * This contract is intentionally non-executable: it describes intent,
 * evidence, policy, workers, transitions, and observations without granting
 * authority or embedding executable code.
 */
export type OmegaIRVersion = 'omega-ir.v1';

export interface OmegaEvidenceRef {
  readonly id: string;
  readonly kind: string;
  readonly source: string;
  readonly digest?: string;
}

export interface OmegaPolicyRef {
  readonly id: string;
  readonly version: string;
  readonly requirement: string;
}

export interface OmegaWorkerPlan {
  readonly workerId: string;
  readonly version: string;
  readonly capability: string;
  readonly mode: 'read-only' | 'build-test' | 'local-mutating' | 'external-consequence';
  readonly approvalRequired: boolean;
}

export interface OmegaTransitionSpec {
  readonly subject: string;
  readonly intent: string;
  readonly stateBefore: string;
  readonly requestedStateAfter?: string;
  readonly consequence?: string;
  readonly dryRun: boolean;
}

export interface OmegaObservationSpec {
  readonly observerId: string;
  readonly targets: readonly string[];
  readonly evidenceRequired: readonly string[];
}

/**
 * Deterministic input/output shape for the first Ω compiler boundary.
 * `workerPlan` describes declared capabilities; it does not execute them.
 */
export interface OmegaIR {
  readonly version: OmegaIRVersion;
  readonly intent: string;
  readonly evidenceRefs: readonly OmegaEvidenceRef[];
  readonly policyRefs: readonly OmegaPolicyRef[];
  readonly workerPlan: readonly OmegaWorkerPlan[];
  readonly transitionSpec: OmegaTransitionSpec;
  readonly observationSpec: OmegaObservationSpec;
}
