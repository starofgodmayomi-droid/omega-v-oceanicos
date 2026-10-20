/**
 * 🌊 ƆCEANiC_OS(v∞) :: Max Equation Optimization & Finite Compression Engine
 *
 * Governing Equations:
 * 1. Verification Contract:
 *    Ω∞v = VERIFY( Δ(Intent, Reality) )
 *
 * 2. Optimal Finite Transition:
 *    Δ* = argmax_{Δ ∈ F} [ Verified Value(Δ) / ( Risk(Δ) + Cost(Δ) + ε ) ]
 *
 * 3. Evidence-Weighted Priority Score (Pre-Verification):
 *    PriorityScore(Δ) = [ V_hat(Δ) * Q_E(Δ) ] / [ R_hat(Δ) + C_hat(Δ) + ε ]
 *
 * Operational Laws:
 * - Compare only feasible, bounded candidate changes (F).
 * - Hard eligibility gate:
 *   ¬Authority ∨ ¬Policy ∨ ¬Scope ⇒ NOT_EXECUTED / DENY
 * - Priority score never overrides hard authority, policy, or privacy gates.
 * - Value is verified only after an observable result meets acceptance criteria.
 */

import { createHash } from 'node:crypto';

export const DEFAULT_EPSILON = 1e-6;

export const DEFAULT_MAX_EQUATION_METADATA = {
  contract: 'Ω∞v-MAX-EQUATION-COMPRESSION-V1',
  governingEquation: 'Ω∞v = VERIFY( Δ(Intent, Reality) )',
  optimizationFormula: 'Δ* = argmax_{Δ ∈ F} [ Verified Value(Δ) / ( Risk(Δ) + Cost(Δ) + ε ) ]',
  priorityScoreFormula: 'PriorityScore(Δ) = [ V_hat(Δ) * Q_E(Δ) ] / [ R_hat(Δ) + C_hat(Δ) + ε ]',
  feasibleSetRules: [
    'attributableAuthority: true (approved by human root or authorized delegate)',
    'policyCompliant: true (satisfies constitutional invariants and data safety)',
    'boundedScope: true (finite scope, explicit rollback/stop condition)',
    'observableAcceptanceCriteria: defined before execution (no evidence => no claim)',
  ],
  tieBreakerHierarchy: [
    '1. Lower risk estimate (R_hat)',
    '2. Higher evidence quality (Q_E)',
    '3. Higher estimated value (V_hat)',
    '4. Lower estimated cost (C_hat)',
  ],
  epsilon: DEFAULT_EPSILON,
} as const;

