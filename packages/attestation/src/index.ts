import {
  createHmac,
  createPrivateKey,
  createPublicKey,
  timingSafeEqual,
  sign,
  verify,
} from 'node:crypto';
import { Attestation, VerificationResult } from '@omega-v/types';

/** Environment variable read when no signing key is passed explicitly. */
export const SIGNING_KEY_ENV = 'OMEGA_SIGNING_KEY';

/** Environment variable for Ed25519 private key (if using asymmetric signing). */
export const ED25519_KEY_ENV = 'OMEGA_ED25519_KEY';

/** Supported signing algorithms */
export type SigningAlgorithm = 'HMAC-SHA256' | 'Ed25519';

export class MissingSigningKeyError extends Error {
  constructor(message?: string) {
    super(
      message ||
        `No signing key available. Pass one to the AttestationService constructor ` +
          `or set ${SIGNING_KEY_ENV}. Refusing to sign with a default key.`
    );
    this.name = 'MissingSigningKeyError';
  }
}

export class InvalidSigningKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSigningKeyError';
  }
}

function resolvePublicKey(privateKeyPem: string, suppliedPublicKey?: string): string {
  let derived: string;
  try {
    derived = createPublicKey(createPrivateKey(privateKeyPem))
      .export({ type: 'spki', format: 'pem' })
      .toString();
  } catch (error) {
    throw new InvalidSigningKeyError(
      `Ed25519 signing key could not be parsed: ${
        error instanceof Error ? error.message : String(error)
      }. Expected a PEM-encoded private key.`
    );
  }

  if (suppliedPublicKey && normalizePem(suppliedPublicKey) !== normalizePem(derived)) {
    throw new InvalidSigningKeyError(
      'Supplied Ed25519 public key does not match the private key. ' +
        'Every attestation signed by this service would fail to verify against it.'
    );
  }

  return derived;
}

function normalizePem(pem: string): string {
  return pem.replace(/\r\n/g, '\n').trim();
}

