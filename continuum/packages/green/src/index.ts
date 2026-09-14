import { GreenEvaluation, VerificationResult, EventLogEntry, Attestation } from '@omega-v/types';

/**
 * Green Engine: Implements Section XXV (GREEN Rule)
 * Evaluates whether a state is truly GREEN (requires evidence, lineage, attestations, and no critical failures).
 */
export class GreenEngine {
  /**
   * Evaluates if a given verification result represents a truly GREEN state
   */
  public evaluateGreen(
    verification: VerificationResult,
    evidenceArtifactExists: boolean,
    lineageEvents: EventLogEntry[],
    attestation?: Attestation
  ): GreenEvaluation {
    let reason = 'All requirements met.';

    // 1. ALL_REQUIRED_CHECKS_PASS
    const allChecksPassed = verification.summary.passed;
    if (!allChecksPassed) {
      reason = 'Not all required verification checks passed.';
    }

    // 2. EVIDENCE_EXISTS
    const evidenceExists = evidenceArtifactExists;
    if (allChecksPassed && !evidenceExists) {
      reason = 'Evidence artifact does not exist.';
    }

    // 3. LINEAGE_EXISTS
    // Verify that the lineage connects this verification back to the original observation
    const lineageExists =
      lineageEvents.length > 0 &&
      lineageEvents.some(
        (e) => e.type === 'OBSERVATION' && e.data.id === verification.observationId
      );

    if (allChecksPassed && evidenceExists && !lineageExists) {
      reason = 'Unbroken lineage to original observation does not exist.';
    }

    // 4. ATTESTATION_EXISTS
    const attestationExists = attestation !== undefined && attestation.verified === true;
    if (allChecksPassed && evidenceExists && lineageExists && !attestationExists) {
      reason = 'Valid attestation does not exist.';
    }

    // 5. NO_HIDDEN_CRITICAL_FAILURE
    // Scan evidence path for critical failures even if overall result passed
    const noCriticalFailures = !verification.evidencePath.some(
      (e) => e.severity === 'critical' && !e.passed
    );
    if (
      allChecksPassed &&
      evidenceExists &&
      lineageExists &&
      attestationExists &&
      !noCriticalFailures
    ) {
      reason = 'Hidden critical failure detected in evidence path.';
    }

    const isGreen =
      allChecksPassed && evidenceExists && lineageExists && attestationExists && noCriticalFailures;

    return {
      isGreen,
      allChecksPassed,
      evidenceExists,
      lineageExists,
      attestationExists,
      noCriticalFailures,
      reason,
      evaluatedAt: new Date().toISOString(),
    };
  }
}

export default GreenEngine;
