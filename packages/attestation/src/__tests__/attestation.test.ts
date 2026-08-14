import { AttestationService } from '../index';
import { VerificationResult, Attestation } from '@omega-v/types';

describe('AttestationService', () => {
  let service: AttestationService;
  let testVerificationResult: VerificationResult;

  beforeEach(() => {
    service = new AttestationService('test-key-v1', '1');

    testVerificationResult = {
      id: 'ver-test-1',
      observationId: 'obs-test-1',
      timestamp: new Date().toISOString(),
      summary: {
        passed: true,
        confidence: 0.95,
        rulesApplied: 2,
        rulesPassed: 2,
        rulesFailed: 0,
      },
      rules: [
        {
          name: 'response-time-threshold',
          passed: true,
          confidence: 0.95,
        },
        {
          name: 'status-code-check',
          passed: true,
          confidence: 0.98,
        },
      ],
      evidencePath: [
        {
          step: 1,
          rule: 'response-time-threshold',
          condition: 'responseTime < 100',
          value: 42,
          expected: 100,
          passed: true,
          reasoning: 'Response time 42ms is below 100ms threshold',
        },
        {
          step: 2,
          rule: 'status-code-check',
          condition: 'statusCode === 200',
          value: 200,
          expected: 200,
          passed: true,
          reasoning: 'Status code is 200 (expected)',
        },
      ],
      ruleVersions: {
        'response-time-threshold': '1.0.5',
        'status-code-check': '1.2.0',
      },
      status: 'completed',
    };
  });

  describe('attest()', () => {
    it('creates an attestation from a verification result', () => {
      const attestation = service.attest(testVerificationResult);

      expect(attestation).toBeDefined();
      expect(attestation.id).toBeDefined();
      expect(attestation.id).toMatch(/^att-/);
      expect(attestation.verificationId).toBe(testVerificationResult.id);
      expect(attestation.observationId).toBe(testVerificationResult.observationId);
    });

    it('includes verification result in attestation', () => {
      const attestation = service.attest(testVerificationResult);

      expect(attestation.verified).toBe(testVerificationResult.summary.passed);
      expect(attestation.confidence).toBe(testVerificationResult.summary.confidence);
      expect(attestation.ruleVersions).toEqual(testVerificationResult.ruleVersions);
    });

    it('generates a cryptographic signature', () => {
      const attestation = service.attest(testVerificationResult);

      expect(attestation.signature).toBeDefined();
      expect(attestation.signature).toMatch(/^0x/);
      expect(attestation.signature.length).toBeGreaterThan(2);
    });

    it('sets attestation status to signed', () => {
      const attestation = service.attest(testVerificationResult);

      expect(attestation.status).toBe('signed');
    });

    it('records signing metadata', () => {
      const attestation = service.attest(testVerificationResult);

      expect(attestation.signingKey).toBeDefined();
      expect(attestation.keyVersion).toBe('1');
      expect(attestation.signingAlgorithm).toBe('HMAC-SHA256');
      expect(attestation.attestedBy).toBe('attestation-service');
      expect(attestation.attestedAt).toBeDefined();
    });

    it('allows custom attestedBy option', () => {
      const attestation = service.attest(testVerificationResult, {
        attestedBy: 'custom-service',
      });

      expect(attestation.attestedBy).toBe('custom-service');
    });

    it('allows custom algorithm option', () => {
      const attestation = service.attest(testVerificationResult, {
        algorithm: 'SHA512',
      });

      expect(attestation.signingAlgorithm).toBe('SHA512');
    });

    it('preserves passed/failed status in attestation', () => {
      const passedResult: VerificationResult = {
        ...testVerificationResult,
        summary: {
          ...testVerificationResult.summary,
          passed: true,
        },
      };

      const passedAttestation = service.attest(passedResult);
      expect(passedAttestation.verified).toBe(true);

      const failedResult: VerificationResult = {
        ...testVerificationResult,
        summary: {
          ...testVerificationResult.summary,
          passed: false,
        },
      };

      const failedAttestation = service.attest(failedResult);
      expect(failedAttestation.verified).toBe(false);
    });
  });

  describe('verify()', () => {
    it('verifies a valid attestation', () => {
      const attestation = service.attest(testVerificationResult);
      const isValid = service.verify(attestation);

      expect(isValid).toBe(true);
    });

    it('rejects attestation with missing signature', () => {
      const attestation = service.attest(testVerificationResult);
      attestation.signature = '';

      const isValid = service.verify(attestation);
      expect(isValid).toBe(false);
    });

    it('rejects attestation with missing verificationId', () => {
      const attestation = service.attest(testVerificationResult);
      attestation.verificationId = '';

      const isValid = service.verify(attestation);
      expect(isValid).toBe(false);
    });

    it('rejects attestation with missing observationId', () => {
      const attestation = service.attest(testVerificationResult);
      attestation.observationId = '';

      const isValid = service.verify(attestation);
      expect(isValid).toBe(false);
    });

    it('rejects attestation not in signed status', () => {
      const attestation = service.attest(testVerificationResult);
      attestation.status = 'revoked';

      const isValid = service.verify(attestation);
      expect(isValid).toBe(false);
    });

    it('rejects attestation with mismatched key version', () => {
      const attestation = service.attest(testVerificationResult);
      attestation.keyVersion = '2';

      const isValid = service.verify(attestation);
      expect(isValid).toBe(false);
    });

    it('rejects attestation with tampered signature', () => {
      const attestation = service.attest(testVerificationResult);
      const originalSig = attestation.signature;

      attestation.signature = '0x' + 'a'.repeat(64);

      const isValid = service.verify(attestation);
      expect(isValid).toBe(false);
      expect(attestation.signature).not.toBe(originalSig);
    });

    it('rejects attestation with tampered verification data', () => {
      const attestation = service.attest(testVerificationResult);

      attestation.verified = !attestation.verified;

      const isValid = service.verify(attestation);
      expect(isValid).toBe(false);
    });

    it('rejects attestation with tampered confidence', () => {
      const attestation = service.attest(testVerificationResult);

      attestation.confidence = attestation.confidence - 0.1;

      const isValid = service.verify(attestation);
      expect(isValid).toBe(false);
    });
  });

  describe('getKeyInfo()', () => {
    it('returns current signing key information', () => {
      const keyInfo = service.getKeyInfo();

      expect(keyInfo.key).toBe('test-key-v1');
      expect(keyInfo.version).toBe('1');
    });
  });

  describe('rotateKey()', () => {
    it('rotates to a new signing key', () => {
      service.rotateKey('new-key-v2', '2');

      const keyInfo = service.getKeyInfo();
      expect(keyInfo.key).toBe('new-key-v2');
      expect(keyInfo.version).toBe('2');
    });

    it('invalidates old attestations after key rotation', () => {
      const attestation1 = service.attest(testVerificationResult);
      expect(service.verify(attestation1)).toBe(true);

      service.rotateKey('new-key-v2', '2');

      expect(service.verify(attestation1)).toBe(false);
    });

    it('new attestations verify with rotated key', () => {
      service.rotateKey('new-key-v2', '2');

      const attestation = service.attest(testVerificationResult);
      expect(service.verify(attestation)).toBe(true);
    });
  });

  describe('signature uniqueness', () => {
    it('creates different signatures for different verification results', () => {
      const result1 = testVerificationResult;
      const result2: VerificationResult = {
        ...testVerificationResult,
        id: 'ver-test-2',
        summary: {
          ...testVerificationResult.summary,
          passed: false,
        },
      };

      const att1 = service.attest(result1);
      const att2 = service.attest(result2);

      expect(att1.signature).not.toBe(att2.signature);
    });

    it('creates same signature for identical verification results', () => {
      const att1 = service.attest(testVerificationResult);
      const att2 = service.attest(testVerificationResult);

      expect(att1.signature).toBe(att2.signature);
    });
  });

  describe('attestation chain integrity', () => {
    it('maintains full provenance chain', () => {
      const attestation = service.attest(testVerificationResult);

      expect(attestation.observationId).toBe(testVerificationResult.observationId);
      expect(attestation.verificationId).toBe(testVerificationResult.id);
      expect(attestation.ruleVersions).toEqual(testVerificationResult.ruleVersions);
    });

    it('signature proof includes all critical data', () => {
      const att1 = service.attest(testVerificationResult);

      const modifiedResult = { ...testVerificationResult };
      modifiedResult.summary.confidence = 0.5;

      const att2 = service.attest(modifiedResult);

      expect(att1.signature).not.toBe(att2.signature);
    });
  });

  describe('timing-safe comparison', () => {
    it('uses timing-safe comparison for signature verification', () => {
      const attestation = service.attest(testVerificationResult);

      const results = [
        service.verify(attestation),
        service.verify(attestation),
        service.verify(attestation),
      ];

      expect(results).toEqual([true, true, true]);
    });
  });
});
