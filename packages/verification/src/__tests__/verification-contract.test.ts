/**
 * 🌊 ƆCEANiC_OS(v∞) :: Shared Verification Contract Test Suite
 *
 * Verifies all four outcomes:
 * - VERIFIED
 * - DIVERGENT
 * - UNKNOWN
 * - NOT_EXECUTED
 *
 * Verifies all fail-closed invariants:
 * - ¬Evidence ⇒ NO VERIFIED CLAIM
 * - ¬Authority ⇒ NO EXECUTION
 * - Mismatch ⇒ DIVERGENT
 * - Missing observation ⇒ UNKNOWN
 * - No attempt ⇒ NOT_EXECUTED
 * - Verified change ⇒ Traceable next state
 *
 * Verifies the 4x4 Whole-Body Matrix and Gram Determinant Engine.
 */

import {
  evaluateVerificationContract,
  HUMAN_ROOT_ID,
  HUMAN_ROOT_NAME,
  type VerificationContractInput,
} from '../verification-contract.js';

describe('🌊 Shared Verification Contract — The 4 Canonical Outcomes', () => {
  const baseInput: VerificationContractInput = {
    stateBefore: { commit: '000000', version: '1.0.0', status: 'IDLE' },
    intent: 'DEPLOY_BOUNDED_TRANSITION_V1',
    expectedState: { commit: '111111', version: '1.0.1', status: 'RUNNING' },
    authority: true,
    humanConsent: true,
    policyPassed: true,
    capabilityPresent: true,
    attempted: true,
    executed: true,
    observation: {
      observed: true,
      observedState: { commit: '111111', version: '1.0.1', status: 'RUNNING' },
      telemetryUuid: 'telemetry-uuid-001',
    },
    evidence: {
      claim: 'Transition verified by test suite and cryptographic attestation',
      observed: true,
      verified: true,
      confidence: 0.99,
      proof: 'sig:sha256:verified-change-root',
    },
  };

  describe('Outcome 1: VERIFIED', () => {
    it('produces VERIFIED when authorized, executed, observed, matched, and attested', () => {
      const receipt = evaluateVerificationContract(baseInput);

      expect(receipt['🌊']).toBe('ƆCEANiC_OS(v∞)');
      expect(receipt.contract).toBe('Ω∞v-SHARED-VERIFICATION-CONTRACT-V1');
      expect(receipt.humanRoot).toBe(HUMAN_ROOT_ID);
      expect(receipt.humanSteward).toBe(HUMAN_ROOT_NAME);

      expect(receipt.outcome).toBe('VERIFIED');
      expect(receipt.decision).toBe('ALLOW');
      expect(receipt.reason).toContain('VERIFIED:');

      // Traceable next state
      expect(receipt.stateAfter).toEqual(baseInput.expectedState);

      // Invariants
      expect(receipt.invariants.noEvidenceNoClaim).toBe(true);
      expect(receipt.invariants.noAuthorityNoExecution).toBe(true);
      expect(receipt.invariants.mismatchDivergent).toBe(true);
      expect(receipt.invariants.missingObservationUnknown).toBe(true);
      expect(receipt.invariants.noAttemptNotExecuted).toBe(true);
      expect(receipt.invariants.verifiedChangeTraceable).toBe(true);

      // 4x4 Whole-Body Matrix: Row 2 has O, V, T, M
      expect(receipt.matrix.O).toBe(true);
      expect(receipt.matrix.V).toBe(true);
      expect(receipt.matrix.T).toBe('FINITE_TRANSITION_ADVANCED');
      expect(receipt.matrix.M).toContain('MERKLE');

      // Numerical Matrix & Gram determinant
      expect(receipt.frobeniusNorm).toBe(4.0);
      expect(receipt.fourthRootGramDeterminant).toBeGreaterThan(1.0);
      expect(receipt.proofChain.currentHash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('Outcome 2: DIVERGENT', () => {
    it('produces DIVERGENT when observed reality diverged from expected target state', () => {
      const divergentInput: VerificationContractInput = {
        ...baseInput,
        expectedState: { commit: '111111', version: '1.0.1', status: 'RUNNING' },
        observation: {
          observed: true,
          observedState: { commit: '111111', version: '1.0.0', status: 'CRASHED' },
          telemetryUuid: 'telemetry-divergent-002',
        },
      };

      const receipt = evaluateVerificationContract(divergentInput);

      expect(receipt.outcome).toBe('DIVERGENT');
      expect(receipt.decision).toBe('REVIEW');
      expect(receipt.reason).toContain('MISMATCH:');
      expect(receipt.invariants.mismatchDivergent).toBe(true);

      // Dissent must be preserved
      expect(receipt.dissent.length).toBeGreaterThan(0);
      expect(receipt.dissent[0]).toContain('Divergence:');

      // State is recorded as actual observed, not fabricated expected
      expect(receipt.stateAfter).toEqual({
        commit: '111111',
        version: '1.0.0',
        status: 'CRASHED',
      });
    });
  });

  describe('Outcome 3: UNKNOWN', () => {
    it('produces UNKNOWN when observation is missing (Missing observation ⇒ UNKNOWN)', () => {
      const missingObsInput: VerificationContractInput = {
        ...baseInput,
        observation: null,
      };

      const receipt = evaluateVerificationContract(missingObsInput);

      expect(receipt.outcome).toBe('UNKNOWN');
      expect(receipt.decision).toBe('REVIEW');
      expect(receipt.reason).toContain('MISSING_OBSERVATION:');
      expect(receipt.invariants.missingObservationUnknown).toBe(true);
      // State is kept at stateBefore
      expect(receipt.stateAfter).toEqual(baseInput.stateBefore);
    });

    it('produces UNKNOWN when evidence is missing even if observed matches expected (¬Evidence ⇒ NO VERIFIED CLAIM)', () => {
      const unverifiedEvidenceInput: VerificationContractInput = {
        ...baseInput,
        evidence: {
          claim: 'Unproven claim without cryptographically verified tests',
          observed: true,
          verified: false, // NOT verified
        },
      };

      const receipt = evaluateVerificationContract(unverifiedEvidenceInput);

      // Crucial: Cannot be VERIFIED!
      expect(receipt.outcome).not.toBe('VERIFIED');
      expect(receipt.outcome).toBe('UNKNOWN');
      expect(receipt.decision).toBe('REVIEW');
      expect(receipt.reason).toContain('NO_EVIDENCE:');
      expect(receipt.invariants.noEvidenceNoClaim).toBe(true);
    });
  });

  describe('Outcome 4: NOT_EXECUTED', () => {
    it('produces NOT_EXECUTED and DENY when authority is missing (¬Authority ⇒ NO EXECUTION)', () => {
      const noAuthInput: VerificationContractInput = {
        ...baseInput,
        authority: false,
      };

      const receipt = evaluateVerificationContract(noAuthInput);

      expect(receipt.outcome).toBe('NOT_EXECUTED');
      expect(receipt.decision).toBe('DENY');
      expect(receipt.reason).toContain('NO_AUTHORITY:');
      expect(receipt.invariants.noAuthorityNoExecution).toBe(true);

      // Fail-closed collapse: execution rows zeroed
      expect(receipt.numericalMatrix[1]).toEqual([0, 0, 0, 0]);
      expect(receipt.numericalMatrix[2]).toEqual([0, 0, 0, 0]);
      expect(receipt.invariants.failClosedEnforced).toBe(true);
      expect(receipt.stateAfter).toEqual(baseInput.stateBefore);
    });

    it('produces NOT_EXECUTED when policy check fails', () => {
      const policyFailInput: VerificationContractInput = {
        ...baseInput,
        policyPassed: false,
      };

      const receipt = evaluateVerificationContract(policyFailInput);

      expect(receipt.outcome).toBe('NOT_EXECUTED');
      expect(receipt.decision).toBe('DENY');
      expect(receipt.reason).toContain('POLICY_REJECTED:');
      expect(receipt.numericalMatrix[1]).toEqual([0, 0, 0, 0]);
    });

    it('produces NOT_EXECUTED when human consent is withheld', () => {
      const noConsentInput: VerificationContractInput = {
        ...baseInput,
        humanConsent: false,
      };

      const receipt = evaluateVerificationContract(noConsentInput);

      expect(receipt.outcome).toBe('NOT_EXECUTED');
      expect(receipt.decision).toBe('DENY');
      expect(receipt.reason).toContain('NO_HUMAN_CONSENT:');
    });

    it('produces NOT_EXECUTED when transition was authorized but never attempted (No attempt ⇒ NOT_EXECUTED)', () => {
      const noAttemptInput: VerificationContractInput = {
        ...baseInput,
        attempted: false,
      };

      const receipt = evaluateVerificationContract(noAttemptInput);

      expect(receipt.outcome).toBe('NOT_EXECUTED');
      expect(receipt.decision).toBe('DENY');
      expect(receipt.reason).toContain('NO_ATTEMPT:');
      expect(receipt.invariants.noAttemptNotExecuted).toBe(true);
    });

    it('produces NOT_EXECUTED when execution halted or crashed before completion', () => {
      const incompleteInput: VerificationContractInput = {
        ...baseInput,
        executed: false,
      };

      const receipt = evaluateVerificationContract(incompleteInput);

      expect(receipt.outcome).toBe('NOT_EXECUTED');
      expect(receipt.decision).toBe('DENY');
      expect(receipt.reason).toContain('EXECUTION_INCOMPLETE:');
    });
  });

  describe('Proof Chaining & Merkle Lineage', () => {
    it('chains cryptographic proof hashes across sequential transitions', () => {
      const step1 = evaluateVerificationContract(baseInput);

      const step2Input: VerificationContractInput = {
        ...baseInput,
        stateBefore: step1.stateAfter,
        intent: 'TRANSITION_STEP_2',
        expectedState: { commit: '222222', version: '1.0.2', status: 'RUNNING' },
        observation: {
          observed: true,
          observedState: { commit: '222222', version: '1.0.2', status: 'RUNNING' },
        },
        previousProofHash: step1.proofChain.currentHash,
        stepIndex: 1,
      };

      const step2 = evaluateVerificationContract(step2Input);

      expect(step1.proofChain.previousHash).toBeNull();
      expect(step2.proofChain.previousHash).toBe(step1.proofChain.currentHash);
      expect(step2.proofChain.currentHash).not.toBe(step1.proofChain.currentHash);
      expect(step2.proofChain.currentHash).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});
