/**
 * Closes four partial branches in packages/attestation/src/index.ts that the
 * main attestation.test.ts suite exercises only on one side of:
 *
 *  - resolvePublicKey's `error instanceof Error ? error.message : String(error)`
 *    branch (line 72) — the main suite feeds it a malformed PEM but asserts
 *    only that construction fails, never that the underlying crypto reason
 *    survives into the message.
 *  - the constructor's old-API `keyVersion || '1'` fallback (line 191) — every
 *    existing old-API test passes an explicit version.
 *  - the constructor's Ed25519 `signingKey ?? process.env[ED25519_KEY_ENV]`
 *    fallback (line 202) — existing env-var-fallback coverage only exercises
 *    the HMAC branch (SIGNING_KEY_ENV).
 *  - the constructor's `algorithm === 'Ed25519' ? ED25519_KEY_ENV : ...`
 *    selection inside the missing-key error message (line 206) — existing
 *    missing-key coverage only exercises the HMAC branch.
 *
 * The branch in the first bullet used to need a mocked `createPrivateKey`
 * because Jest ran each file in its own vm realm, so a native crypto error
 * was not `instanceof` this file's `Error`. The suite now runs in one plain
 * Node process, where that check is true for real failures, so the test
 * drives genuine key material instead of a mock.
 */
import { generateKeyPairSync } from 'node:crypto';
import { AttestationService, InvalidSigningKeyError, MissingSigningKeyError } from '../index';

describe('AttestationService — remaining constructor branches', () => {
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

  it('defaults the old string-API keyVersion to "1" when none is passed', () => {
    const service = new AttestationService('key-only-no-version');

    expect(service.getKeyInfo().version).toBe('1');
  });

  it('falls back to OMEGA_ED25519_KEY when no signingKey is supplied for Ed25519', () => {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    process.env.OMEGA_ED25519_KEY = privateKey;
    delete process.env.OMEGA_SIGNING_KEY;

    const service = new AttestationService({ algorithm: 'Ed25519' });

    expect(service.getKeyInfo().publicKey?.trim()).toBe(publicKey.trim());
  });

  it('names OMEGA_ED25519_KEY, not OMEGA_SIGNING_KEY, in the missing-key error for Ed25519', () => {
    delete process.env.OMEGA_SIGNING_KEY;
    delete process.env.OMEGA_ED25519_KEY;

    expect(() => new AttestationService({ algorithm: 'Ed25519' })).toThrow(MissingSigningKeyError);
    try {
      new AttestationService({ algorithm: 'Ed25519' });
      throw new Error('expected construction to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(MissingSigningKeyError);
      expect((error as Error).message).toContain('OMEGA_ED25519_KEY');
      expect((error as Error).message).not.toContain('OMEGA_SIGNING_KEY');
    }
  });

  it('surfaces the real parse-failure message when the key material is malformed', () => {
    expect(
      () =>
        new AttestationService({
          algorithm: 'Ed25519',
          signingKey: 'not-a-pem-key',
          keyVersion: '1',
        })
    ).toThrow(InvalidSigningKeyError);

    try {
      new AttestationService({
        algorithm: 'Ed25519',
        signingKey: 'not-a-pem-key',
        keyVersion: '1',
      });
      throw new Error('expected construction to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSigningKeyError);
      const message = (error as Error).message;
      expect(message).toContain('Ed25519 signing key could not be parsed');
      // The native reason reached the message instead of the `String(error)`
      // fallback, which would have produced "[object Object]".
      expect(message).not.toContain('[object Object]');
      expect(message).toMatch(/DECODER|unsupported|bad/i);
    }
  });
});
