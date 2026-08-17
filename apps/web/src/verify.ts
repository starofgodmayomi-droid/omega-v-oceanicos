/**
 * Browser-side attestation verification.
 *
 * Implements docs/spec/ATTESTATION-ENVELOPE.md against WebCrypto, so a
 * person holding an attestation and a public key can check it without an
 * account, a server, or any trust in whoever served the page. The private
 * key is never involved: verification needs only the public half.
 *
 * Deliberately free of React and of any import from the API packages. The
 * specification is the contract, not this repository.
 */

/** The eight fields the signature covers, in the order the spec publishes. */
export const SIGNED_FIELDS = [
  'verificationId',
  'observationId',
  'verified',
  'confidence',
  'ruleVersions',
  'attestedAt',
  'attestedBy',
  'keyVersion',
] as const;

export type SignedField = (typeof SIGNED_FIELDS)[number];

export type VerificationOutcome = {
  valid: boolean;
  reason: string;
  /** What was checked before any cryptography ran. */
  stage: 'shape' | 'algorithm' | 'signature' | 'key' | 'crypto';
};

/**
 * Rebuild the exact bytes the signer covered.
 *
 * Key order is part of the format: the signer uses JSON.stringify, which
 * emits insertion order. Sorting here would produce different bytes and
 * reject every valid attestation.
 */
export function buildSignedBytes(attestation: Record<string, unknown>): Uint8Array {
  const payload: Record<string, unknown> = {};
  for (const field of SIGNED_FIELDS) payload[field] = attestation[field];
  return new TextEncoder().encode(JSON.stringify(payload));
}

/** Decode a `0x`-prefixed hex signature. Returns null when malformed. */
export function decodeSignature(signature: string): Uint8Array | null {
  const hex = signature.startsWith('0x') ? signature.slice(2) : signature;
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) return null;

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

/** Extract the DER body from a PEM public key. Returns null when malformed. */
export function pemToDer(pem: string): Uint8Array | null {
  const match = pem.match(/-----BEGIN PUBLIC KEY-----([\s\S]*?)-----END PUBLIC KEY-----/);
  if (!match) return null;

  const base64 = match[1].replace(/\s+/g, '');
  if (base64.length === 0) return null;

  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

/**
 * Everything checkable without cryptography.
 *
 * The algorithm is taken from `expectedAlgorithm` — the verifier's own
 * configuration — and never from the attestation. Choosing a primitive
 * with a field the presenter controls is the alg-confusion mistake.
 */
export function preflight(
  attestation: Record<string, unknown>,
  expectedAlgorithm = 'Ed25519'
): VerificationOutcome | null {
  if (attestation.status !== 'signed') {
    return {
      valid: false,
      reason: `status is ${JSON.stringify(attestation.status)}, expected "signed"`,
      stage: 'shape',
    };
  }

  if (attestation.signingAlgorithm !== expectedAlgorithm) {
    return {
      valid: false,
      reason: `attestation claims ${JSON.stringify(
        attestation.signingAlgorithm
      )}; this verifier checks ${expectedAlgorithm} only`,
      stage: 'algorithm',
    };
  }

  for (const field of ['signature', 'verificationId', 'observationId'] as const) {
    if (!attestation[field]) {
      return { valid: false, reason: `${field} is empty`, stage: 'shape' };
    }
  }

  const missing = SIGNED_FIELDS.filter((field) => !(field in attestation));
  if (missing.length > 0) {
    return {
      valid: false,
      reason: `missing signed fields: ${missing.join(', ')}`,
      stage: 'shape',
    };
  }

  return null;
}

/** Whether this environment can verify Ed25519 at all. */
export async function canVerify(subtle?: SubtleCrypto): Promise<boolean> {
  const implementation = subtle ?? globalThis.crypto?.subtle;
  if (!implementation) return false;
  try {
    await implementation.importKey('raw', new Uint8Array(32), { name: 'Ed25519' }, false, [
      'verify',
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Verify an attestation against a PEM public key.
 *
 * A true result proves origin and integrity of the eight signed fields.
 * It does not prove the verification was correct, nor that the attestation
 * has not since been revoked or expired — both are runtime state and
 * cannot live inside a static signature.
 */
export async function verifyAttestation(
  attestation: Record<string, unknown>,
  publicKeyPem: string,
  subtle?: SubtleCrypto
): Promise<VerificationOutcome> {
  const failed = preflight(attestation);
  if (failed) return failed;

  const signature = decodeSignature(String(attestation.signature));
  if (!signature) {
    return { valid: false, reason: 'signature is not valid hex', stage: 'signature' };
  }

  const der = pemToDer(publicKeyPem);
  if (!der) {
    return { valid: false, reason: 'public key is not a PEM SPKI block', stage: 'key' };
  }

  const implementation = subtle ?? globalThis.crypto?.subtle;
  if (!implementation) {
    return { valid: false, reason: 'this environment has no WebCrypto', stage: 'crypto' };
  }

  try {
    const key = await implementation.importKey('spki', der, { name: 'Ed25519' }, false, ['verify']);
    const ok = await implementation.verify(
      { name: 'Ed25519' },
      key,
      signature,
      buildSignedBytes(attestation)
    );

    return ok
      ? { valid: true, reason: 'signature is valid for this public key', stage: 'signature' }
      : { valid: false, reason: 'signature does not match this public key', stage: 'signature' };
  } catch (error) {
    // Report rather than crash: an unsupported curve and a bad key must be
    // distinguishable from a forged signature.
    return {
      valid: false,
      reason: `could not verify: ${error instanceof Error ? error.message : String(error)}`,
      stage: 'crypto',
    };
  }
}
