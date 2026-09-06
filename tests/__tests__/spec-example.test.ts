import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { verify as nodeVerify } from 'node:crypto';

/**
 * The worked example in the specification must actually verify.
 *
 * A document that shows an attestation and a key is asking to be trusted
 * about them. This extracts both from the published markdown — not from a
 * fixture kept alongside it — and checks the signature, so the example
 * cannot rot into an illustration of a format that no longer exists.
 */
describe('the specification worked example', () => {
  const spec = readFileSync(join(process.cwd(), 'docs/spec/ATTESTATION-ENVELOPE.md'), 'utf8');

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

  const exampleBlock = (): Record<string, unknown> => {
    const match = spec.match(/\*\*Attestation\*\*\s*```json\s*([\s\S]*?)```/);
    if (!match) throw new Error('no attestation example found in the specification');
    return JSON.parse(match[1]) as Record<string, unknown>;
  };

  const examplePublicKey = (): string => {
    const match = spec.match(/-----BEGIN PUBLIC KEY-----[\s\S]*?-----END PUBLIC KEY-----/);
    if (!match) throw new Error('no public key found in the specification');
    return match[0];
  };

  const bytes = (source: Record<string, unknown>): Buffer => {
    const payload: Record<string, unknown> = {};
    for (const field of SIGNED_FIELDS) payload[field] = source[field];
    return Buffer.from(JSON.stringify(payload));
  };

  const signatureOf = (source: Record<string, unknown>): Buffer =>
    Buffer.from(String(source.signature).replace(/^0x/, ''), 'hex');

  it('publishes an attestation that verifies against its published key', () => {
    const attestation = exampleBlock();

    expect(nodeVerify(null, bytes(attestation), examplePublicKey(), signatureOf(attestation))).toBe(
      true
    );
  });

  it('breaks exactly where the document says it breaks', () => {
    const attestation = exampleBlock();
    const tampered = { ...attestation, verified: !attestation.verified };

    // The document tells the reader to try this and watch it fail.
    expect(nodeVerify(null, bytes(tampered), examplePublicKey(), signatureOf(attestation))).toBe(
      false
    );
  });

  it('survives editing a field the document says is unsigned', () => {
    const attestation = exampleBlock();
    const relabelled = { ...attestation, id: 'att-anything-at-all' };

    // Also promised to the reader, and the reason the field list matters.
    expect(nodeVerify(null, bytes(relabelled), examplePublicKey(), signatureOf(attestation))).toBe(
      true
    );
  });

  it('states that the example private key was discarded', () => {
    expect(spec).toMatch(/discarded/i);
    expect(spec).not.toContain('BEGIN PRIVATE KEY');
  });
});
