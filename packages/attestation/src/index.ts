import {
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  KeyObject,
  sign,
  timingSafeEqual,
  verify as verifySignature,
} from 'node:crypto';
import { Attestation, VerificationResult } from '@omega-v/types';

export const SIGNING_KEY_ENV = 'OMEGA_SIGNING_KEY';
export const ATTESTATION_ALGORITHM_ENV = 'OMEGA_ATTESTATION_ALGORITHM';
export const ED25519_PRIVATE_KEY_ENV = 'OMEGA_ED25519_PRIVATE_KEY';
export const ED25519_PUBLIC_KEY_ENV = 'OMEGA_ED25519_PUBLIC_KEY';
export const ATTESTATION_KEY_VERSION_ENV = 'OMEGA_ATTESTATION_KEY_VERSION';
export const HMAC_SHA256 = 'HMAC-SHA256';
export const ED25519 = 'Ed25519';
export type AttestationAlgorithm = typeof HMAC_SHA256 | typeof ED25519;

export class MissingSigningKeyError extends Error {
  constructor() {
    super(
      `No signing key available. Pass one to the AttestationService constructor or set ${SIGNING_KEY_ENV}. Refusing to sign with a default key.`
    );
    this.name = 'MissingSigningKeyError';
  }
}

export class UnsupportedAttestationAlgorithmError extends Error {
  constructor(algorithm: string) {
    super(`Unsupported attestation algorithm: ${algorithm}`);
    this.name = 'UnsupportedAttestationAlgorithmError';
  }
}

export class InvalidEd25519KeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidEd25519KeyError';
  }
}

export class AttestationService {
  private signingKey: string | KeyObject;
  private keyVersion: string;
  private algorithm: AttestationAlgorithm;
  private publicKey?: KeyObject;

  constructor(
    signingKey?: string,
    keyVersion: string = process.env[ATTESTATION_KEY_VERSION_ENV] || '1',
    algorithm: string = process.env[ATTESTATION_ALGORITHM_ENV] || HMAC_SHA256
  ) {
    this.algorithm = AttestationService.parseAlgorithm(algorithm);
    this.keyVersion = keyVersion;

    if (this.algorithm === ED25519) {
      const material = signingKey ?? process.env[ED25519_PRIVATE_KEY_ENV];
      if (!material) throw new MissingSigningKeyError();

      const privateKey = AttestationService.parseEd25519PrivateKey(material);
      const derivedPublicKey = createPublicKey(privateKey);
      const supplied = process.env[ED25519_PUBLIC_KEY_ENV];

      if (supplied) {
        const expected = derivedPublicKey.export({ type: 'spki', format: 'der' });
        const actual = AttestationService.parseEd25519PublicKey(supplied).export({
          type: 'spki',
          format: 'der',
        });
        if (!expected.equals(actual)) {
          throw new InvalidEd25519KeyError(
            'Configured Ed25519 public key does not match the private key'
          );
        }
      }

      this.signingKey = privateKey;
      this.publicKey = derivedPublicKey;
      return;
    }

    const key = signingKey ?? process.env[SIGNING_KEY_ENV];
    if (!key) throw new MissingSigningKeyError();
    this.signingKey = key;
  }

  public attest(
    verificationResult: VerificationResult,
    options?: { attestedBy?: string; algorithm?: string }
  ): Attestation {
    const requested = options?.algorithm
      ? AttestationService.parseAlgorithm(options.algorithm)
      : this.algorithm;

    if (requested !== this.algorithm) {
      throw new UnsupportedAttestationAlgorithmError(
        `requested ${requested}, configured ${this.algorithm}`
      );
    }

    const attestation: Attestation = {
      id: this.generateAttestationId(),
      verificationId: verificationResult.id,
      observationId: verificationResult.observationId,
      verified: verificationResult.summary.passed,
      confidence: verificationResult.summary.confidence,
      signature: '',
      signingKey: this.keyFingerprint(),
      keyVersion: this.keyVersion,
      signingAlgorithm: this.algorithm,
      attestedAt: new Date().toISOString(),
      attestedBy: options?.attestedBy || 'attestation-service',
      ruleVersions: verificationResult.ruleVersions,
      ...(this.algorithm === ED25519
        ? {
            verifyingPublicKey: this.publicKey!.export({ type: 'spki', format: 'pem' }).toString(),
          }
        : {}),
      status: 'signed',
    };

    attestation.signature = this.generateSignature(this.createSignaturePayload(attestation));
    return attestation;
  }

