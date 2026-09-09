import { Attestation, VerificationResult } from '@omega-v/types';
/** Environment variable read when no signing key is passed explicitly. */
export declare const SIGNING_KEY_ENV = "OMEGA_SIGNING_KEY";
/** Environment variable for Ed25519 private key (if using asymmetric signing). */
export declare const ED25519_KEY_ENV = "OMEGA_ED25519_KEY";
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
export declare class MissingSigningKeyError extends Error {
    constructor(message?: string);
}
/**
 * Raised when key material is present but unusable.
 *
 * Distinct from {@link MissingSigningKeyError}, which means no key was
 * supplied at all. This one means a key was supplied and cannot do the job:
 * an Ed25519 private key that will not parse, or a public key that does not
 * belong to the private key beside it.
 */
export declare class InvalidSigningKeyError extends Error {
    constructor(message: string);
}
/**
 * Verify an Ed25519 attestation with only the public key.
 *
 * This is the point of asymmetric signing: a stranger holding the public key
 * can check the signature without the ability to produce one. HMAC cannot do
 * this — verifying an HMAC requires the same secret that signs it, so anyone
 * who can check an attestation can also forge one.
 */
export declare function verifyEd25519(attestation: Attestation, publicKey: string): boolean;
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
export declare class AttestationService {
    private signingKey;
    private publicKey;
    private keyVersion;
    private algorithm;
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
    constructor(config?: AttestationConfig | string, keyVersion?: string);
    /**
     * Attest a verification result
     * Creates a cryptographic signature proving the verification happened
     */
    attest(verificationResult: VerificationResult, options?: {
        attestedBy?: string;
    }): Attestation;
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
    verify(attestation: Attestation): boolean;
    private generateSignature;
    private createSignaturePayload;
    /**
     * Generate a unique attestation ID
     */
    private generateAttestationId;
    /**
     * Non-reversible identifier for the active key.
     * Recorded on attestations so signatures can be traced to a key without
     * publishing the key itself.
     */
    keyFingerprint(): string;
    /**
     * Get non-secret signing key information.
     * For Ed25519, includes the public key if available.
     */
    getKeyInfo(): {
        fingerprint: string;
        version: string;
        algorithm: SigningAlgorithm;
        publicKey?: string;
    };
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
    rotateKey(newKey: string, newVersion: string, newPublicKey?: string): void;
}
export default AttestationService;
//# sourceMappingURL=index.d.ts.map