import { createHmac, generateKeyPairSync } from 'node:crypto';
import {
  AttestationService,
  InvalidSigningKeyError,
  MissingSigningKeyError,
  verifyEd25519,
} from '../index';
import { Attestation, VerificationResult } from '@omega-v/types';

const verificationResult: VerificationResult = {
  id: 'ver-test-1',
  observationId: 'obs-test-1',
  timestamp: '2026-08-14T13:00:00.000Z',
  summary: {
    passed: true,
    confidence: 0.95,
    rulesApplied: 1,
    rulesPassed: 1,
    rulesFailed: 0,
  },
  rules: [{ name: 'health-check', passed: true, confidence: 0.95 }],
  evidencePath: [],
  ruleVersions: { 'health-check': '1.0.0' },
  status: 'completed',
};

describe('AttestationService — HMAC-SHA256 (backward compatibility)', () => {
  it('creates and verifies an HMAC signature with old API', () => {
    const service = new AttestationService('test-key', '1');
    const attestation = service.attest(verificationResult);

    expect(attestation.signature).toMatch(/^0x[0-9a-f]{64}$/);
    expect(attestation.signingAlgorithm).toBe('HMAC-SHA256');
    expect(service.verify(attestation)).toBe(true);
  });

  it('rejects a tampered attestation', () => {
    const service = new AttestationService('test-key', '1');
    const attestation = service.attest(verificationResult);
    attestation.verified = false;

    expect(service.verify(attestation)).toBe(false);
  });

  it('rejects an attestation signed with a rotated key', () => {
    const service = new AttestationService('test-key', '1');
    const attestation = service.attest(verificationResult);
    service.rotateKey('rotated-key', '2');

    expect(service.verify(attestation)).toBe(false);
  });
});