  public verify(attestation: Attestation): boolean {
    if (
      !attestation.signature ||
      !attestation.verificationId ||
      !attestation.observationId ||
      attestation.status !== 'signed'
    ) {
      return false;
    }

    if (
      attestation.keyVersion !== this.keyVersion ||
      attestation.signingAlgorithm !== this.algorithm ||
      attestation.signingKey !== this.keyFingerprint()
    ) {
      return false;
    }

    try {
      const payload = this.createSignaturePayload(attestation);

      if (this.algorithm === ED25519) {
        if (!attestation.verifyingPublicKey) return false;

        const supplied = AttestationService.parseEd25519PublicKey(attestation.verifyingPublicKey);
        const expected = this.publicKey!.export({ type: 'spki', format: 'der' });
        const actual = supplied.export({ type: 'spki', format: 'der' });
        if (!expected.equals(actual)) return false;

        return verifySignature(
          null,
          Buffer.from(payload.canonical, 'utf8'),
          this.publicKey!,
          Buffer.from(attestation.signature.replace(/^0x/, ''), 'hex')
        );
      }

      const expected = Buffer.from(this.generateSignature(payload.value).replace(/^0x/, ''), 'hex');
      const actual = Buffer.from(attestation.signature.replace(/^0x/, ''), 'hex');
      return actual.length === expected.length && timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  }

  public keyFingerprint(): string {
    if (this.algorithm === ED25519) {
      return `sha256:${createHash('sha256')
        .update(this.publicKey!.export({ type: 'spki', format: 'der' }))
        .digest('hex')
        .slice(0, 16)}`;
    }

    return `sha256:${createHmac('sha256', 'omega-v-key-fingerprint')
      .update(this.signingKey as string)
      .digest('hex')
      .slice(0, 16)}`;
  }

  public getKeyInfo(): {
    fingerprint: string;
    version: string;
    algorithm: AttestationAlgorithm;
    publicKey?: string;
  } {
    return {
      fingerprint: this.keyFingerprint(),
      version: this.keyVersion,
      algorithm: this.algorithm,
      ...(this.algorithm === ED25519
        ? {
            publicKey: this.publicKey!.export({ type: 'spki', format: 'pem' }).toString(),
          }
        : {}),
    };
  }

  public rotateKey(newKey: string, newVersion: string): void {
    if (!newKey) throw new MissingSigningKeyError();

    if (this.algorithm === ED25519) {
      const privateKey = AttestationService.parseEd25519PrivateKey(newKey);
      this.signingKey = privateKey;
      this.publicKey = createPublicKey(privateKey);
    } else {
      this.signingKey = newKey;
    }

    this.keyVersion = newVersion;
  }

  private static parseAlgorithm(algorithm: string): AttestationAlgorithm {
    if (algorithm === HMAC_SHA256 || algorithm === ED25519) return algorithm;
    throw new UnsupportedAttestationAlgorithmError(algorithm);
  }

  private static parseEd25519PrivateKey(material: string): KeyObject {
    try {
      const key = createPrivateKey(material);
      if (key.asymmetricKeyType !== 'ed25519') {
        throw new Error(`expected ed25519, received ${key.asymmetricKeyType || 'unknown'}`);
      }
      return key;
    } catch (error) {
      throw new InvalidEd25519KeyError(
        `Invalid Ed25519 private key: ${error instanceof Error ? error.message : 'unable to parse key'}`
      );
    }
  }

  private static parseEd25519PublicKey(material: string): KeyObject {
    try {
      const key = createPublicKey(material);
      if (key.asymmetricKeyType !== 'ed25519') {
        throw new Error(`expected ed25519, received ${key.asymmetricKeyType || 'unknown'}`);
      }
      return key;
    } catch (error) {
      throw new InvalidEd25519KeyError(
        `Invalid Ed25519 public key: ${error instanceof Error ? error.message : 'unable to parse key'}`
      );
    }
  }

  private generateSignature(payload: Record<string, unknown>): string {
    if (this.algorithm === ED25519) {
      return `0x${sign(
        null,
        Buffer.from(JSON.stringify(payload)),
        this.signingKey as KeyObject
      ).toString('hex')}`;
    }

    return `0x${createHmac('sha256', this.signingKey as string)
      .update(JSON.stringify(payload))
      .digest('hex')}`;
  }

  private createSignaturePayload(attestation: Attestation): {
    value: Record<string, unknown>;
    canonical: string;
  } {
    const value: Record<string, unknown> = {
      verificationId: attestation.verificationId,
      observationId: attestation.observationId,
      verified: attestation.verified,
      confidence: attestation.confidence,
      ruleVersions: attestation.ruleVersions,
      attestedAt: attestation.attestedAt,
      attestedBy: attestation.attestedBy,
      keyVersion: attestation.keyVersion,
    };

    if (this.algorithm === ED25519) {
      value.signingAlgorithm = attestation.signingAlgorithm;
    }

    return { value, canonical: JSON.stringify(value) };
  }

  private generateAttestationId(): string {
    return `att-${new Date().toISOString().split('T')[0]}-${Math.random()
      .toString(36)
      .substring(7)}`;
  }
}

export default AttestationService;
