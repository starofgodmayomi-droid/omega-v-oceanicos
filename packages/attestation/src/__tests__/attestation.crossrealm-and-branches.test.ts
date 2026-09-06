/**
 * Closes four partial branches in packages/attestation/src/index.ts that the
 * main attestation.test.ts suite exercises only on one side of:
 *
 *  - resolvePublicKey's `error instanceof Error ? error.message : String(error)`
 *    (line 72) — every existing test that feeds resolvePublicKey a malformed
 *    PEM drives a genuine failure through Node's native crypto bindings
 *    (createPrivateKey/createPublicKey), and under Jest that failure is never
 *    `instanceof` this test file's own `Error`. See the cross-realm note
 *    below, and apps/api/src/__tests__/persistence.crossrealm-errors.test.ts
 *    for the same phenomenon documented against fs/crypto in persistence.ts.
 *  - the constructor's old-API `keyVersion || '1'` fallback (line 191) — every
 *    existing old-API test passes an explicit version.
 *  - the constructor's Ed25519 `signingKey ?? process.env[ED25519_KEY_ENV]`
 *    fallback (line 202) — existing env-var-fallback coverage only exercises
 *    the HMAC branch (SIGNING_KEY_ENV).
 *  - the constructor's `algorithm === 'Ed25519' ? ED25519_KEY_ENV : ...`
 *    selection inside the missing-key error message (line 206) — existing
 *    missing-key coverage only exercises the HMAC branch.
 *
 * Cross-realm note (same mechanism as the persistence.ts case): Jest's
 * default 'node' test environment runs each test file inside its own vm
 * context, so this file's own `Error` constructor is not the same object as
 * the one Node's internal crypto bindings use to build their errors. A
 * genuine parse failure driven directly through createPrivateKey therefore
 * never takes the `error instanceof Error` branch under Jest, even though it
 * would in a plain Node process. To exercise that branch honestly, this file
 * mocks only `createPrivateKey`, delegating every other export of
 * 'node:crypto' (including createPublicKey, generateKeyPairSync, sign, verify
 * — used throughout attestation.test.ts's real Ed25519 tests) to the actual
 * implementation, and throws an Error built locally with `new Error(...)` so
 * it shares this file's realm — exactly the failure shape a non-sandboxed
 * Node process produces.
 */
jest.mock('node:crypto', () => {
  const actual = jest.requireActual('node:crypto');
  return {
    ...actual,
    createPrivateKey: jest.fn(actual.createPrivateKey),
  };
});

import { createPrivateKey, generateKeyPairSync } from 'node:crypto';
import { AttestationService, InvalidSigningKeyError, MissingSigningKeyError } from '../index';

const actualCrypto = jest.requireActual('node:crypto') as typeof import('node:crypto');

describe('AttestationService — remaining constructor branches', () => {
  const originalHmac = process.env.OMEGA_SIGNING_KEY;
  const originalEd25519 = process.env.OMEGA_ED25519_KEY;

  afterEach(() => {
    (createPrivateKey as jest.Mock).mockImplementation(actualCrypto.createPrivateKey);
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

  it('surfaces the real parse-failure message when createPrivateKey throws a same-realm Error', () => {
    (createPrivateKey as jest.Mock).mockImplementation(() => {
      throw new Error('mocked parse failure: unsupported key format');
    });

    expect(
      () =>
        new AttestationService({
          algorithm: 'Ed25519',
          signingKey: 'irrelevant-because-createPrivateKey-is-mocked',
          keyVersion: '1',
        })
    ).toThrow(InvalidSigningKeyError);

    try {
      new AttestationService({
        algorithm: 'Ed25519',
        signingKey: 'irrelevant-because-createPrivateKey-is-mocked',
        keyVersion: '1',
      });
      throw new Error('expected construction to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSigningKeyError);
      expect((error as Error).message).toContain('mocked parse failure: unsupported key format');
    }
  });
});
