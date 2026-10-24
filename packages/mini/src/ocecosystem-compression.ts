/**
 * 💧 Ω∞v ocecosystem compression — selection boundary only.
 *
 * Source law:
 *   W(t+1) = RECONCILE(W(t), VERIFY[EXECUTE_A(argmax_{Δ in F_A}
 *            V_verified(Δ) / (R(Δ) + C(Δ) + ε))])
 *
 * This module scores caller-declared candidates. It does not execute,
 * observe reality, attest, or advance a world except as a revision label
 * when the caller already supplies VERIFIED evidence and an attestation ref.
 * Declared numbers are not measurements.
 */

export const OCEANICOS_SINGLE_LINE =
  'OCEANICOS := FIXPOINT(UNIFY(ALL_SYSTEMS)) → OBSERVE(REALITY) → RECONCILE(INTENT, STATE, EVIDENCE) → SELECT_BEST_AUTHORIZED_ACTION → IMPLEMENT → TEST → VERIFY → ATTEST → UPDATE_MEMORY → MEASURE → REPEAT; SUBJECT_TO(TRUTH, SAFETY, PRIVACY, CONSENT, SECURITY, HUMAN_AUTHORITY).';

export const OCECOSYSTEM_CONSTRAINTS = [
  'TRUTH',
  'SAFETY',
  'PRIVACY',
  'CONSENT',
  'SECURITY',
  'HUMAN_AUTHORITY',
] as const;

export type OcecosystemConstraint = (typeof OCECOSYSTEM_CONSTRAINTS)[number];

export const COMPRESSED_ECOSYSTEM_BODY = Object.freeze({
  equation: 'W = (M⊕K⊕I⊕U⊕D) ⊕ (F⊕B⊕AI⊕API⊕G) ⊕ (N⊕X⊕O⊕Z⊕T) ⊕ (V⊕E⊕R⊕Q)',
  mind: Object.freeze({ M: 'memory', K: 'knowledge', I: 'intent', U: 'users', D: 'design' }),
  body: Object.freeze({ F: 'frontend', B: 'backend', AI: 'ai', API: 'apis', G: 'github' }),
  nervousSystem: Object.freeze({
    N: 'notion',
    X: 'integrations',
    O: 'observation',
    Z: 'security',
    T: 'testing',
  }),
  valuesAndTruth: Object.freeze({
    V: 'verifiedValue',
    E: 'execution',
    R: 'reality',
    Q: 'quality',
  }),
  oneBody: 'UNIFY → VERIFY → IMPROVE → RECONCILE → RETURN',
});

export const DEFAULT_SCORE_EPSILON = 1e-9;
const SAFE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:+-]{0,127}$/;

export interface AuthorizedDelta {
  readonly id: string;
  readonly declaredVerifiedValue: number;
  readonly risk: number;
  readonly cost: number;
  readonly authorized: boolean;
  readonly constraints: Readonly<Record<OcecosystemConstraint, boolean>>;
}

export interface ScoredDelta {
  readonly id: string;
  readonly numerator: number;
  readonly denominator: number;
}

export type AuthorizedSelection =
  | {
      readonly status: 'SELECTED';
      readonly phase: 'SELECT_BEST_AUTHORIZED_ACTION';
      readonly execution: 'NOT_STARTED';
      readonly verification: 'NOT_STARTED';
      readonly reconciliation: 'NOT_STARTED';
      readonly evidence: 'DECLARED_SCORES_ONLY';
      readonly selectedId: string;
      readonly tiedIds: readonly [string];
      readonly epsilon: number;
      readonly scored: readonly ScoredDelta[];
    }
  | {
      readonly status: 'TIED' | 'NONE_AUTHORIZED';
      readonly phase: 'SELECT_BEST_AUTHORIZED_ACTION';
      readonly execution: 'NOT_STARTED';
      readonly verification: 'NOT_STARTED';
      readonly reconciliation: 'NOT_STARTED';
      readonly evidence: 'DECLARED_SCORES_ONLY';
      readonly selectedId: null;
      readonly tiedIds: readonly string[];
      readonly epsilon: number;
      readonly scored: readonly ScoredDelta[];
    }
  | {
      readonly status: 'INVALID';
      readonly phase: 'SELECT_BEST_AUTHORIZED_ACTION';
      readonly execution: 'NOT_STARTED';
      readonly verification: 'NOT_STARTED';
      readonly reconciliation: 'NOT_STARTED';
      readonly evidence: 'DECLARED_SCORES_ONLY';
      readonly selectedId: null;
      readonly issues: readonly string[];
    };

