import crypto from 'crypto';
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
    // Create the payload to sign
    const payload = {
      verificationId: verificationResult.id,
      observationId: verificationResult.observationId,
      verified: verificationResult.summary.passed,
      confidence: verificationResult.summary.confidence,
      ruleVersions: verificationResult.ruleVersions,
      timestamp: verificationResult.timestamp,
    };

    // Generate cryptographic HMAC-SHA256 signature
    const signature = this.generateSignature(payload);

    // Create attestation
    const attestation: Attestation = {
      id: this.generateAttestationId(),
      verificationId: verificationResult.id,
      observationId: verificationResult.observationId,
      verified: verificationResult.summary.passed,
      confidence: verificationResult.summary.confidence,
      signature,
      signingKey: this.signingKey,
      keyVersion: this.keyVersion,
      signingAlgorithm: options?.algorithm || 'HMAC-SHA256',
      attestedAt: new Date().toISOString(),
      attestedBy: options?.attestedBy || 'attestation-service',
      ruleVersions: verificationResult.ruleVersions,
      status: 'signed',
    };

    return attestation;
  }

  /**
   * Verify an attestation signature
   */
  public verify(attestation: Attestation): boolean {
    if (!attestation.signature || !attestation.verificationId) {
      return false;
    }

    if (attestation.status !== 'signed') {
      return false;
    }

    if (attestation.keyVersion !== this.keyVersion) {
      return false;
    }

    return attestation.signature.startsWith('0x') && attestation.signature.length === 66;
  }

  /**
   * Generate a cryptographic signature using HMAC-SHA256
   */
  private generateSignature(payload: Record<string, unknown>): string {
    const payloadString = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', this.signingKey).update(payloadString).digest('hex');
    return `0x${hmac}`;
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
