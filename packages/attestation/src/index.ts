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
  constructor(message?: string) {
    super(
      message ||
        `No signing key available. Pass one to the AttestationService constructor ` +
          `or set ${SIGNING_KEY_ENV}. Refusing to sign with a default key.`
    );
    this.name = 'MissingSigningKeyError';
  }
}

/**
 * Raised when key material is present but unusable.
 *
 * Distinct from {@link MissingSigningKeyError}, which means no key was
 * supplied at all. This one means a key was supplied and cannot do the job:
 * an Ed25519 private key that will not parse, or a public key that does not
 * belong to the private key beside it.
 */
export class InvalidSigningKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSigningKeyError';
  }
}

/**
 * Parse an Ed25519 private key and derive its public half.
 *
 * Deriving rather than trusting a separately supplied public key removes a
 * whole class of misconfiguration: a verifier holding the wrong public key
 * rejects every attestation it should accept, and does so silently. When a
 * public key is supplied anyway it is checked, not ignored.
 */
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

/** PEM comparison that ignores line-ending and trailing-newline differences. */
function normalizePem(pem: string): string {
  return pem.replace(/\r\n/g, '\n').trim();
}

/**
 * The exact bytes covered by a signature.
 *
 * Shared by the signer and by every verifier, including ones outside this
 * process. A verifier that reconstructs this differently verifies nothing.
 */
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

/**
 * Verify an Ed25519 attestation with only the public key.
 *
 * This is the point of asymmetric signing: a stranger holding the public key
 * can check the signature without the ability to produce one. HMAC cannot do
 * this — verifying an HMAC requires the same secret that signs it, so anyone
 * who can check an attestation can also forge one.
 */
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

/**
 * Configuration for attestation signing
 */
export interface AttestationConfig {
  /** Which algorithm to use for signing */
  algorithm?: SigningAlgorithm;
  /** Secret key (HMAC or Ed25519 private key) */
  signingKey?: string;
  /** Public key for Ed25519 (optional, used for external verification) */
  publicKey?: string;
  /** Version label recorded on every attestation */
  keyVersion?: string;
}

/**
 * AttestationService: Cryptographically signs verification results
 *
 * Supports both HMAC-SHA256 (symmetric, backward compatible) and Ed25519 (asymmetric, for external verification).
 * Attestations include algorithm info so verifiers can use the correct algorithm.
 */
export class AttestationService {
  private signingKey: string;
  private publicKey: string | null;
  private keyVersion: string;
  private algorithm: SigningAlgorithm;

  /**
   * Create a new attestation service.
   *
   * Accepts an {@link AttestationConfig}, or `(signingKey, keyVersion)` for
   * compatibility with the original HMAC-only signature.
   *
   * An Ed25519 private key is parsed here and its public half derived, so a
   * key that cannot sign fails at construction rather than at first use. Any
   * `publicKey` passed alongside it is checked against the derived one: a
   * mismatch is a misconfiguration that would make every attestation fail to
   * verify, and it is better to learn that at startup than in production.
   *
   * @throws MissingSigningKeyError when neither a key argument nor the
   *         matching environment variable is present.
   * @throws InvalidSigningKeyError when Ed25519 key material cannot be
   *         parsed, or a supplied public key does not match the private one.
   */
  constructor(config?: AttestationConfig | string, keyVersion?: string) {
    // Handle backward compatibility: old API was (signingKey, keyVersion)
    let algorithm: SigningAlgorithm = 'HMAC-SHA256';
    let signingKey: string | undefined;
    let publicKey: string | undefined;
    let version: string;

    if (typeof config === 'string') {
      // Old API: new AttestationService(key, version)
      signingKey = config;
      version = keyVersion || '1';
    } else {
      // New API: new AttestationService({ ... })
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

  /**
   * Attest a verification result
   * Creates a cryptographic signature proving the verification happened
   */
  public attest(
    verificationResult: VerificationResult,
    options?: {
      attestedBy?: string;
    }
  ): Attestation {
    // The algorithm follows the key material. It is not a per-call choice:
    // signing under an algorithm this service is not configured for produces
    // an attestation this service cannot verify.
    const algorithm = this.algorithm;

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
      signingAlgorithm: algorithm,
      attestedAt: new Date().toISOString(),
      attestedBy: options?.attestedBy || 'attestation-service',
      ruleVersions: verificationResult.ruleVersions,
      status: 'signed',
    };

    attestation.signature = this.generateSignature(
      this.createSignaturePayload(attestation),
      algorithm
    );

    return attestation;
  }

  /**
   * Verify an attestation signature.
   *
   * The algorithm is taken from this service's own configuration, never from
   * the attestation. An attestation claiming a different algorithm than the
   * verifier is configured for is rejected rather than verified under the
   * algorithm it names.
   *
   * That distinction is the whole guarantee. Selecting a primitive from a
   * field inside the untrusted object is how `alg`-confusion works: a
   * verifier holding an Ed25519 key, asked to check an attestation claiming
   * HMAC, would otherwise HMAC with its own key material on a path the
   * submitter chose. Here the submitter chooses nothing.
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

    // A missing algorithm predates the field and is HMAC by definition.
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
    } else {
      return `0x${createHmac('sha256', this.signingKey).update(payloadStr).digest('hex')}`;
    }
  }

  private createSignaturePayload(attestation: Attestation): Record<string, unknown> {
    return createSignaturePayload(attestation);
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
    // For Ed25519 the public half identifies the key just as well and is not
    // secret, so anyone holding the public key can compute this fingerprint
    // and confirm which key signed an attestation. HMAC has no public half;
    // there the secret itself is the only thing available to fingerprint,
    // and the truncated one-way digest is what keeps that safe.
    const material =
      this.algorithm === 'Ed25519' && this.publicKey ? this.publicKey : this.signingKey;
    return `sha256:${createHmac('sha256', 'omega-v-key-fingerprint')
      .update(material)
      .digest('hex')
      .slice(0, 16)}`;
  }

  /**
   * Get non-secret signing key information.
   * For Ed25519, includes the public key if available.
   */
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

  /**
   * Rotate to a new signing key.
   *
   * The public half is re-derived from the new private key, so a rotation
   * cannot leave a stale public key behind. Passing `newPublicKey` checks it
   * against the derived one rather than overriding it.
   *
   * Attestations signed under the previous version stop verifying against
   * this instance: key version is part of the signed payload, so a rotation
   * is a visible break rather than a silent one.
   *
   * @throws MissingSigningKeyError when no key is supplied.
   * @throws InvalidSigningKeyError when the new Ed25519 key cannot be parsed,
   *         or the supplied public key does not match it. The service is left
   *         on its previous key rather than in a half-rotated state.
   */
  public rotateKey(newKey: string, newVersion: string, newPublicKey?: string): void {
    if (!newKey) {
      throw new MissingSigningKeyError();
    }
    // Resolve before mutating: a rotation that throws halfway would leave the
    // service holding a new private key alongside the old public one.
    const resolved = this.algorithm === 'Ed25519' ? resolvePublicKey(newKey, newPublicKey) : null;
    this.signingKey = newKey;
    this.keyVersion = newVersion;
    this.publicKey = resolved;
  }
}

export default AttestationService;
