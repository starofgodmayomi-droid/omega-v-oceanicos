import { AttestationService } from '../index';
import { VerificationResult } from '@omega-v/types';

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

describe('AttestationService', () => {
  it('creates and verifies an HMAC signature', () => {
    const service = new AttestationService('test-key', '1');
    const attestation = service.attest(verificationResult);

    expect(attestation.signature).toMatch(/^0x[0-9a-f]{64}$/);
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
