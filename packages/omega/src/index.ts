/**
 * OMEGA — the Judge of Ω∞v Oceanicos (see ECOSYSTEM_BODY.md).
 *
 * Reconciliation comes from the judge primitives implemented in
 * `@oceanicos/mini` and `@oceanicos/verification`; this package is the named
 * entry point for them, not a second implementation. OMEGA compares a recorded
 * expectation with an observed reality and fails closed: anything it cannot
 * attest is reported as UNKNOWN, DIVERGENT, or NOT_EXECUTED — never as verified.
 */
export { admitOmegaIR } from '@oceanicos/mini';
export type { OmegaAdmissionBridgeInput, OmegaAdmissionBridgeResult } from '@oceanicos/mini';
export type { OmegaIRValidation, OmegaIRValidationIssue } from '@oceanicos/mini';
export { verifyExecutedReality } from '@oceanicos/mini';
export type {
  RealityObserverOptions,
  RealityVerification,
  RealityVerificationStatus,
} from '@oceanicos/mini';
export { createRealityAttestation, verifyRealityAttestation } from '@oceanicos/mini';
export type { RealityAttestation } from '@oceanicos/mini';
export { reconcileRepositoryState } from '@oceanicos/mini';
export type { RepositoryReconciliation, RepositoryReconciliationStatus } from '@oceanicos/mini';
export { VerificationEngine } from '@oceanicos/verification';
