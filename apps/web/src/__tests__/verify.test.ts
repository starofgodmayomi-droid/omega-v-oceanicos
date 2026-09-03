import { generateKeyPairSync, sign, webcrypto } from 'node:crypto';
import {
  SIGNED_FIELDS,
  buildSignedBytes,
  canVerify,
  decodeSignature,
  pemToDer,
  preflight,
  verifyAttestation,
} from '../verify';

/**
 * This module implements docs/spec/ATTESTATION-ENVELOPE.md independently of
 * the signer. The signatures here are produced by node:crypto directly,
 * not by @omega-v/attestation, so a passing test means the specification is
 * implementable from the document rather than from shared code.
 */
const subtle = webcrypto.subtle as unknown as SubtleCrypto;

const keyPair = generateKeyPairSync('ed25519');
const privateKey = keyPair.privateKey;
const publicKeyPem = keyPair.publicKey.export({ type: 'spki', format: 'pem' }).toString();

const base = (): Record<string, unknown> => ({
  id: 'att-2026-08-17-abc',
  verificationId: 'ver-1',
  observationId: 'obs-1',
  verified: true,
  confidence: 0.95,
  ruleVersions: { 'status-code-check': '1.0.0' },
  attestedAt: '2026-08-17T00:00:00.000Z',
  attestedBy: 'attestation-service',
  keyVersion: '1',
  signingAlgorithm: 'Ed25519',
  signingKey: 'sha256:0000000000000000',
  status: 'signed',
  signature: '',
});

const signed = (overrides: Record<string, unknown> = {}): Record<string, unknown> => {
  const attestation = { ...base(), ...overrides };
  const bytes = Buffer.from(buildSignedBytes(attestation));
  attestation.signature = `0x${sign(null, bytes, privateKey).toString('hex')}`;
  return attestation;
};

/**
 * Signed from the specification's own field list rather than from the
 * module's `buildSignedBytes`. Using the helper for both sides would make
 * the browser agree with itself, which proves nothing about whether it
 * agrees with the format.
 */
const signedFromSpec = (overrides: Record<string, unknown> = {}): Record<string, unknown> => {
  const attestation = { ...base(), ...overrides };
  const payload: Record<string, unknown> = {};
  for (const field of SIGNED_FIELDS) payload[field] = attestation[field];
  attestation.signature = `0x${sign(null, Buffer.from(JSON.stringify(payload)), privateKey).toString('hex')}`;
  return attestation;
};

