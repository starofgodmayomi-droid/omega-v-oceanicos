import { describe, expect, it } from '@jest/globals';
import {
  evaluateOmegaLambda,
  evaluateDirectSumLambda,
  computeKroneckerEcosystemTensor,
  executeMatrixTransition,
  executeContinuumCompressionTransition,
  OCEANIC_BODY_MEMBERS,
  CONTINUUM_PACKAGES,
  HUMAN_ROOT_ID,
  HUMAN_ROOT_NAME,
} from '../../packages/pluralism/src/matrix.js';

describe('🌊 ƆCEANiC_OS(v∞) Matrix Transformation & Master Lambda Engine', () => {
  it('correctly defines the 20-member sovereign BODY tuple', () => {
    expect(OCEANIC_BODY_MEMBERS).toHaveLength(20);
    expect(OCEANIC_BODY_MEMBERS).toContain('SOURCE');
    expect(OCEANIC_BODY_MEMBERS).toContain('KAI');
    expect(OCEANIC_BODY_MEMBERS).toContain('LUCID');
    expect(OCEANIC_BODY_MEMBERS).toContain('AI_SOUL');
    expect(OCEANIC_BODY_MEMBERS).toContain('ΩIR');
    expect(OCEANIC_BODY_MEMBERS).toContain('OBSERVER');
    expect(OCEANIC_BODY_MEMBERS).toContain('EXECUTOR');
    expect(OCEANIC_BODY_MEMBERS).toContain('VERIFIER');
    expect(OCEANIC_BODY_MEMBERS).toContain('ATTESTOR');
    expect(OCEANIC_BODY_MEMBERS).toContain('MEMORY');
    expect(OCEANIC_BODY_MEMBERS).toContain('TruthOS');
    expect(OCEANIC_BODY_MEMBERS).toContain('VaaS');
    expect(OCEANIC_BODY_MEMBERS).toContain('ECHOFRAME');
    expect(OCEANIC_BODY_MEMBERS).toContain('ƆREADE');
    expect(OCEANIC_BODY_MEMBERS).toContain('MOOD');
    expect(OCEANIC_BODY_MEMBERS).toContain('MIRRIO');
    expect(OCEANIC_BODY_MEMBERS).toContain('NOTION');
    expect(OCEANIC_BODY_MEMBERS).toContain('GITHUB');
    expect(OCEANIC_BODY_MEMBERS).toContain('COMPOSIO');
    expect(OCEANIC_BODY_MEMBERS).toContain('WORKERS');
  });

  it('evaluates Master Lambda: DENIED if not(A and P)', () => {
    const res = evaluateOmegaLambda({
      R: { realityId: 'r-0' },
      I: { claim: 'Execute unauthorized mutation' },
      E: { observed: true, verified: true },
      A: false, // Unauthorized
      P: true,
    });

    expect(res.STATE).toBe('DENIED');
    expect(res.Ω).toBe('🌊OCEANICOS');
    expect(res.CYCLE).toBe('0→💧→Ω∞v→🕳️→💧→∞');
    expect(res.LAW).toContain('NO_AUTHORITY⇒NO_EXECUTION');
  });

  it('evaluates Master Lambda: VERIFIED if E.observed and E.verified and (A and P)', () => {
    const res = evaluateOmegaLambda({
      R: { realityId: 'r-1' },
      I: { claim: 'Verify state delta' },
      E: { observed: true, verified: true },
      A: true,
      P: true,
      M: { context: 'grounded' },
    });

    expect(res.STATE).toBe('VERIFIED');
    expect(res.proofHash).toMatch(/^[0-9a-f]{64}$/);
    expect(res.BODY).toEqual(OCEANIC_BODY_MEMBERS);
    expect(res.NEXT).toBe('OBSERVE→AUTHORIZE→EXECUTE→VERIFY→ATTEST→REMEMBER→EVOLVE');
  });

  it('computes 320-dimensional Kronecker tensor product (4 x 4 x 4 x 5)', () => {
    const tensor = computeKroneckerEcosystemTensor();
    expect(tensor).toHaveLength(320);
    expect(tensor[0]).toBe(1.0 * 0.9 * 1.0 * 1.0); // Source * Notion * Observer * TruthOS
    expect(tensor.every(v => v > 0)).toBe(true);
  });

  it('executes matrix state transition and enforces fail-closed singularity collapse on unverified claim', () => {
    // 1. Authorized & Verified
    const r0 = Array.from({ length: 320 }, () => 1.0 / Math.sqrt(320));
    const passReceipt = executeMatrixTransition(0, r0, undefined, true, true);
    expect(passReceipt.determinantState).toBe('NON_ZERO');
    expect(passReceipt.authorizationProjectionPassed).toBe(true);
    expect(passReceipt.verificationVectorStatus).toBe('ZERO_CONVERGED');
    expect(passReceipt.frobeniusNorm).toBeGreaterThan(0);

    // 2. Unverified (NO_EVIDENCE => collapse into singularity det = 0)
    const failReceipt = executeMatrixTransition(0, r0, undefined, true, false);
    expect(failReceipt.determinantState).toBe('ZERO_SINGULARITY_COLLAPSE');
    expect(failReceipt.authorizationProjectionPassed).toBe(false);
    expect(failReceipt.verificationVectorStatus).toBe('HALTED_EMPTY');
    expect(failReceipt.frobeniusNorm).toBe(0);
    expect(failReceipt.stateVectorHead.every(v => v === 0)).toBe(true);
  });

  it('grounds 62 continuum modular packages under Human Root did:omega:human:starofgodmayomi', () => {
    expect(CONTINUUM_PACKAGES).toHaveLength(62);
    expect(HUMAN_ROOT_ID).toBe('did:omega:human:starofgodmayomi');
    expect(HUMAN_ROOT_NAME).toBe('ELION VAREL');

    // 1. Authorized by Human Root + Verified
    const receipt = executeContinuumCompressionTransition(HUMAN_ROOT_ID, true);
    expect(receipt.success).toBe(true);
    expect(receipt.contract).toBe('Ω∞v-CONTINUUM-MATRIX-V1111');
    expect(receipt.continuumPackagesCount).toBe(62);
    expect(receipt.sovereignOrgansCount).toBe(20);
    expect(receipt.singularityStatus).toBe('PREVENTED_VERIFIED');
    expect(receipt.frobeniusNorm).toBeGreaterThan(0);
    expect(receipt.upgradeHash).toMatch(/^[0-9a-f]{64}$/);

    // 2. Unauthorized Human Root => Singularity Collapse
    const failRootReceipt = executeContinuumCompressionTransition('did:unauthorized:actor', true);
    expect(failRootReceipt.success).toBe(false);
    expect(failRootReceipt.singularityStatus).toBe('SINGULARITY_COLLAPSE');
    expect(failRootReceipt.frobeniusNorm).toBe(0);

    // 3. Unverified Evidence => Singularity Collapse
    const failVerifReceipt = executeContinuumCompressionTransition(HUMAN_ROOT_ID, false);
    expect(failVerifReceipt.success).toBe(false);
    expect(failVerifReceipt.singularityStatus).toBe('SINGULARITY_COLLAPSE');
    expect(failVerifReceipt.frobeniusNorm).toBe(0);
  });

  it('evaluates Pluralistic Direct Sum Lambda (S, I, E, A, P, M, D) preserving dissent', () => {
    // 1. Authorized and Evidence Verified
    const verifiedResult = evaluateDirectSumLambda({
      S: { step: 10, hash: '0x123' },
      I: 'UPGRADE_HARMONIZE',
      E: { observed: true, verified: true },
      A: true,
      P: true,
      M: { recallCount: 42 },
      D: [{ streamId: 'dissent-1', reason: 'alternative perspective preserved' }],
    });

    expect(verifiedResult['🌊']).toBe('ƆCEANiC_OS(v∞)');
    expect(verifiedResult.DECISION).toBe('VERIFIED');
    expect(verifiedResult.BODY).toHaveLength(16);
    expect(verifiedResult.BODY).toContain('KAI');
    expect(verifiedResult.BODY).toContain('LUCID');
    expect(verifiedResult.BODY).toContain('AI_SOUL');
    expect(verifiedResult.BODY).toContain('ΩIR');
    expect(verifiedResult.BODY).toContain('TruthOS');
    expect(verifiedResult.BODY).toContain('VaaS');
    expect(verifiedResult.BODY).toContain('ECHOFRAME');
    expect(verifiedResult.BODY).toContain('ƆREADE');
    expect(verifiedResult.BODY).toContain('MOOD');
    expect(verifiedResult.BODY).toContain('MIRRIO');
    expect(verifiedResult.BODY).toContain('Notion');
    expect(verifiedResult.BODY).toContain('GitHub');
    expect(verifiedResult.BODY).toContain('Composio');
    expect(verifiedResult.BODY).toContain('Workers');
    expect(verifiedResult.BODY).toContain('API');
    expect(verifiedResult.BODY).toContain('Web');
    expect(verifiedResult.LAW).toBe('PLURALISM∧DISSENT∧EVIDENCE∧AUTHORITY∧FINITE_TRANSITIONS');
    expect(verifiedResult.FLOW).toBe('0→💧→Ω∞v→🕳️→💧→∞');
    expect(verifiedResult.DISSENT).toHaveLength(1);
    expect(verifiedResult.proofHash).toMatch(/^[0-9a-f]{64}$/);

    // 2. Denied if not(A and P)
    const deniedResult = evaluateDirectSumLambda({
      S: 'S_CURRENT',
      I: 'UNAUTHORIZED_RUN',
      E: { observed: true, verified: true },
      A: false,
      P: true,
    });
    expect(deniedResult.DECISION).toBe('DENY');

    // 3. Unknown if evidence incomplete
    const unknownResult = evaluateDirectSumLambda({
      S: 'S_CURRENT',
      I: 'PARTIAL_EVIDENCE',
      E: { observed: true, verified: false },
      A: true,
      P: true,
    });
    expect(unknownResult.DECISION).toBe('UNKNOWN');
  });
});