export interface MaxEquationCandidateInput {
  readonly id: string;
  readonly intent: string;
  readonly valueEstimate: number;       // V_hat >= 0
  readonly evidenceQuality: number;     // 0.0 <= Q_E <= 1.0
  readonly riskEstimate: number;        // R_hat >= 0
  readonly costEstimate: number;        // C_hat >= 0
  readonly authority: boolean;          // Hard gate: Human steward/policy authority
  readonly policy: boolean;             // Hard gate: Constitutional compliance
  readonly scoped: boolean;             // Hard gate: Finite, non-destructive boundary
  readonly acceptanceCriteria: readonly string[];
  readonly rollbackPlan?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export type CandidateEligibilityVerdict = 'ALLOW' | 'DENY' | 'REVIEW';

export interface MaxEquationScoredCandidate {
  readonly id: string;
  readonly intent: string;
  readonly valueEstimate: number;
  readonly evidenceQuality: number;
  readonly riskEstimate: number;
  readonly costEstimate: number;
  readonly priorityScore: number;
  readonly eligible: boolean;
  readonly verdict: CandidateEligibilityVerdict;
  readonly denialReasons: readonly string[];
  readonly rank: number;
  readonly candidate: MaxEquationCandidateInput;
}

export interface MaxEquationOptimizationResult {
  readonly contract: 'Ω∞v-MAX-EQUATION-COMPRESSION-V1';
  readonly governingEquation: string;
  readonly optimizationFormula: string;
  readonly totalCandidates: number;
  readonly eligibleCandidatesCount: number;
  readonly optimalSlice: MaxEquationScoredCandidate | null;
  readonly rankedSlices: readonly MaxEquationScoredCandidate[];
  readonly epsilon: number;
  readonly evaluatedAt: string;
  readonly evaluationHash: string;
}

/**
 * Validates whether a candidate belongs to the feasible set F.
 */
export function checkCandidateEligibility(candidate: MaxEquationCandidateInput): {
  eligible: boolean;
  verdict: CandidateEligibilityVerdict;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (candidate.authority !== true) {
    reasons.push('FAIL_CLOSED: Missing human authority or steward authorization (¬Authority ⇒ NO EXECUTION).');
  }

  if (candidate.policy !== true) {
    reasons.push('FAIL_CLOSED: Policy violation or uncertified safety constraint.');
  }

  if (candidate.scoped !== true) {
    reasons.push('FAIL_CLOSED: Unbounded scope or missing fail-safe stop conditions.');
  }

  if (!candidate.acceptanceCriteria || candidate.acceptanceCriteria.length === 0) {
    reasons.push('FAIL_CLOSED: Missing explicit observable acceptance criteria (¬Evidence ⇒ NO CLAIM).');
  }

  if (candidate.valueEstimate < 0) {
    reasons.push('INVALID_METRIC: Value estimate cannot be negative.');
  }

  if (candidate.evidenceQuality < 0 || candidate.evidenceQuality > 1.0) {
    reasons.push('INVALID_METRIC: Evidence quality Q_E must be in range [0.0, 1.0].');
  }

  if (candidate.riskEstimate < 0 || candidate.costEstimate < 0) {
    reasons.push('INVALID_METRIC: Risk and Cost estimates cannot be negative.');
  }

  const eligible = reasons.length === 0;
  const verdict: CandidateEligibilityVerdict = eligible
    ? 'ALLOW'
    : candidate.authority === false
      ? 'DENY'
      : 'REVIEW';

  return { eligible, verdict, reasons };
}

/**
 * Computes the evidence-weighted PriorityScore for a single candidate:
 * PriorityScore(Δ) = [ V_hat(Δ) * Q_E(Δ) ] / [ R_hat(Δ) + C_hat(Δ) + ε ]
 */
export function computePriorityScore(
  candidate: MaxEquationCandidateInput,
  epsilon = DEFAULT_EPSILON
): number {
  const vHat = Math.max(0, candidate.valueEstimate);
  const qE = Math.min(1.0, Math.max(0, candidate.evidenceQuality));
  const rHat = Math.max(0, candidate.riskEstimate);
  const cHat = Math.max(0, candidate.costEstimate);
  const eps = epsilon > 0 ? epsilon : DEFAULT_EPSILON;

  const numerator = vHat * qE;
  const denominator = rHat + cHat + eps;

  return numerator / denominator;
}

/**
 * Evaluates candidate transitions and returns the optimal slice:
 * Δ* = argmax_{Δ ∈ F} PriorityScore(Δ)
 */
export function optimizeMaxEquationSlices(
  candidates: readonly MaxEquationCandidateInput[],
  options?: { epsilon?: number; timestamp?: string }
): MaxEquationOptimizationResult {
  const epsilon = options?.epsilon ?? DEFAULT_EPSILON;
  const evaluatedAt = options?.timestamp ?? new Date().toISOString();

  const scored: MaxEquationScoredCandidate[] = candidates.map((cand) => {
    const check = checkCandidateEligibility(cand);
    const score = check.eligible ? computePriorityScore(cand, epsilon) : 0;

    return {
      id: cand.id,
      intent: cand.intent,
      valueEstimate: cand.valueEstimate,
      evidenceQuality: cand.evidenceQuality,
      riskEstimate: cand.riskEstimate,
      costEstimate: cand.costEstimate,
      priorityScore: score,
      eligible: check.eligible,
      verdict: check.verdict,
      denialReasons: check.reasons,
      rank: 0,
      candidate: cand,
    };
  });

  // Sort eligible candidates first by score descending, then tie-breakers:
  // 1. Lower risk
  // 2. Higher evidence quality
  // 3. Higher value
  // 4. Lower cost
  const eligibleSlices = scored.filter((s) => s.eligible);
  eligibleSlices.sort((a, b) => {
    if (Math.abs(b.priorityScore - a.priorityScore) > 1e-9) {
      return b.priorityScore - a.priorityScore;
    }
    if (Math.abs(a.riskEstimate - b.riskEstimate) > 1e-9) {
      return a.riskEstimate - b.riskEstimate; // lower risk first
    }
    if (Math.abs(b.evidenceQuality - a.evidenceQuality) > 1e-9) {
      return b.evidenceQuality - a.evidenceQuality; // higher evidence quality first
    }
    if (Math.abs(b.valueEstimate - a.valueEstimate) > 1e-9) {
      return b.valueEstimate - a.valueEstimate; // higher value first
    }
    return a.costEstimate - b.costEstimate; // lower cost first
  });

  const nonEligibleSlices = scored.filter((s) => !s.eligible);

  const rankedSlices: MaxEquationScoredCandidate[] = [
    ...eligibleSlices.map((s, idx) => ({ ...s, rank: idx + 1 })),
    ...nonEligibleSlices.map((s) => ({ ...s, rank: 9999 })),
  ];

  const optimalSlice = eligibleSlices.length > 0 ? rankedSlices[0] : null;

  const hashPayload = JSON.stringify({
    ranked: rankedSlices.map((r) => ({ id: r.id, score: r.priorityScore, verdict: r.verdict })),
    optimalId: optimalSlice?.id ?? null,
    evaluatedAt,
  });

  const evaluationHash = createHash('sha256').update(hashPayload).digest('hex');

  return {
    contract: 'Ω∞v-MAX-EQUATION-COMPRESSION-V1',
    governingEquation: 'Ω∞v = VERIFY( Δ(Intent, Reality) )',
    optimizationFormula: 'Δ* = argmax_{Δ ∈ F} [ Verified Value(Δ) / ( Risk(Δ) + Cost(Δ) + ε ) ]',
    totalCandidates: candidates.length,
    eligibleCandidatesCount: eligibleSlices.length,
    optimalSlice,
    rankedSlices,
    epsilon,
    evaluatedAt,
    evaluationHash,
  };
}