describe('browser attestation verifier', () => {
  it('verifies an attestation whose signed fields are not ASCII', async () => {
    // Every other case in this file is ASCII, and so was every case on the
    // Python side — which is how a reference verifier that escaped
    // non-ASCII to \uXXXX shipped and rejected genuine attestations while
    // reporting them as forged. `attestedBy` is caller-supplied and this
    // project's own name is not ASCII, so the gap was reachable.
    //
    // The signature is built from the specification's field list, so a
    // pass means the browser agrees with the format rather than with its
    // own helper.
    const result = await verifyAttestation(
      signedFromSpec({ attestedBy: 'Ω∞v-attestation-service 🌊' }),
      publicKeyPem,
      subtle
    );

    expect(result.valid).toBe(true);
  });

  it('rejects a tampered non-ASCII field like any other', async () => {
    // Guards the direction that matters: the case above must pass because
    // the bytes match, not because non-ASCII input weakens the check.
    const attestation = signedFromSpec({ attestedBy: 'Ω∞v-attestation-service 🌊' });
    attestation.attestedBy = 'Ω∞v-attestation-service 🌋';

    const result = await verifyAttestation(attestation, publicKeyPem, subtle);

    expect(result.valid).toBe(false);
    expect(result.stage).toBe('signature');
  });

  it('reports whether this environment can verify Ed25519 at all', async () => {
    // Recorded rather than asserted true: a runtime without Ed25519 must
    // say so instead of silently reporting every attestation invalid.
    expect(typeof (await canVerify(subtle))).toBe('boolean');
  });

  it('falls back to the global crypto object when no subtle is given', async () => {
    // Every other call in this file passes `subtle` explicitly, so the
    // `subtle ?? globalThis.crypto?.subtle` fallback never actually runs.
    // Jest's own Node runtime supplies a real WebCrypto object, so this
    // exercises the fallback with the same implementation the explicit
    // calls use, not a stand-in.
    expect(typeof (await canVerify())).toBe('boolean');
  });

  it('verifies a real attestation through the global crypto fallback, with no subtle argument', async () => {
    // Every verifyAttestation call elsewhere in this file passes `subtle`
    // explicitly, so `subtle ?? globalThis.crypto?.subtle` always
    // short-circuits on the left operand. The "without a global crypto
    // object" cases below cover the other extreme by forcing
    // globalThis.crypto to undefined, which makes `globalThis.crypto?.subtle`
    // short-circuit to undefined via optional chaining before ever reading
    // a live `.subtle` off a real object. Neither exercises the fallback
    // actually resolving to a working implementation and completing a
    // verification — which is exactly the call shape a real browser caller
    // uses: verifyAttestation(attestation, pem), relying on
    // window.crypto.subtle with nothing passed as the third argument.
    const result = await verifyAttestation(signed(), publicKeyPem);

    expect(result.valid).toBe(true);
    expect(result.reason).toContain('valid');
  });

  describe('without a global crypto object', () => {
    let originalCrypto: PropertyDescriptor | undefined;

    beforeEach(() => {
      originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
      Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    });

    afterEach(() => {
      if (originalCrypto) Object.defineProperty(globalThis, 'crypto', originalCrypto);
    });

    it('canVerify reports false rather than throwing when nothing is available', async () => {
      expect(await canVerify()).toBe(false);
    });

    it('verifyAttestation reports the missing implementation before touching cryptography', async () => {
      const result = await verifyAttestation(signed(), publicKeyPem);

      expect(result).toEqual({
        valid: false,
        stage: 'crypto',
        reason: 'this environment has no WebCrypto',
      });
    });
  });

  it('verifies a signature it did not produce', async () => {
    const result = await verifyAttestation(signed(), publicKeyPem, subtle);

    expect(result.valid).toBe(true);
    expect(result.reason).toContain('valid');
  });

  it('rejects a signature from a different key', async () => {
    const other = generateKeyPairSync('ed25519').publicKey.export({
      type: 'spki',
      format: 'pem',
    }) as string;

    const result = await verifyAttestation(signed(), other.toString(), subtle);

    expect(result.valid).toBe(false);
    expect(result.stage).toBe('signature');
  });

  it.each(SIGNED_FIELDS.filter((field) => field !== 'ruleVersions'))(
    'rejects an attestation whose %s was altered after signing',
    async (field) => {
      const attestation = signed();
      attestation[field] = field === 'verified' ? !attestation[field] : 'tampered';

      const result = await verifyAttestation(attestation, publicKeyPem, subtle);

      expect(result.valid).toBe(false);
    }
  );

  it('is unaffected by fields the specification leaves unsigned', async () => {
    const attestation = signed();
    attestation.id = 'att-relabelled';
    attestation.signingKey = 'sha256:ffffffffffffffff';

    // Documented behaviour, not a flaw — which is why trust decisions must
    // not rest on these fields.
    expect((await verifyAttestation(attestation, publicKeyPem, subtle)).valid).toBe(true);
  });

  it('refuses to select its algorithm from the attestation', async () => {
    const attestation = signed({ signingAlgorithm: 'HMAC-SHA256' });

    const result = await verifyAttestation(attestation, publicKeyPem, subtle);

    expect(result.valid).toBe(false);
    expect(result.stage).toBe('algorithm');
    expect(result.reason).toContain('Ed25519 only');
  });

  it('rejects an unsigned or revoked status before touching cryptography', async () => {
    for (const status of ['revoked', 'draft', undefined]) {
      const result = await verifyAttestation(signed({ status }), publicKeyPem, subtle);
      expect(result.valid).toBe(false);
      expect(result.stage).toBe('shape');
    }
  });

  it('names the missing field rather than failing opaquely', async () => {
    const attestation = signed();
    delete attestation.attestedBy;

    const result = await verifyAttestation(attestation, publicKeyPem, subtle);

    expect(result.reason).toContain('attestedBy');
  });

  describe('input handling', () => {
    it('decodes hex with or without the 0x prefix', () => {
      expect(decodeSignature('0x00ff')).toEqual(new Uint8Array([0, 255]));
      expect(decodeSignature('00ff')).toEqual(new Uint8Array([0, 255]));
    });

    it.each(['', '0x', 'zz', '0xabc'])('rejects malformed signature %p', (value) => {
      expect(decodeSignature(value)).toBeNull();
    });

    it('extracts DER from a PEM block', () => {
      const der = pemToDer(publicKeyPem);
      expect(der).not.toBeNull();
      expect((der as Uint8Array).length).toBeGreaterThan(30);
    });

    it.each([
      '',
      'not a pem',
      '-----BEGIN PUBLIC KEY-----\n-----END PUBLIC KEY-----',
      // Well-formed PEM markers around a body that is not valid base64 at
      // all, rather than merely the wrong key type — atob() itself throws,
      // which is the only way into the function's catch block.
      '-----BEGIN PUBLIC KEY-----\n!!!\n-----END PUBLIC KEY-----',
    ])('rejects malformed key %p', (value) => {
      expect(pemToDer(value)).toBeNull();
    });

    it('reports a bad key without claiming the signature was forged', async () => {
      const result = await verifyAttestation(signed(), 'not a key', subtle);

      expect(result.valid).toBe(false);
      expect(result.stage).toBe('key');
    });

    it('preflight passes a well-formed attestation through to cryptography', () => {
      expect(preflight(signed())).toBeNull();
    });

    it.each(['signature', 'verificationId', 'observationId'] as const)(
      'flags an empty %s as a shape failure, distinct from a missing one',
      (field) => {
        // `base()` already carries signature: ''; the other two required
        // fields start populated. A non-empty placeholder signature keeps
        // that first check from firing for every case, so each iteration
        // isolates the one field it names. An empty string is still
        // `field in attestation`, so this is a different check from the
        // `missing` scan a few lines below it.
        const attestation = { ...base(), signature: '0xplaceholder', [field]: '' };

        const result = preflight(attestation);

        expect(result).not.toBeNull();
        expect(result?.stage).toBe('shape');
        expect(result?.reason).toBe(`${field} is empty`);
      }
    );
  });

  it('builds the same bytes as the published field order, not sorted order', () => {
    const attestation = signed();
    const published = new TextDecoder().decode(buildSignedBytes(attestation));

    expect(published.indexOf('verificationId')).toBeLessThan(published.indexOf('observationId'));
    expect(published.indexOf('attestedAt')).toBeLessThan(published.indexOf('keyVersion'));
    // Sorted order would put attestedAt first; it does not.
    expect(published.startsWith('{"verificationId"')).toBe(true);
  });

  it('returns a bounded crypto failure when WebCrypto stalls', async () => {
    const stalled = {
      importKey: () => new Promise<CryptoKey>(() => undefined),
    } as unknown as SubtleCrypto;

    const result = await verifyAttestation(signed(), publicKeyPem, stalled);

    expect(result).toEqual({
      valid: false,
      stage: 'crypto',
      reason: 'could not verify: WebCrypto importing the public key timed out after 2000ms',
    });
  });

  it('says it cannot verify rather than calling an attestation invalid', async () => {
    // The distinction that matters: a runtime without Ed25519 must not
    // report a good signature as forged. Simulated by handing the verifier
    // a SubtleCrypto that has none.
    const withoutEd25519 = {
      importKey: async () => {
        throw new Error('Unrecognized name.');
      },
    } as unknown as SubtleCrypto;

    expect(await canVerify(withoutEd25519)).toBe(false);

    const result = await verifyAttestation(signed(), publicKeyPem, withoutEd25519);

    expect(result.valid).toBe(false);
    expect(result.stage).toBe('crypto');
    expect(result.reason).toContain('could not verify');
  });

  it('rejects a signature that is not valid hex before touching cryptography', async () => {
    // decodeSignature() is unit-tested directly above, but verifyAttestation
    // has its own branch on the null it can return, and nothing here drove
    // an attestation through the full function with a malformed signature.
    const attestation = signed();
    attestation.signature = 'not hex at all';

    const result = await verifyAttestation(attestation, publicKeyPem, subtle);

    expect(result).toEqual({
      valid: false,
      stage: 'signature',
      reason: 'signature is not valid hex',
    });
  });

  it('stringifies a non-Error thrown by WebCrypto rather than crashing', async () => {
    // WebCrypto is contractually supposed to reject with a DOMException
    // (which satisfies `instanceof Error`), but the catch block has no way
    // to enforce that on whatever implementation it is handed. A thrown
    // plain string exercises the branch that must not call `.message` on
    // something that lacks it.
    const throwsAString = {
      importKey: async () => {
        throw 'boom';
      },
    } as unknown as SubtleCrypto;

    const result = await verifyAttestation(signed(), publicKeyPem, throwsAString);

    expect(result).toEqual({
      valid: false,
      stage: 'crypto',
      reason: 'could not verify: boom',
    });
  });
});
