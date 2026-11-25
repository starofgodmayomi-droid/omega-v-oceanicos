/**
 * LucidContinuum convergence contract.
 *
 * The supplied equation is a design axiom, not a measurement of infinity,
 * consciousness, cosmology, or physical reality:
 *
 *   lim(N→∞) ∮(M_V) ∇Ψ(x,t) dμ = 1
 *
 * Here a transition is accepted only when its finite verification surface is
 * complete and explicitly authorized. Repetition means finite transitions,
 * never hidden self-modification or unlimited authority.
 */

export type ContinuumEvidenceState =
  | 'OBSERVED'
  | 'VERIFIED'
  | 'AUTHORIZED'
  | 'EXECUTING'
  | 'UNKNOWN'
  | 'DIVERGENT'
  | 'NOT_EXECUTED';

export interface ContinuumCheckInput {
  readonly transitionId: string;
  readonly baseline: string;
  readonly candidate: string;
  readonly evidence: readonly string[];
  readonly authorized: boolean;
}

export interface ContinuumTransition {
  readonly transitionId: string;
  readonly baseline: string;
  readonly candidate: string;
  readonly delta: 'NO_CHANGE' | 'STATE_DELTA';
  readonly evidence: readonly string[];
  readonly state: ContinuumEvidenceState;
  readonly authorized: boolean;
  readonly verified: boolean;
}

/** Evaluate one finite Δ against the declared verification surface. */
export function evaluateContinuumTransition(input: ContinuumCheckInput): ContinuumTransition {
  const hasIdentity = input.transitionId.trim().length > 0;
  const hasStates = input.baseline.trim().length > 0 && input.candidate.trim().length > 0;
  const hasEvidence = input.evidence.length > 0 && input.evidence.every((item) => item.trim().length > 0);
  const verified = hasIdentity && hasStates && hasEvidence && input.authorized;

  return Object.freeze({
    transitionId: input.transitionId,
    baseline: input.baseline,
    candidate: input.candidate,
    delta: input.baseline === input.candidate ? 'NO_CHANGE' : 'STATE_DELTA',
    evidence: Object.freeze([...input.evidence]),
    state: verified ? 'VERIFIED' : input.authorized ? 'DIVERGENT' : 'NOT_EXECUTED',
    authorized: input.authorized,
    verified,
  });
}

/** Stable JSON representation for an outer SHA-256 provenance adapter. */
export function canonicalizeContinuumTransition(transition: ContinuumTransition): string {
  return JSON.stringify({
    transitionId: transition.transitionId,
    baseline: transition.baseline,
    candidate: transition.candidate,
    delta: transition.delta,
    evidence: [...transition.evidence],
    state: transition.state,
    authorized: transition.authorized,
    verified: transition.verified,
  });
}