describe('AttestationService — Ed25519 (asymmetric)', () => {
  let ed25519Key: string;
  let ed25519PublicKey: string;

  beforeAll(() => {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
      format: 'pem',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    ed25519Key = privateKey;
    ed25519PublicKey = publicKey;
  });

  it('creates and verifies an Ed25519 signature', () => {
    const service = new AttestationService({
      algorithm: 'Ed25519',
      signingKey: ed25519Key,
      publicKey: ed25519PublicKey,
      keyVersion: '1',
    });
    const attestation = service.attest(verificationResult);

    expect(attestation.signingAlgorithm).toBe('Ed25519');
    expect(attestation.signature).toMatch(/^0x[0-9a-f]+$/);
    expect(service.verify(attestation)).toBe(true);
  });

  it('includes public key in key info for external verification', () => {
    const service = new AttestationService({
      algorithm: 'Ed25519',
      signingKey: ed25519Key,
      publicKey: ed25519PublicKey,
      keyVersion: '1',
    });
    const info = service.getKeyInfo();

    expect(info.algorithm).toBe('Ed25519');
    expect(info.publicKey).toBe(ed25519PublicKey);
  });

  it('rejects a tampered Ed25519 attestation', () => {
    const service = new AttestationService({
      algorithm: 'Ed25519',
      signingKey: ed25519Key,
      publicKey: ed25519PublicKey,
      keyVersion: '1',
    });
    const attestation = service.attest(verificationResult);
    attestation.verified = false;

    expect(service.verify(attestation)).toBe(false);
  });

  it('lets a stranger verify with only the public key', () => {
    const service = new AttestationService({
      algorithm: 'Ed25519',
      signingKey: ed25519Key,
      publicKey: ed25519PublicKey,
      keyVersion: '1',
    });
    const attestation = service.attest(verificationResult);

    expect(verifyEd25519(attestation, ed25519PublicKey)).toBe(true);
    expect(verifyEd25519({ ...attestation, verified: false }, ed25519PublicKey)).toBe(false);
  });

  /**
   * `verifyEd25519` is exported and callable directly by any stranger with
   * only a public key — it has its own guard clauses independent of
   * `AttestationService.verify`'s. Every existing direct call passed a
   * genuinely complete, correctly-shaped attestation, so the "missing a
   * required field" and "wrong status" guards had never returned early.
   */
  it('rejects a stranger-verified attestation missing a signature or id, or not in signed status', () => {
    const service = new AttestationService({
      algorithm: 'Ed25519',
      signingKey: ed25519Key,
      publicKey: ed25519PublicKey,
      keyVersion: '1',
    });
    const attestation = service.attest(verificationResult);

    expect(verifyEd25519({ ...attestation, signature: '' }, ed25519PublicKey)).toBe(false);
    expect(verifyEd25519({ ...attestation, verificationId: '' }, ed25519PublicKey)).toBe(false);
    expect(verifyEd25519({ ...attestation, observationId: '' }, ed25519PublicKey)).toBe(false);
    expect(verifyEd25519({ ...attestation, status: 'revoked' }, ed25519PublicKey)).toBe(false);
  });

  /**
   * The signature-check itself is wrapped in try/catch: a public key a
   * stranger cannot even parse (truncated, corrupted, or simply not a PEM —
   * a realistic failure mode for key material handled outside this
   * process) makes `crypto.verify` throw rather than return false. Every
   * existing test passed a well-formed PEM, so that catch had never run.
   */
  it('treats an unparseable public key as a failed verification rather than throwing', () => {
    const service = new AttestationService({
      algorithm: 'Ed25519',
      signingKey: ed25519Key,
      publicKey: ed25519PublicKey,
      keyVersion: '1',
    });
    const attestation = service.attest(verificationResult);

    expect(() => verifyEd25519(attestation, 'not-a-valid-pem')).not.toThrow();
    expect(verifyEd25519(attestation, 'not-a-valid-pem')).toBe(false);
  });

  it('rejects an Ed25519 signature under a different public key', () => {
    const other = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const service = new AttestationService({
      algorithm: 'Ed25519',
      signingKey: ed25519Key,
      publicKey: ed25519PublicKey,
      keyVersion: '1',
    });
    const attestation = service.attest(verificationResult);

    expect(verifyEd25519(attestation, other.publicKey)).toBe(false);
  });

  it('refuses to verify an HMAC attestation as Ed25519', () => {
    const hmac = new AttestationService('test-key', '1');
    const attestation = hmac.attest(verificationResult);

    expect(verifyEd25519(attestation, ed25519PublicKey)).toBe(false);
  });

  it('does not accept a signature from a trust root it is not configured for', () => {
    // alg-confusion. A verifier configured for HMAC, which also holds an
    // Ed25519 public key — the shape of a migration with both configured —
    // must not accept an Ed25519-signed attestation just because the
    // attestation says it is Ed25519. Whoever holds that private key is a
    // different trust root than the HMAC secret this verifier answers for.
    const hmacVerifier = new AttestationService({
      algorithm: 'HMAC-SHA256',
      signingKey: 'test-key',
      publicKey: ed25519PublicKey,
      keyVersion: '1',
    });
    const otherRoot = new AttestationService({
      algorithm: 'Ed25519',
      signingKey: ed25519Key,
      publicKey: ed25519PublicKey,
      keyVersion: '1',
    });

    expect(hmacVerifier.verify(otherRoot.attest(verificationResult))).toBe(false);
    expect(hmacVerifier.verify(hmacVerifier.attest(verificationResult))).toBe(true);
  });

  it('rejects a mismatched algorithm claim in both directions', () => {
    const ed = new AttestationService({
      algorithm: 'Ed25519',
      signingKey: ed25519Key,
      publicKey: ed25519PublicKey,
      keyVersion: '1',
    });
    const hmac = new AttestationService('test-key', '1');

    expect(ed.verify({ ...ed.attest(verificationResult), signingAlgorithm: 'HMAC-SHA256' })).toBe(
      false
    );
    expect(hmac.verify({ ...hmac.attest(verificationResult), signingAlgorithm: 'Ed25519' })).toBe(
      false
    );
  });

  it('still verifies an attestation predating the algorithm field', () => {
    const hmac = new AttestationService('test-key', '1');
    const attestation = hmac.attest(verificationResult);
    delete (attestation as Partial<Attestation>).signingAlgorithm;

    expect(hmac.verify(attestation)).toBe(true);
  });

  it('rejects an attestation signed under a different private key', () => {
    const { privateKey } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const signer = new AttestationService({
      algorithm: 'Ed25519',
      signingKey: ed25519Key,
      publicKey: ed25519PublicKey,
      keyVersion: '1',
    });
    const stranger = new AttestationService({
      algorithm: 'Ed25519',
      signingKey: privateKey,
      keyVersion: '1',
    });

    expect(stranger.verify(signer.attest(verificationResult))).toBe(false);
  });

  it('derives the public key when only the private key is given', () => {
    const service = new AttestationService({
      algorithm: 'Ed25519',
      signingKey: ed25519Key,
      keyVersion: '1',
    });

    expect(service.getKeyInfo().publicKey?.trim()).toBe(ed25519PublicKey.trim());
    expect(service.verify(service.attest(verificationResult))).toBe(true);
  });

  it('refuses key material it cannot sign with, at construction', () => {
    expect(
      () =>
        new AttestationService({
          algorithm: 'Ed25519',
          signingKey: 'not-a-pem',
          keyVersion: '1',
        })
    ).toThrow(InvalidSigningKeyError);
  });

  it('refuses a public key that does not belong to the private key', () => {
    const other = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    expect(
      () =>
        new AttestationService({
          algorithm: 'Ed25519',
          signingKey: ed25519Key,
          publicKey: other.publicKey,
          keyVersion: '1',
        })
    ).toThrow(InvalidSigningKeyError);
  });

  it('re-derives the public key on rotation, leaving nothing stale', () => {
    const service = new AttestationService({
      algorithm: 'Ed25519',
      signingKey: ed25519Key,
      publicKey: ed25519PublicKey,
      keyVersion: '1',
    });
    const next = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    service.rotateKey(next.privateKey, '2');

    expect(service.getKeyInfo().publicKey?.trim()).toBe(next.publicKey.trim());
    expect(service.verify(service.attest(verificationResult))).toBe(true);
  });

  it('leaves the previous key intact when a rotation is rejected', () => {
    const service = new AttestationService({
      algorithm: 'Ed25519',
      signingKey: ed25519Key,
      publicKey: ed25519PublicKey,
      keyVersion: '1',
    });

    expect(() => service.rotateKey('not-a-pem', '2')).toThrow(InvalidSigningKeyError);
    expect(service.getKeyInfo().version).toBe('1');
    expect(service.verify(service.attest(verificationResult))).toBe(true);
  });

  it('fingerprints the public half, so a holder of it can name the key', () => {
    const service = new AttestationService({
      algorithm: 'Ed25519',
      signingKey: ed25519Key,
      publicKey: ed25519PublicKey,
      keyVersion: '1',
    });
    const attestation = service.attest(verificationResult);

    // Computable by anyone holding only the public key.
    const independent = createHmac('sha256', 'omega-v-key-fingerprint')
      .update(ed25519PublicKey)
      .digest('hex')
      .slice(0, 16);

    expect(attestation.signingKey).toBe(`sha256:${independent}`);
    expect(JSON.stringify(attestation)).not.toContain(ed25519Key);
  });
});

