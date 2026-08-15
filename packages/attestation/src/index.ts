import { createHmac, timingSafeEqual } from 'node:crypto';
import { Attestation, VerificationResult } from '@omega-v/types';

/** Environment variable read when no signing key is passed explicitly. */
export const SIGNING_KEY_ENV = 'OMEGA_SIGNING_KEY';

/**
 * Raised when no signing key is available.
 *
 * Invariant 3 requires attestations to be unforgeable. A key committed to
 * source, or a shared default, makes every signature reproducible by anyone
 * holding the repository. Failing loudly at construction is the only honest
 * behaviour: a service that silently signs with a public key produces
 * attestations that assert rather than attest.
 */
export class MissingSigningKeyError extends Error {
  constructor() {
    super(
      `No signing key available. Pass one to the AttestationService constructor ` +
        `or set ${SIGNING_KEY_ENV}. Refusing to sign with a default key.`
    );
    this.name = 'MissingSigningKeyError';
  }
}

/**
 * AttestationService: Cryptographically signs verification results
 *
 * Step 3 of the verification loop
 * Creates unforgeable proof of verification at a specific time
 */
export class AttestationService {
  private signingKey: string;
  private keyVersion: string;

  /**
   * Create a new attestation service.
   *
   * @param signingKey - Secret HMAC key. Falls back to process.env[SIGNING_KEY_ENV].
   * @param keyVersion - Version label recorded on every attestation.
   * @throws MissingSigningKeyError when neither a key argument nor the
   *         environment variable is present.
   */
  constructor(signingKey?: string, keyVersion: string = '1') {
    const key = signingKey ?? process.env[SIGNING_KEY_ENV];
    if (!key) {
      throw new MissingSigningKeyError();
    }
    this.signingKey = key;
    this.keyVersion = keyVersion;
  }

  /**
   * Attest a verification result
   * Creates a cryptographic signature proving the verification happened
   */
  public attest(
    verificationResult: VerificationResult,
    options?: {
      attestedBy?: string;
      algorithm?: string;
    }
  ): Attestation {
    // Create attestation
    const attestation: Attestation = {
      id: this.generateAttestationId(),
      verificationId: verificationResult.id,
      observationId: verificationResult.observationId,
      verified: verificationResult.summary.passed,
      confidence: verificationResult.summary.confidence,
      signature: '',
      signingKey: this.keyFingerprint(),
      keyVersion: this.keyVersion,
      signingAlgorithm: options?.algorithm || 'HMAC-SHA256',
      attestedAt: new Date().toISOString(),
      attestedBy: options?.attestedBy || 'attestation-service',
      ruleVersions: verificationResult.ruleVersions,
      status: 'signed',
    };

    attestation.signature = this.generateSignature(this.createSignaturePayload(attestation));

    return attestation;
  }

  /**
   * Verify an attestation signature
   */
  public verify(attestation: Attestation): boolean {
    if (!attestation.signature || !attestation.verificationId || !attestation.observationId) {
      return false;
    }

    // Check status
    if (attestation.status !== 'signed') {
      return false;
    }

    // Check that key version matches
    if (attestation.keyVersion !== this.keyVersion) {
      return false;
    }

    const expectedSignature = this.generateSignature(this.createSignaturePayload(attestation));
    const actual = Buffer.from(attestation.signature.replace(/^0x/, ''), 'hex');
    const expected = Buffer.from(expectedSignature.replace(/^0x/, ''), 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  private generateSignature(payload: Record<string, unknown>): string {
    return `0x${createHmac('sha256', this.signingKey).update(JSON.stringify(payload)).digest('hex')}`;
  }

  private createSignaturePayload(attestation: Attestation): Record<string, unknown> {
    return {
      verificationId: attestation.verificationId,
      observationId: attestation.observationId,
      verified: attestation.verified,
      confidence: attestation.confidence,
      ruleVersions: attestation.ruleVersions,
      attestedAt: attestation.attestedAt,
      attestedBy: attestation.attestedBy,
      keyVersion: attestation.keyVersion,
    };
  }

  /**
   * Generate a unique attestation ID
   */
  private generateAttestationId(): string {
    return `att-${new Date().toISOString().split('T')[0]}-${Math.random()
      .toString(36)
      .substring(7)}`;
  }

  /**
   * Non-reversible identifier for the active key.
   * Recorded on attestations so signatures can be traced to a key without
   * publishing the key itself.
   */
  public keyFingerprint(): string {
    return `sha256:${createHmac('sha256', 'omega-v-key-fingerprint')
      .update(this.signingKey)
      .digest('hex')
      .slice(0, 16)}`;
  }

  /**
   * Get non-secret signing key information.
   */
  public getKeyInfo(): { fingerprint: string; version: string } {
    return {
      fingerprint: this.keyFingerprint(),
      version: this.keyVersion,
    };
  }

  /**
   * Rotate to a new signing key
   */
  public rotateKey(newKey: string, newVersion: string): void {
    if (!newKey) {
      throw new MissingSigningKeyError();
    }
    this.signingKey = newKey;
    this.keyVersion = newVersion;
  }
}

export default AttestationService;
