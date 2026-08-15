import { generateKeyPairSync } from 'node:crypto';
import { AttestationService, verifyEd25519 } from '../index';
import { VerificationResult } from '@omega-v/types';

const verificationResult: VerificationResult = {
  id: 'ver-public-trust-1',
  observationId: 'obs-public-trust-1',
  timestamp: '2026-08-15T00:00:00.000Z',
  summary: {
    passed: true,
    confidence: 0.99,
    rulesApplied: 1,
    rulesPassed: 1,
    rulesFailed: 0,
  },
  rules: [{ name: 'health-check', passed: true, confidence: 0.99 }],
  evidencePath: [],
  ruleVersions: { 'health-check': '1.0.0' },
  status: 'completed',
};

describe('Ed25519 public trust surface', () => {
  it('embeds only the public verification key in the attestation', () => {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
      format: 'pem',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const service = new AttestationService({
      algorithm: 'Ed25519',
      signingKey: privateKey,
      keyVersion: 'trust-1',
    });
    const attestation = service.attest(verificationResult);

    expect(attestation.verifyingPublicKey).toBe(publicKey);
    expect(attestation.verifyingPublicKey).not.toBe(privateKey);
    expect(verifyEd25519(attestation, attestation.verifyingPublicKey!)).toBe(true);
  });
});