describe('AttestationService — signing key handling', () => {
  const originalHmac = process.env.OMEGA_SIGNING_KEY;
  const originalEd25519 = process.env.OMEGA_ED25519_KEY;

  afterEach(() => {
    if (originalHmac === undefined) {
      delete process.env.OMEGA_SIGNING_KEY;
    } else {
      process.env.OMEGA_SIGNING_KEY = originalHmac;
    }
    if (originalEd25519 === undefined) {
      delete process.env.OMEGA_ED25519_KEY;
    } else {
      process.env.OMEGA_ED25519_KEY = originalEd25519;
    }
  });

  it('refuses to construct without a key', () => {
    delete process.env.OMEGA_SIGNING_KEY;
    expect(() => new AttestationService()).toThrow(MissingSigningKeyError);
  });

  it('falls back to the environment variable', () => {
    process.env.OMEGA_SIGNING_KEY = 'env-provided-key';
    const service = new AttestationService();
    const attestation = service.attest(verificationResult);

    expect(service.verify(attestation)).toBe(true);
  });

  it('prefers an explicit key over the environment variable', () => {
    process.env.OMEGA_SIGNING_KEY = 'env-provided-key';
    const explicit = new AttestationService('explicit-key', '1');
    const fromEnv = new AttestationService(undefined, '1');

    expect(explicit.getKeyInfo().fingerprint).not.toBe(fromEnv.getKeyInfo().fingerprint);
  });

  it('never exposes the raw key', () => {
    const service = new AttestationService('super-secret-key', '1');
    const info = service.getKeyInfo();
    const attestation = service.attest(verificationResult);

    expect(info.fingerprint).toMatch(/^sha256:[0-9a-f]{16}$/);
    expect(JSON.stringify(info)).not.toContain('super-secret-key');
    expect(JSON.stringify(attestation)).not.toContain('super-secret-key');
  });

  it('produces a stable fingerprint for the same key', () => {
    const a = new AttestationService('same-key', '1');
    const b = new AttestationService('same-key', '9');

    expect(a.keyFingerprint()).toBe(b.keyFingerprint());
  });

  it('refuses to rotate to an empty key', () => {
    const service = new AttestationService('test-key', '1');
    expect(() => service.rotateKey('', '2')).toThrow(MissingSigningKeyError);
    expect(service.getKeyInfo().version).toBe('1');
  });

  it('rejects a cleared signature, missing ids, or a revoked status', () => {
    const service = new AttestationService('test-key', '1');
    const attestation = service.attest(verificationResult);

    expect(service.verify({ ...attestation, signature: '' })).toBe(false);
    expect(service.verify({ ...attestation, verificationId: '' })).toBe(false);
    expect(service.verify({ ...attestation, observationId: '' })).toBe(false);
    expect(service.verify({ ...attestation, status: 'revoked' })).toBe(false);
  });
});