export interface ImprovementEvidence {
  readonly worldId: string;
  readonly revision: string;
  readonly selectedId: string;
  readonly verification: 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';
  readonly attestationRef: string | null;
}

export type ImprovementReconciliation =
  | {
      readonly status: 'ADVANCED';
      readonly reason: 'VERIFIED_AND_ATTESTED';
      readonly worldId: string;
      readonly priorRevision: string;
      readonly nextRevision: string;
      readonly selectedId: string;
      readonly attestationRef: string;
      readonly execution: 'NOT_PERFORMED_HERE';
      readonly claim: 'REVISION_LABEL_ONLY';
    }
  | {
      readonly status: 'HELD';
      readonly reason: 'NOT_VERIFIED' | 'NOT_ATTESTED' | 'INVALID';
      readonly worldId: string | null;
      readonly priorRevision: string | null;
      readonly nextRevision: string | null;
      readonly issues: readonly string[];
      readonly execution: 'NOT_PERFORMED_HERE';
      readonly claim: 'NO_VERIFIED_CLAIM';
    };

const finiteNonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function constraintRecord(value: unknown): Record<OcecosystemConstraint, boolean> | null {
  if (!isRecord(value)) return null;
  const keys = Object.keys(value);
  if (keys.length !== OCECOSYSTEM_CONSTRAINTS.length) return null;
  const out = {} as Record<OcecosystemConstraint, boolean>;
  for (const constraint of OCECOSYSTEM_CONSTRAINTS) {
    if (typeof value[constraint] !== 'boolean') return null;
    out[constraint] = value[constraint];
  }
  return out;
}

function admissible(delta: AuthorizedDelta): boolean {
  return delta.authorized && OCECOSYSTEM_CONSTRAINTS.every((constraint) => delta.constraints[constraint]);
}

function beats(left: ScoredDelta, right: ScoredDelta): boolean {
  return left.numerator * right.denominator > right.numerator * left.denominator;
}

export function selectBestAuthorizedAction(input: {
  readonly candidates: readonly AuthorizedDelta[];
  readonly epsilon?: number;
}): AuthorizedSelection {
  const issues: string[] = [];
  const epsilon = input.epsilon ?? DEFAULT_SCORE_EPSILON;
  if (typeof epsilon !== 'number' || !Number.isFinite(epsilon) || epsilon <= 0) {
    issues.push('epsilon must be a finite number greater than 0');
  }
  if (!Array.isArray(input.candidates)) {
    issues.push('candidates must be an array');
  }
  if (issues.length || !Array.isArray(input.candidates)) {
    return {
      status: 'INVALID',
      phase: 'SELECT_BEST_AUTHORIZED_ACTION',
      execution: 'NOT_STARTED',
      verification: 'NOT_STARTED',
      reconciliation: 'NOT_STARTED',
      evidence: 'DECLARED_SCORES_ONLY',
      selectedId: null,
      issues: Object.freeze(issues),
    };
  }

  const seen = new Set<string>();
  const parsed: AuthorizedDelta[] = [];
  input.candidates.forEach((candidate, index) => {
    const field = `candidates[${index}]`;
    if (!isRecord(candidate)) {
      issues.push(`${field} must be an object`);
      return;
    }
    const id = candidate.id;
    if (typeof id !== 'string' || !SAFE_TOKEN.test(id)) {
      issues.push(`${field}.id must be a 1-128 safe token`);
    } else if (seen.has(id)) {
      issues.push(`${field}.id is duplicated`);
    } else {
      seen.add(id);
    }
    if (!finiteNonNegative(candidate.declaredVerifiedValue)) {
      issues.push(`${field}.declaredVerifiedValue must be a finite number >= 0`);
    }
    if (!finiteNonNegative(candidate.risk)) issues.push(`${field}.risk must be a finite number >= 0`);
    if (!finiteNonNegative(candidate.cost)) issues.push(`${field}.cost must be a finite number >= 0`);
    if (typeof candidate.authorized !== 'boolean') issues.push(`${field}.authorized must be boolean`);
    const constraints = constraintRecord(candidate.constraints);
    if (!constraints) issues.push(`${field}.constraints must set exactly the six subject constraints`);
    if (
      typeof id === 'string' &&
      SAFE_TOKEN.test(id) &&
      finiteNonNegative(candidate.declaredVerifiedValue) &&
      finiteNonNegative(candidate.risk) &&
      finiteNonNegative(candidate.cost) &&
      typeof candidate.authorized === 'boolean' &&
      constraints
    ) {
      parsed.push({
        id,
        declaredVerifiedValue: candidate.declaredVerifiedValue,
        risk: candidate.risk,
        cost: candidate.cost,
        authorized: candidate.authorized,
        constraints,
      });
    }
  });

  if (issues.length) {
    return {
      status: 'INVALID',
      phase: 'SELECT_BEST_AUTHORIZED_ACTION',
      execution: 'NOT_STARTED',
      verification: 'NOT_STARTED',
      reconciliation: 'NOT_STARTED',
      evidence: 'DECLARED_SCORES_ONLY',
      selectedId: null,
      issues: Object.freeze(issues),
    };
  }

  const admissibleDeltas = parsed.filter(admissible);
  const scored: ScoredDelta[] = admissibleDeltas.map((delta) => ({
    id: delta.id,
    numerator: delta.declaredVerifiedValue,
    denominator: delta.risk + delta.cost + epsilon,
  }));
  const base = {
    phase: 'SELECT_BEST_AUTHORIZED_ACTION' as const,
    execution: 'NOT_STARTED' as const,
    verification: 'NOT_STARTED' as const,
    reconciliation: 'NOT_STARTED' as const,
    evidence: 'DECLARED_SCORES_ONLY' as const,
    epsilon,
    scored: Object.freeze(scored.map((row) => Object.freeze({ ...row }))),
  };
  if (scored.length === 0) {
    return { ...base, status: 'NONE_AUTHORIZED', selectedId: null, tiedIds: Object.freeze([]) };
  }

  let leaders = [scored[0]!];
  for (const row of scored.slice(1)) {
    if (beats(row, leaders[0]!)) leaders = [row];
    else if (!beats(leaders[0]!, row)) leaders.push(row);
  }
  const tiedIds = Object.freeze(leaders.map((row) => row.id).sort());
  if (tiedIds.length === 1) {
    return { ...base, status: 'SELECTED', selectedId: tiedIds[0]!, tiedIds: tiedIds as readonly [string] };
  }
  return { ...base, status: 'TIED', selectedId: null, tiedIds };
}

