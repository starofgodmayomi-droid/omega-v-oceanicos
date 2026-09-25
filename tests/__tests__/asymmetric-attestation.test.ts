import crypto from 'node:crypto';
import { describe, expect, it } from '@jest/globals';
import { ObserverEngine } from '@oceanicos/observer';
import { VerificationEngine } from '@oceanicos/verification';

describe('asymmetric attestation boundary', () => {
  it('signs evidence with Ed25519 and verifies it with only the public key', () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const telemetry = ObserverEngine.generateTelemetry('ATTESTATION_TEST');
    const evidence = VerificationEngine.evaluate(telemetry, privateKey);

    expect(evidence.status).toBe('PASS');
    expect(evidence.signatureProof).toMatch(/^[0-9a-f]+$/);
    expect(
      VerificationEngine.verifyAttestation(
        telemetry.uuid,
        evidence.status,
        'pro',
        evidence.signatureProof,
        publicKey
      )
    ).toBe(true);
  });

  it('rejects a proof when any signed field changes', () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const telemetry = ObserverEngine.generateTelemetry('ATTESTATION_TEST');
    const evidence = VerificationEngine.evaluate(telemetry, privateKey);

    expect(
      VerificationEngine.verifyAttestation(
        telemetry.uuid,
        'DIVERGENT',
        'pro',
        evidence.signatureProof,
        publicKey
      )
    ).toBe(false);
  });
});
