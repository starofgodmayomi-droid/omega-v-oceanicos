import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import crypto from 'node:crypto';
import { ObserverEngine } from '../../packages/observer/dist/index.js';
import { VerificationEngine } from '../../packages/verification/dist/index.js';

describe('asymmetric attestation boundary', () => {
  it('signs evidence with Ed25519 and verifies it with only the public key', () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const telemetry = ObserverEngine.generateTelemetry('ATTESTATION_TEST');
    const evidence = VerificationEngine.evaluate(telemetry, privateKey);

    assert.equal(evidence.status, 'PASS');
    assert.match(evidence.signatureProof, /^[0-9a-f]+$/);
    assert.equal(
      VerificationEngine.verifyAttestation(
        telemetry.uuid,
        evidence.status,
        'pro',
        evidence.signatureProof,
        publicKey
      )
    , true);
  });

  it('rejects a proof when any signed field changes', () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const telemetry = ObserverEngine.generateTelemetry('ATTESTATION_TEST');
    const evidence = VerificationEngine.evaluate(telemetry, privateKey);

    assert.equal(
      VerificationEngine.verifyAttestation(
        telemetry.uuid,
        'DIVERGENT',
        'pro',
        evidence.signatureProof,
        publicKey
      )
    , false);
  });
});
