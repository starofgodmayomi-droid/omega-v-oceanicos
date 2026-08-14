import { createHmac, timingSafeEqual } from 'node:crypto';
import { Attestation, VerificationResult } from '@omega-v/types';

/**
 * AttestationService: Cryptographically signs verification results
 *
 * Step 3 of the verification loop
 * Creates unforgeable proof of verification at a specific time
 */
export class AttestationService {
  /**
   * Create a new attestation service
   */
  constructor(
    private signingKey: string = 'key-2026-08-production-v1',
    private keyVersion: string = '1'
  ) {}

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
      signingKey: this.signingKey,
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
   * In a real system, this would use the public key
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
   * Get signing key information
   */
  public getKeyInfo(): { key: string; version: string } {
    return {
      key: this.signingKey,
      version: this.keyVersion,
    };
  }

  /**
   * Rotate to a new signing key
   */
  public rotateKey(newKey: string, newVersion: string): void {
    this.signingKey = newKey;
    this.keyVersion = newVersion;
  }
}

export default AttestationService;
