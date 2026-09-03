import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateKeyPairSync, verify as nodeVerify } from 'node:crypto';
import { AttestationService } from '@omega-v/attestation';
import { VerificationResult } from '@omega-v/types';

/**
 * The specification is a promise to people outside this repository. A
 * promise nothing checks is an assertion.
 *
 * These reconstruct the signed bytes from the specification's own field
 * list — not by calling the signer's helper — and verify the real
 * signature against them. If the signer changes its payload, its field
 * order, or its serialisation, this fails, and the document stops being
 * wrong silently.
 */
describe('attestation envelope specification v1', () => {
  const root = process.cwd();
  const spec = readFileSync(join(root, 'docs/spec/ATTESTATION-ENVELOPE.md'), 'utf8');

  // Transcribed from the specification, in the order it publishes.
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

  const verificationResult: VerificationResult = {
    id: 'ver-spec-1',
    observationId: 'obs-spec-1',
    timestamp: '2026-08-17T00:00:00.000Z',
    summary: { passed: true, confidence: 0.9, rulesApplied: 1, rulesPassed: 1, rulesFailed: 0 },
    rules: [{ name: 'status-code-check', passed: true, confidence: 0.9 }],
    evidencePath: [],
    ruleVersions: { 'status-code-check': '1.0.0' },
    status: 'completed',
  };

  const keyPair = generateKeyPairSync('ed25519');
  const privateKey = keyPair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const publicKey = keyPair.publicKey.export({ type: 'spki', format: 'pem' }).toString();

  const service = new AttestationService({
    algorithm: 'Ed25519',
    signingKey: privateKey,
    publicKey,
    keyVersion: '1',
  });

  const attestation = service.attest(verificationResult);

  const bytesFromSpec = (source: Record<string, unknown>): Buffer => {
    const payload: Record<string, unknown> = {};
    for (const field of SIGNED_FIELDS) payload[field] = source[field];
    return Buffer.from(JSON.stringify(payload));
  };

  it('publishes every field the signer actually covers', () => {
    for (const field of SIGNED_FIELDS) {
      expect(spec).toContain(`"${field}"`);
    }
  });

  it('verifies a real signature against bytes rebuilt from the specification', () => {
    const signature = Buffer.from(attestation.signature.replace(/^0x/, ''), 'hex');

    expect(signature).toHaveLength(64);
    expect(nodeVerify(null, bytesFromSpec(attestation), publicKey, signature)).toBe(true);
  });

  it('fails if the fields are sorted rather than kept in published order', () => {
    // The document warns about exactly this. Prove the warning is real
    // rather than cautious boilerplate.
    const sorted: Record<string, unknown> = {};
    for (const field of [...SIGNED_FIELDS].sort()) {
      sorted[field] = (attestation as unknown as Record<string, unknown>)[field];
    }
    const signature = Buffer.from(attestation.signature.replace(/^0x/, ''), 'hex');

    expect(nodeVerify(null, Buffer.from(JSON.stringify(sorted)), publicKey, signature)).toBe(false);
    expect(spec).toContain('Key order is part of the format');
  });

  it('fails when any signed field is altered', () => {
    const tampered = { ...attestation, verified: !attestation.verified };
    const signature = Buffer.from(attestation.signature.replace(/^0x/, ''), 'hex');

    expect(nodeVerify(null, bytesFromSpec(tampered), publicKey, signature)).toBe(false);
  });

  it('is unaffected by fields the specification says are unsigned', () => {
    const relabelled = { ...attestation, id: 'att-relabelled', signingKey: 'sha256:0000' };
    const signature = Buffer.from(attestation.signature.replace(/^0x/, ''), 'hex');

    // Not a flaw — a documented property. Trust decisions must not rest on
    // these fields, which is why the document says so explicitly.
    expect(nodeVerify(null, bytesFromSpec(relabelled), publicKey, signature)).toBe(true);
    expect(spec).toContain('are not signed');
  });

  it('signs non-ASCII fields as UTF-8, the way the specification requires', () => {
    // attestedBy is caller-supplied, and this project's own name is not
    // ASCII. The signer emits the character and encodes UTF-8; a verifier
    // that escapes it to \\uXXXX first computes different bytes and rejects
    // a genuine attestation. The shipped Python reference did exactly that
    // until it was fixed, and nothing on this side of the format would
    // have caught it: every existing case here is ASCII.
    const attestedBy = 'Ω∞v-attestation-service 🌊';
    const nonAscii = service.attest(verificationResult, { attestedBy });

    expect(nonAscii.attestedBy).toBe(attestedBy);

    const bytes = bytesFromSpec(nonAscii as unknown as Record<string, unknown>);
    const signature = Buffer.from(nonAscii.signature.replace(/^0x/, ''), 'hex');

    // Rebuilt from the specification's field list rather than from the
    // signer's helper, so this fails if the two ever disagree.
    expect(nodeVerify(null, bytes, publicKey, signature)).toBe(true);

    // The character survives as itself. If the signer ever escaped it, the
    // byte length would grow and the assertion above would already be red,
    // but stating it separately says which property is load-bearing.
    expect(bytes.includes(Buffer.from('Ω', 'utf8'))).toBe(true);
    expect(bytes.includes(Buffer.from('\\u03a9'))).toBe(false);
  });

  it('ships a reference verifier that does not import this project', () => {
    const reference = readFileSync(join(root, 'docs/spec/verify_attestation.py'), 'utf8');

    expect(reference).toContain('SIGNED_FIELDS');
    expect(reference).not.toContain('@omega-v');
    // sort_keys would break interoperability; the reference must not use it.
    expect(reference).not.toContain('sort_keys=True');
  });
});