function createSignaturePayload(attestation: Attestation): Record<string, unknown> {
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

export function verifyEd25519(attestation: Attestation, publicKey: string): boolean {
  if (!attestation.signature || !attestation.verificationId || !attestation.observationId) {
    return false;
  }
  if (attestation.status !== 'signed') {
    return false;
  }
  if (attestation.signingAlgorithm !== 'Ed25519') {
    return false;
  }
  try {
    const signature = Buffer.from(attestation.signature.replace(/^0x/, ''), 'hex');
    const payload = JSON.stringify(createSignaturePayload(attestation));
    return verify(null, Buffer.from(payload), publicKey, signature);
  } catch {
    return false;
  }
}

export interface AttestationConfig {
  algorithm?: SigningAlgorithm;
  signingKey?: string;
  publicKey?: string;
  keyVersion?: string;
}

export class AttestationService {
  private signingKey: string;
  private publicKey: string | null;
  private keyVersion: string;
  private algorithm: SigningAlgorithm;

  constructor(config?: AttestationConfig | string, keyVersion?: string) {
    let algorithm: SigningAlgorithm = 'HMAC-SHA256';
    let signingKey: string | undefined;
    let publicKey: string | undefined;
    let version: string;

    if (typeof config === 'string') {
      signingKey = config;
      version = keyVersion || '1';
    } else {
      algorithm = config?.algorithm || 'HMAC-SHA256';
      signingKey = config?.signingKey;
      publicKey = config?.publicKey;
      version = config?.keyVersion || '1';
    }

    const key =
      algorithm === 'Ed25519'
        ? (signingKey ?? process.env[ED25519_KEY_ENV])
        : (signingKey ?? process.env[SIGNING_KEY_ENV]);

    if (!key) {
      const envVar = algorithm === 'Ed25519' ? ED25519_KEY_ENV : SIGNING_KEY_ENV;
      throw new MissingSigningKeyError(
        `No ${algorithm} key available. Pass one to the AttestationService constructor ` +
          `or set ${envVar}. Refusing to sign with a default key.`
      );
    }

    this.signingKey = key;
    this.keyVersion = version;
    this.algorithm = algorithm;
    this.publicKey = algorithm === 'Ed25519' ? resolvePublicKey(key, publicKey) : null;
  }

  public attest(
    verificationResult: VerificationResult,
    options?: { attestedBy?: string }
  ): Attestation {
    const algorithm = this.algorithm;
    const attestation: Attestation = {
      id: this.generateAttestationId(),
      verificationId: verificationResult.id,
      observationId: verificationResult.observationId,
      verified: verificationResult.summary.passed,
      confidence: verificationResult.summary.confidence,
      signature: '',
      signingKey: this.keyFingerprint(),
      keyVersion: this.keyVersion,
      signingAlgorithm: algorithm,
      attestedAt: new Date().toISOString(),
      attestedBy: options?.attestedBy || 'attestation-service',
      ruleVersions: verificationResult.ruleVersions,
      verifyingPublicKey: this.publicKey || undefined,
      status: 'signed',
    };

    attestation.signature = this.generateSignature(
      this.createSignaturePayload(attestation),
      algorithm
    );

    return attestation;
  }

  public verify(attestation: Attestation): boolean {
    if (!attestation.signature || !attestation.verificationId || !attestation.observationId) {
      return false;
    }
    if (attestation.status !== 'signed') {
      return false;
    }
    if (attestation.keyVersion !== this.keyVersion) {
      return false;
    }
    const claimed = (attestation.signingAlgorithm as SigningAlgorithm) || 'HMAC-SHA256';
    if (claimed !== this.algorithm) {
      return false;
    }

    if (this.algorithm === 'Ed25519') {
      if (!this.publicKey) {
        return false;
      }
      return verifyEd25519(attestation, this.publicKey);
    }

    const expectedSignature = this.generateSignature(
      this.createSignaturePayload(attestation),
      this.algorithm
    );
    const actual = Buffer.from(attestation.signature.replace(/^0x/, ''), 'hex');
    const expected = Buffer.from(expectedSignature.replace(/^0x/, ''), 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  private generateSignature(payload: Record<string, unknown>, algorithm: SigningAlgorithm): string {
    const payloadStr = JSON.stringify(payload);
    if (algorithm === 'Ed25519') {
      const signatureBuffer = sign(null, Buffer.from(payloadStr), this.signingKey);
      return `0x${signatureBuffer.toString('hex')}`;
    }
    return `0x${createHmac('sha256', this.signingKey).update(payloadStr).digest('hex')}`;
  }

  private createSignaturePayload(attestation: Attestation): Record<string, unknown> {
    return createSignaturePayload(attestation);
  }

  private generateAttestationId(): string {
    return `att-${new Date().toISOString().split('T')[0]}-${Math.random()
      .toString(36)
      .substring(7)}`;
  }

  public keyFingerprint(): string {
    const material =
      this.algorithm === 'Ed25519' && this.publicKey ? this.publicKey : this.signingKey;
    return `sha256:${createHmac('sha256', 'omega-v-key-fingerprint')
      .update(material)
      .digest('hex')
      .slice(0, 16)}`;
  }

  public getKeyInfo(): {
    fingerprint: string;
    version: string;
    algorithm: SigningAlgorithm;
    publicKey?: string;
  } {
    return {
      fingerprint: this.keyFingerprint(),
      version: this.keyVersion,
      algorithm: this.algorithm,
      publicKey: this.publicKey || undefined,
    };
  }

  public rotateKey(newKey: string, newVersion: string, newPublicKey?: string): void {
    if (!newKey) {
      throw new MissingSigningKeyError();
    }
    const resolved = this.algorithm === 'Ed25519' ? resolvePublicKey(newKey, newPublicKey) : null;
    this.signingKey = newKey;
    this.keyVersion = newVersion;
    this.publicKey = resolved;
  }
}

export default AttestationService;
