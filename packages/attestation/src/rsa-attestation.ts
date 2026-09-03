import crypto from 'crypto';
import { Attestation, VerificationResult } from '@omega-v/types';

export interface RSAKeyPair {
  publicKey: string;
  privateKey: string;
}

export interface RSAAttestationConfig {
  algorithm?: 'RSA-SHA256' | 'RSA-SHA512';
  keySize?: 2048 | 4096;
}

export class RSAAttestationService {
  private currentKeyVersion: number = 1;
  private keyVersions: Map<number, RSAKeyPair> = new Map();
  private algorithm: 'RSA-SHA256' | 'RSA-SHA512';
  private keySize: 2048 | 4096;

  constructor(config: RSAAttestationConfig = {}) {
    this.algorithm = config.algorithm || 'RSA-SHA256';
    this.keySize = config.keySize || 2048;
    this.generateKeyPair();
  }

  /**
   * Generate a new RSA key pair and rotate to it
   */
  private generateKeyPair(): void {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: this.keySize,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    this.keyVersions.set(this.currentKeyVersion, {
      publicKey: publicKey as string,
      privateKey: privateKey as string,
    });
  }

  /**
   * Rotate to a new key version (for key management)
   */
  rotateKey(): number {
    const newVersion = this.currentKeyVersion + 1;
    this.currentKeyVersion = newVersion;
    this.generateKeyPair();
    return newVersion;
  }

  /**
   * Create a production-grade RSA attestation
   */
  createAttestation(verification: VerificationResult, observationId: string): Attestation {
    const keyPair = this.keyVersions.get(this.currentKeyVersion);
    if (!keyPair) {
      throw new Error(`Key version ${this.currentKeyVersion} not found`);
    }

    const attestedAt = new Date().toISOString();
    const attestationData = {
      observationId,
      verificationId: verification.id,
      verified: verification.summary.passed,
      confidence: verification.summary.confidence || 0,
      timestamp: attestedAt,
      algorithm: this.algorithm,
      ruleVersions: verification.ruleVersions,
    };

    // Sign the attestation data
    const dataToSign = JSON.stringify(attestationData);
    const signature = this.sign(dataToSign, keyPair.privateKey);

    const keyPairObj = keyPair as RSAKeyPair;

    return {
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      observationId,
      verificationId: verification.id,
      verified: verification.summary.passed,
      confidence: verification.summary.confidence || 0,
      signature,
      signingKey: `rsa-key-${this.currentKeyVersion}`,
      keyVersion: this.currentKeyVersion.toString(),
      signingAlgorithm: this.algorithm,
      attestedAt,
      attestedBy: 'rsa-attestation-service',
      ruleVersions: verification.ruleVersions,
      verifyingPublicKey: keyPairObj.publicKey,
      status: 'signed',
    };
  }

  /**
   * Verify an RSA attestation using its public key
   */
  verifyAttestation(attestation: Attestation): boolean {
    if (!attestation.verifyingPublicKey) {
      return false;
    }

    const attestationData = {
      observationId: attestation.observationId,
      verificationId: attestation.verificationId,
      verified: attestation.verified,
      confidence: attestation.confidence,
      timestamp: attestation.attestedAt,
      algorithm: attestation.signingAlgorithm,
      ruleVersions: attestation.ruleVersions,
    };

    const dataToVerify = JSON.stringify(attestationData);

    try {
      return this.verify(dataToVerify, attestation.signature, attestation.verifyingPublicKey);
    } catch {
      return false;
    }
  }

  /**
   * Mark an attestation as revoked (after key rotation)
   */
  markRevoked(attestation: Attestation): Attestation {
    return {
      ...attestation,
      status: 'revoked',
    };
  }

  /**
   * Get a specific key pair version
   */
  getKeyVersion(version: number): RSAKeyPair | null {
    return this.keyVersions.get(version) || null;
  }

  /**
   * Get current key version number
   */
  getCurrentKeyVersion(): number {
    return this.currentKeyVersion;
  }

  /**
   * Get all key versions (returns only public keys for security)
   */
  getAllPublicKeyVersions(): Record<number, string> {
    const result: Record<number, string> = {};
    for (const [version, keys] of this.keyVersions.entries()) {
      result[version] = keys.publicKey;
    }
    return result;
  }

  private sign(data: string, privateKey: string): string {
    const signer = crypto.createSign(this.algorithm === 'RSA-SHA256' ? 'RSA-SHA256' : 'RSA-SHA512');
    signer.update(data);
    signer.end();
    return signer.sign(privateKey, 'hex');
  }

  private verify(data: string, signature: string, publicKey: string): boolean {
    const verifier = crypto.createVerify(
      this.algorithm === 'RSA-SHA256' ? 'RSA-SHA256' : 'RSA-SHA512'
    );
    verifier.update(data);
    verifier.end();
    return verifier.verify(publicKey, signature, 'hex');
  }
}

export default RSAAttestationService;
