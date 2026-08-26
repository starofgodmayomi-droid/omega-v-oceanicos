import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

/**
 * The reference verifier is executed here, not read.
 *
 * `attestation-envelope.test.ts` checks that `verify_attestation.py`
 * mentions `SIGNED_FIELDS`, imports nothing from this project, and avoids
 * `sort_keys`. Every one of those assertions passed while the script
 * rejected genuine attestations, because reading a file is not running it —
 * the same gap this repository keeps closing elsewhere.
 *
 * What it got wrong: Python's `json.dumps` escapes non-ASCII to `\uXXXX` by
 * default, while `JSON.stringify` emits the character and the signer encodes
 * UTF-8. An `attestedBy` of `Ω∞v-attestation-service` — this project's own
 * brand — produced 219 bytes against the signer's 212, and the script
 * reported `signature does not match this public key`. That is the sentence
 * it uses for a forgery, so a correctly signed attestation from a service
 * with a non-ASCII name was indistinguishable from an attack.
 *
 * Stated limitation: this exercises the byte-building layer, which is where
 * the implementations diverged. It stubs the `cryptography` imports so no
 * dependency is added to CI, which means the Ed25519 call itself is not
 * executed here. The signature path is covered by the TypeScript and browser
 * suites; what was never covered was whether the reference agrees with them
 * about which bytes are signed.
 */
describe('the reference verifier agrees with the signer about the signed bytes', () => {
  const script = join(process.cwd(), 'docs/spec/verify_attestation.py');

  const SIGNED_FIELDS = [
    'verificationId',
    'observationId',
    'verified',
    'confidence',
    'ruleVersions',
    'attestedAt',
    'attestedBy',
    'keyVersion',
  ] as const;

  // Loads the shipped file with the crypto imports stubbed, so the function
  // under test is the real one rather than a copy of it kept in this file.
  // A copy would agree with itself forever.
  const driver = `
import importlib.util, json, sys, types

exceptions = types.ModuleType('cryptography.exceptions')
class InvalidSignature(Exception):
    pass
exceptions.InvalidSignature = InvalidSignature

serialization = types.ModuleType('cryptography.hazmat.primitives.serialization')
serialization.load_pem_public_key = lambda *args, **kwargs: None

sys.modules['cryptography'] = types.ModuleType('cryptography')
sys.modules['cryptography.exceptions'] = exceptions
sys.modules['cryptography.hazmat'] = types.ModuleType('cryptography.hazmat')
sys.modules['cryptography.hazmat.primitives'] = types.ModuleType('cryptography.hazmat.primitives')
sys.modules['cryptography.hazmat.primitives.serialization'] = serialization

spec = importlib.util.spec_from_file_location('reference_verifier', sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

# Read and write bytes explicitly. Python's text streams use the locale
# encoding, which is cp1252 on a Windows runner: the first version of this
# driver used json.load(sys.stdin) and decoded the four UTF-8 bytes of an
# emoji as four cp1252 characters, so the test failed on Windows only and
# blamed the verifier for the harness's own mis-decoding.
payload = json.loads(sys.stdin.buffer.read().decode('utf-8'))
sys.stdout.write(module.signed_bytes(payload).hex())
`;

  // Windows runners ship python.exe rather than python3; both are tried
  // before anything is concluded from an absence.
  const interpreter = ['python3', 'python'].find(
    (candidate) => spawnSync(candidate, ['--version']).status === 0
  );

  const referenceBytes = (
    attestation: Record<string, unknown>,
    env: NodeJS.ProcessEnv = process.env
  ): string => {
    const result = spawnSync(interpreter as string, ['-c', driver, script], {
      env,
      // The driver reads stdin as bytes, so the input is handed over as
      // bytes rather than left to the child's locale encoding.
      input: Buffer.from(JSON.stringify(attestation), 'utf8'),
      encoding: 'utf8',
    });
    if (result.status !== 0) {
      throw new Error(`reference verifier failed: ${result.stderr || result.stdout}`);
    }
    return result.stdout.trim();
  };

  const signerBytes = (attestation: Record<string, unknown>): string => {
    const payload: Record<string, unknown> = {};
    for (const field of SIGNED_FIELDS) payload[field] = attestation[field];
    return Buffer.from(JSON.stringify(payload)).toString('hex');
  };

  const attestation = (attestedBy: string): Record<string, unknown> => ({
    verificationId: 'ver-1',
    observationId: 'obs-1',
    verified: true,
    confidence: 0.95,
    ruleVersions: { 'status-code-check': '1.0.0' },
    attestedAt: '2026-08-17T00:00:00.000Z',
    attestedBy,
    keyVersion: '1',
    signingAlgorithm: 'Ed25519',
    status: 'signed',
    // Unsigned by the specification. Present so a reference that quietly
    // included it would produce different bytes and fail here.
    id: 'att-1',
    signature: '0xdeadbeef',
  });

  const describeIfPython = interpreter ? describe : describe.skip;

  it('found a Python interpreter to run the reference with', () => {
    // Reported as a failure rather than a silent skip of the whole file:
    // a suite that disappears is not a suite that passed.
    expect(interpreter).toBeDefined();
  });

  describeIfPython('byte-for-byte', () => {
    it('agrees on an ASCII payload', () => {
      const subject = attestation('attestation-service');
      expect(referenceBytes(subject)).toBe(signerBytes(subject));
    });

    it('agrees on a payload carrying the name this project signs with', () => {
      // The regression. Before the fix these differed by seven bytes.
      const subject = attestation('Ω∞v-attestation-service');
      expect(referenceBytes(subject)).toBe(signerBytes(subject));
    });

    it('agrees on non-ASCII outside the Basic Multilingual Plane', () => {
      // Surrogate pairs are the next place an escaping difference would
      // surface, and they are not covered by the case above.
      const subject = attestation('attestation-service 🌊');
      expect(referenceBytes(subject)).toBe(signerBytes(subject));
    });

    it('does not depend on the locale encoding of the child process', () => {
      // The Windows runner reported this suite red once, and the harness was
      // at fault rather than the verifier: Python's text streams use the
      // locale encoding, cp1252 there, so json.load(sys.stdin) decoded the
      // four UTF-8 bytes of an emoji as four cp1252 characters. Forcing a
      // non-UTF-8 encoding here reproduces that on any platform, so the
      // regression cannot come back only on Windows.
      const subject = attestation('attestation-service 🌊');
      expect(referenceBytes(subject, { ...process.env, PYTHONIOENCODING: 'cp1252' })).toBe(
        signerBytes(subject)
      );
    });

    it('covers only the eight signed fields', () => {
      const subject = attestation('attestation-service');
      const relabelled = { ...subject, id: 'att-relabelled', signature: '0xffff' };
      expect(referenceBytes(relabelled)).toBe(referenceBytes(subject));
    });
  });
});
