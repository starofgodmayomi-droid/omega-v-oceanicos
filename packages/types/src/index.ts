export interface IObservation {
  readonly uuid: string;
  readonly timestamp: string;
  readonly siliconYield: number;
  readonly gridLoadMegawatts: number;
  readonly acceleratorInventory: number;
}

export interface IEvidence {
  readonly status: 'PASS' | 'FAIL' | 'DIVERGENT';
  readonly lawRoute: string;
  readonly timestamp: string;
  readonly observationUuid: string;
  readonly signatureProof: string;
}

export interface IMiniBlock {
  readonly index: number;
  readonly timestamp: string;
  readonly observation: IObservation;
  readonly evidence: IEvidence;
  readonly previousHash: string;
  readonly hash: string;
  readonly nonce: number;
}

/**
 * Independent ledger-chain verification evidence.
 * Observation of a tip (`getTip`) is not this result.
 */
export type LedgerIntegrityReason =
  | 'HASH_MISMATCH'
  | 'PREVIOUS_HASH_MISMATCH'
  | 'POW_INVALID'
  | 'INDEX_GAP'
  | 'GENESIS_MISMATCH'
  | 'PARSE_FAILURE';

export interface LedgerIntegrity {
  readonly valid: boolean;
  readonly height: number;
  readonly genesisHash: string | null;
  readonly tipHash: string | null;
  readonly brokenAt?: number;
  readonly reason?: LedgerIntegrityReason;
}

export interface VerificationResultSummary {
  readonly passed: boolean;
  readonly confidence: number;
  readonly rulesApplied?: number;
  readonly rulesPassed?: number;
  readonly rulesFailed?: number;
}

export interface VerificationResult {
  readonly id: string;
  readonly observationId: string;
  readonly timestamp?: string;
  readonly summary: VerificationResultSummary;
  readonly ruleVersions?: Record<string, string>;
  readonly status?: 'pending' | 'completed' | 'failed';
}

export interface Attestation {
  id: string;
  verificationId: string;
  observationId: string;
  verified: boolean;
  confidence: number;
  signature: string;
  signingKey: string;
  keyVersion: string;
  signingAlgorithm: string;
  attestedAt: string;
  attestedBy: string;
  ruleVersions?: Record<string, string>;
  verifyingPublicKey?: string;
  status: 'signed' | 'revoked' | 'expired';
}

/**
 * Decision made about whether a candidate change is admissible.
 *
 * This is intentionally a data contract only. It does not grant authority,
 * execute a transition, or claim that a resulting state exists.
 */
export type ChangeDecision = 'ALLOW' | 'DENY' | 'REVIEW';

/**
 * Independent lifecycle evidence state. `UNKNOWN` is intentional: absence of
 * an observation must never be upgraded to a positive claim.
 */
export type OmegaLifecycleStatus = 'YES' | 'NO' | 'UNKNOWN';

/**
 * Status vector for a consequential change. These fields are deliberately
 * separate so local implementation or execution cannot imply deployment or
 * health.
 */
export interface OmegaStatusVector {
  readonly declared: OmegaLifecycleStatus;
  readonly represented: OmegaLifecycleStatus;
  readonly implemented: OmegaLifecycleStatus;
  readonly tested: OmegaLifecycleStatus;
  readonly admitted: OmegaLifecycleStatus;
  readonly executed: OmegaLifecycleStatus;
  readonly observed: OmegaLifecycleStatus;
  readonly verified: OmegaLifecycleStatus;
  readonly attested: OmegaLifecycleStatus;
  readonly deployed: OmegaLifecycleStatus;
  readonly healthy: OmegaLifecycleStatus;
}

/**
 * Minimal Ω∞v change/decision record binding existing observation,
 * verification, authority, policy, transition, attestation, and provenance.
 */
export interface OmegaChangeRecord {
  readonly id: string;
  readonly subject: string;
  readonly intent: string;
  readonly stateBefore: string;
  readonly evidence: readonly string[];
  readonly authority: string | null;
  readonly policy: string | null;
  readonly context?: Record<string, unknown>;
  readonly decision: ChangeDecision;
  readonly authorized: boolean;
  readonly transition?: string;
  readonly stateAfter?: string;
  readonly consequence?: string;
  readonly attestationId?: string;
  readonly provenance: {
    readonly source: string;
    readonly observedAt: string;
    readonly attributedTo: string | null;
    readonly lineage?: readonly string[];
  };
  readonly createdAt: string;
}

/** Machine-readable reality state for declarative verification receipts. */
export type RealityStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

export interface ObservationEnvelope<T = unknown> {
  readonly id: string;
  readonly timestamp: string;
  readonly subject: string;
  readonly payload: T;
  readonly confidence: number;
  readonly provenanceSignature: string;
}

export interface VerificationPredicate {
  readonly ruleId: string;
  readonly expression: string;
  readonly evaluatedTrue: boolean;
  readonly evidencePath: string;
}

export interface VerificationReceipt {
  readonly observationId: string;
  readonly verifiedAt: string;
  readonly status: RealityStatus;
  readonly passedPredicates: readonly VerificationPredicate[];
  readonly failedPredicates: readonly VerificationPredicate[];
  readonly digest: string;
}

export interface ChangeTransaction {
  readonly stateBefore: Record<string, unknown>;
  readonly intent: string;
  readonly evidenceHash: string;
  readonly authoritySignature: string;
  readonly policyId: string;
  readonly decision: ChangeDecision;
  readonly stateAfter: Record<string, unknown>;
  readonly attestationToken?: string;
}

export * from './omega-ir.js';
export * from './change-calculus.js';
export * from './worker-registry.js';
export * from './omega-command.js';
export * from './scene.js';
export * from './navigator-contract.js';
export * from './water-flow.js';

export type SceneState =
  | 'darkness'
  | 'possibility'
  | 'ocean'
  | 'star'
  | 'water-form'
  | 'many-forms'
  | 'loneliness'
  | 'human-form'
  | 'misrecognition'
  | 'boundary'
  | 'question'
  | 'forest'
  | 'return';

export type SceneSimulationInput = {
  seed?: string;
  steps?: number;
  branches?: number;
};

export type SceneTrace = Array<{
  sequence: number;
  state: SceneState;
  from: SceneState | null;
  to: SceneState;
  transition: 'origin' | 'advance';
  status: 'observed' | 'verified';
  evidence: string;
}>;

export type SceneBranch = {
  id: string;
  index: number;
  perspective: string;
  states: SceneState[];
  terminalState: SceneState;
  trace: SceneTrace;
  divergenceEvidence: string;
};

export interface SceneSimulation {
  id: string;
  seed: string;
  equation: string;
  states: SceneState[];
  terminalState: SceneState;
  trace: SceneTrace;
  branches: SceneBranch[];
  branchCount: number;
  continuation: 'bounded-sample-of-infinite-potential';
  provenance: {
    source: 'local-simulation';
    ruleVersion: 'scene-equation.v2';
    deterministic: true;
    verified: false;
    note: string;
  };
  createdAt: string;
}

export * from './network-intelligence.js';