export function reconcileVerifiedImprovement(input: ImprovementEvidence): ImprovementReconciliation {
  const issues: string[] = [];
  const held = (reason: 'NOT_VERIFIED' | 'NOT_ATTESTED' | 'INVALID', worldId: string | null, revision: string | null) =>
    ({
      status: 'HELD' as const,
      reason,
      worldId,
      priorRevision: revision,
      nextRevision: revision,
      issues: Object.freeze(issues),
      execution: 'NOT_PERFORMED_HERE' as const,
      claim: 'NO_VERIFIED_CLAIM' as const,
    });

  if (!isRecord(input)) return held('INVALID', null, null);
  if (typeof input.worldId !== 'string' || !SAFE_TOKEN.test(input.worldId)) issues.push('worldId must be a safe token');
  if (typeof input.revision !== 'string' || !SAFE_TOKEN.test(input.revision)) issues.push('revision must be a safe token');
  if (typeof input.selectedId !== 'string' || !SAFE_TOKEN.test(input.selectedId)) issues.push('selectedId must be a safe token');
  if (!['VERIFIED', 'DIVERGENT', 'UNKNOWN', 'NOT_EXECUTED'].includes(input.verification)) {
    issues.push('verification must be VERIFIED, DIVERGENT, UNKNOWN, or NOT_EXECUTED');
  }
  if (input.attestationRef !== null && (typeof input.attestationRef !== 'string' || !SAFE_TOKEN.test(input.attestationRef))) {
    issues.push('attestationRef must be null or a safe token');
  }
  const worldId = typeof input.worldId === 'string' && SAFE_TOKEN.test(input.worldId) ? input.worldId : null;
  const revision = typeof input.revision === 'string' && SAFE_TOKEN.test(input.revision) ? input.revision : null;
  if (issues.length) return held('INVALID', worldId, revision);
  if (input.verification !== 'VERIFIED') return held('NOT_VERIFIED', worldId, revision);
  if (input.attestationRef === null) return held('NOT_ATTESTED', worldId, revision);

  const nextRevision = `${input.revision}+1`;
  if (!SAFE_TOKEN.test(nextRevision)) {
    issues.push('next revision would exceed the safe token bound');
    return held('INVALID', worldId, revision);
  }
  return {
    status: 'ADVANCED',
    reason: 'VERIFIED_AND_ATTESTED',
    worldId: input.worldId,
    priorRevision: input.revision,
    nextRevision,
    selectedId: input.selectedId,
    attestationRef: input.attestationRef,
    execution: 'NOT_PERFORMED_HERE',
    claim: 'REVISION_LABEL_ONLY',
  };
}
