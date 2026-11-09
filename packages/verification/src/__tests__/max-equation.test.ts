import { describe, it, expect } from '@jest/globals';
import {
  checkCandidateEligibility,
  computePriorityScore,
  optimizeMaxEquationSlices,
  evaluatePsiConvergence,
  executeRememberVerifyObserveStep,
  type MaxEquationCandidateInput,
  type OceanicosStateRecord,
} from '../max-equation.js';

describe('🌊 Max Equation Optimization & Finite Compression Engine', () => {
  const validCandidate: MaxEquationCandidateInput = {
    id: 'slice-attester-ready',
    intent: 'Harden local attester keypair to achieve full ready tri-surface check',
    valueEstimate: 80,
    evidenceQuality: 0.95,
    riskEstimate: 5,
    costEstimate: 10,
    authority: true,
    policy: true,
    scoped: true,
    acceptanceCriteria: [
      'GET /health reports attester: ready',
      'Attestation receipt validates against local key fingerprint',
    ],
    rollbackPlan: 'Revert attestationKey config to default',
  };

  it('evaluates candidate eligibility correctly', () => {
    const eligible = checkCandidateEligibility(validCandidate);
    expect(eligible.eligible).toBe(true);
    expect(eligible.verdict).toBe('ALLOW');
    expect(eligible.reasons).toHaveLength(0);

    const unauthorized = checkCandidateEligibility({ ...validCandidate, authority: false });
    expect(unauthorized.eligible).toBe(false);
    expect(unauthorized.verdict).toBe('DENY');
    expect(unauthorized.reasons[0]).toContain('Missing human authority');

    const unscoped = checkCandidateEligibility({ ...validCandidate, scoped: false });
    expect(unscoped.eligible).toBe(false);
    expect(unscoped.verdict).toBe('REVIEW');
    expect(unscoped.reasons[0]).toContain('Unbounded scope');

    const noCriteria = checkCandidateEligibility({ ...validCandidate, acceptanceCriteria: [] });
    expect(noCriteria.eligible).toBe(false);
    expect(noCriteria.reasons[0]).toContain('acceptance criteria');
  });

  it('computes evidence-weighted PriorityScore correctly', () => {
    // PriorityScore = (80 * 0.95) / (5 + 10 + 1e-6) = 76 / 15.000001 ≈ 5.066666
    const score = computePriorityScore(validCandidate);
    expect(score).toBeCloseTo(76 / 15, 3);
  });

  it('selects the optimal slice via argmax PriorityScore across candidates', () => {
    const candidates: MaxEquationCandidateInput[] = [
      {
        id: 'slice-low-value',
        intent: 'Minor comment polish',
        valueEstimate: 5,
        evidenceQuality: 0.8,
        riskEstimate: 1,
        costEstimate: 2,
        authority: true,
        policy: true,
        scoped: true,
        acceptanceCriteria: ['Doc comments match style'],
      },
      validCandidate, // Score ≈ 5.07
      {
        id: 'slice-high-risk-speculative',
        intent: 'Unbounded rewrite of database layer',
        valueEstimate: 100,
        evidenceQuality: 0.5,
        riskEstimate: 80,
        costEstimate: 50,
        authority: true,
        policy: true,
        scoped: true,
        acceptanceCriteria: ['All tests pass'],
      },
      {
        id: 'slice-unauthorized',
        intent: 'Consequential action without steward consent',
        valueEstimate: 1000,
        evidenceQuality: 1.0,
        riskEstimate: 0,
        costEstimate: 0,
        authority: false, // DENIED!
        policy: true,
        scoped: true,
        acceptanceCriteria: ['Action taken'],
      },
    ];

    const result = optimizeMaxEquationSlices(candidates);

    expect(result.contract).toBe('Ω∞v-MAX-EQUATION-COMPRESSION-V1');
    expect(result.totalCandidates).toBe(4);
    expect(result.eligibleCandidatesCount).toBe(3);
    expect(result.optimalSlice).not.toBeNull();
    expect(result.optimalSlice?.id).toBe('slice-attester-ready');
    expect(result.optimalSlice?.rank).toBe(1);

    // Verify non-eligible candidate is ranked last with verdict DENY
    const unauthResult = result.rankedSlices.find((r) => r.id === 'slice-unauthorized');
    expect(unauthResult?.eligible).toBe(false);
    expect(unauthResult?.verdict).toBe('DENY');
    expect(unauthResult?.priorityScore).toBe(0);
  });

  it('evaluates Maximum Total Convergence Singularity (Ψ) correctly', () => {
    // When inner product * S + C == 0 -> Zero Entropy / Equilibrium (returns 0)
    // A = [1, 2], B = [3, -1] -> dot = 3 - 2 = 1.
    // S = 2 -> 1 * 2 = 2. C = -2 -> 2 + (-2) = 0.
    const balanced = evaluatePsiConvergence([1, 2], [3, -1], -2, 2, 'delta-intent');
    expect(balanced.balanced).toBe(true);
    expect(balanced.balanceMetric).toBe(0);
    expect(balanced.result).toBe(0);

    // When not balanced -> Active verification branch
    // C = 5 -> balanceMetric = 7 != 0
    const verified = evaluatePsiConvergence([1, 2], [3, -1], 5, 2, {
      intent: 'REALITY_CONVERGENCE',
      reality: 'REALITY_CONVERGENCE',
    });
    expect(verified.balanced).toBe(false);
    expect(verified.balanceMetric).toBe(7);
    expect(verified.result).toEqual({ 'Ω∞v': 'VERIFIED(REALITY_CONVERGENCE)' });

    // Fallback unverified -> Primordial Drop ∞💧
    const primordial = evaluatePsiConvergence([1, 2], [3, -1], 5, 2, {
      intent: 'UNVERIFIED_INTENT',
      reality: 'ACTUAL_REALITY',
    });
    expect(primordial.balanced).toBe(false);
    expect(primordial.result).toEqual({ 'Ω∞v': '∞💧' });
  });

  it('executes recursive transition step O_{t+1} = REMEMBER(VERIFY(OBSERVE(O_t, Δ)))', () => {
    const state0: OceanicosStateRecord = {
      epoch: 0,
      stateHash: '0000000000000000000000000000000000000000000000000000000000000000',
      parentHash: 'root-genesis',
      intent: 'GENESIS_ROOT',
      verified: true,
      outcome: 'VERIFIED',
      value: 100,
      timestamp: new Date().toISOString(),
    };

    // 1. Success path: All gates pass, observation matches intent
    const step1 = executeRememberVerifyObserveStep(state0, validCandidate, validCandidate.intent);
    expect(step1.verification.verified).toBe(true);
    expect(step1.verification.outcome).toBe('VERIFIED');
    expect(step1.verification.decision).toBe('ALLOW');
    expect(step1.nextState.epoch).toBe(1);
    expect(step1.nextState.parentHash).toBe(state0.stateHash);
    expect(step1.nextState.stateHash).toHaveLength(64);
    expect(step1.nextState.verified).toBe(true);
    expect(step1.nextState.value).toBe(80);

    // 2. Gate failure path: Unauthorized candidate fails closed
    const unauthCandidate: MaxEquationCandidateInput = {
      ...validCandidate,
      id: 'slice-unauthorized',
      authority: false,
    };
    const step2 = executeRememberVerifyObserveStep(step1.nextState, unauthCandidate);
    expect(step2.verification.verified).toBe(false);
    expect(step2.verification.outcome).toBe('NOT_EXECUTED');
    expect(step2.verification.decision).toBe('DENY');
    expect(step2.nextState.verified).toBe(false);
    expect(step2.nextState.value).toBe(0);

    // 3. Divergence path: Observed reality differs from intent
    const step3 = executeRememberVerifyObserveStep(
      step1.nextState,
      validCandidate,
      'UNEXPECTED_REALITY_COLLAPSE'
    );
    expect(step3.verification.verified).toBe(false);
    expect(step3.verification.outcome).toBe('DIVERGENT');
    expect(step3.verification.decision).toBe('DENY');
    expect(step3.nextState.verified).toBe(false);
  });
});

