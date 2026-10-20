import { describe, it, expect } from '@jest/globals';
import {
  checkCandidateEligibility,
  computePriorityScore,
  optimizeMaxEquationSlices,
  type MaxEquationCandidateInput,
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
});
