import type { ChangeDecision, OmegaChangeRecord } from './index.js';

/** The four observable outcomes for a consequential transition. */
export type OmegaRealityStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

/** Declarative input to the Ω Change Calculus. It never executes a transition. */
export interface OmegaChangeTuple {
  readonly state: string;
  readonly intent: string;
  readonly evidence: readonly string[];
  readonly authority: string | null;
  readonly policy: string | null;
  readonly context: Readonly<Record<string, string>>;
}

/** The canonical worker constitution carried by an admitted plan. */
export interface OmegaWorkerConstitution {
  readonly identity: string;
  readonly capability: string;
  readonly scope: string;
  readonly authority: string | null;
  readonly policy: string;
  readonly expiresAt: string;
  readonly rateLimit: string;
  readonly resourceLimit: string;
  readonly dataLimit: string;
  readonly revocable: true;
  readonly auditable: true;
  readonly stoppable: true;
}

/** Required evidence boundary for a status claim. */
export interface OmegaRealityEvidence {
  readonly authorized: boolean;
  readonly executed: boolean;
  readonly observed: boolean;
  readonly expectedMatchesActual: boolean | null;
  readonly evidenceValid: boolean;
  readonly provenanceIntact: boolean;
}

/** A machine-readable, non-executable change proposal. */
export interface OmegaCanonicalChangeRecord extends OmegaChangeRecord {
  readonly calculus: 'omega.change.v1';
  readonly tuple: OmegaChangeTuple;
  readonly reality: OmegaRealityEvidence;
  readonly status: OmegaRealityStatus;
  readonly workers: readonly OmegaWorkerConstitution[];
}

export const OMEGA_CHANGE_CALCULUS_VERSION = 'omega.change.v1' as const;

/**
 * Classifies observed reality without promoting missing evidence.
 * Authorization and verification are intentionally separate decisions.
 */
export function classifyOmegaReality(input: OmegaRealityEvidence): OmegaRealityStatus {
  if (!input.executed) return 'NOT_EXECUTED';
  if (!input.authorized || !input.observed) return 'UNKNOWN';
  if (!input.evidenceValid || !input.provenanceIntact) return 'UNKNOWN';
  if (input.expectedMatchesActual === false) return 'DIVERGENT';
  if (input.expectedMatchesActual !== true) return 'UNKNOWN';
  return 'VERIFIED';
}

/** Admission law: DENY and REVIEW never execute; ALLOW still requires authority. */
export function canExecuteOmegaDecision(
  decision: ChangeDecision,
  authorized: boolean,
): boolean {
  return decision === 'ALLOW' && authorized;
}

/** Prevents the forbidden silent UNKNOWN → VERIFIED promotion. */
export function canPromoteOmegaReality(
  from: OmegaRealityStatus,
  to: OmegaRealityStatus,
): boolean {
  return !(from === 'UNKNOWN' && to === 'VERIFIED');
}

/** Minimal structural check for boundary adapters before persistence or execution. */
export function validateOmegaChangeTuple(tuple: OmegaChangeTuple): void {
  if (!tuple.state.trim()) throw new Error('change tuple state is required');
  if (!tuple.intent.trim()) throw new Error('change tuple intent is required');
  if (tuple.evidence.some((item) => !item.trim())) {
    throw new Error('change tuple evidence entries must be non-empty');
  }
  if (tuple.intent.length > 2000) throw new Error('change tuple intent is bounded to 2000 characters');
}
