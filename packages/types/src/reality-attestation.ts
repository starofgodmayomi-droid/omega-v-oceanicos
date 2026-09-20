export type RealityVerificationStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';

export type RealityAttestationStatus = 'signed' | 'revoked' | 'expired';

/**
 * Cryptographic proof of what reality reconciliation established after an
 * authorized execution. UNKNOWN is intentionally attestable: it proves that
 * the observation boundary was reached but was insufficient to prove the
 * expected external state. NOT_EXECUTED is excluded because it is not a
 * reality result.
 */
export interface RealityAttestation {
  readonly id: string;
  readonly changeId: string;
  readonly executionAttestationId?: string;
  readonly realityStatus: RealityVerificationStatus;
  readonly expectedState?: string;
  readonly observedState?: string;
  readonly evidence: string;
  readonly observedAt: string;
  readonly attestedAt: string;
  readonly attestedBy: string;
  readonly signingKey: string;
  readonly keyVersion: string;
  readonly signingAlgorithm: string;
  readonly signature: string;
  readonly verifyingPublicKey?: string;
  readonly status: RealityAttestationStatus;
}
