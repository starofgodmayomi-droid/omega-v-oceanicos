import { AttestationService } from '@omega-v/attestation';
import { VerificationResult } from '@omega-v/types';

describe('AttestationService', () => {
  let service: AttestationService;

  beforeEach(() => {
    service = new AttestationService();
  });

  describe('Attestation Creation', () => {
    it('should create an attestation for a verification result', () => {
      const verificationResult: VerificationResult = {
        id: 'ver-1',
        observationId: 'obs-1',
        timestamp: new Date().toISOString(),
        summary: {
          passed: true,
          confidence: 0.95,
          rulesApplied: 2,
          rulesPassed: 2,
          rulesFailed: 0,
        },
        rules: [],
        evidencePath: [],
        ruleVersions: {},
        status: 'completed',
      };

      const attestation = service.attest(verificationResult);

      expect(attestation).toBeDefined();
      expect(attestation.id).toMatch(/^att-/);
      expect(attestation.verificationId).toBe(verificationResult.id);
      expect(attestation.observationId).toBe(verificationResult.observationId);
    });

    it('should mark attestation as signed', () => {
      const verificationResult: VerificationResult = {
        id: 'ver-1',
        observationId: 'obs-1',
        timestamp: new Date().toISOString(),
        summary: {
          passed: true,
          confidence: 0.95,
          rulesApplied: 1,
          rulesPassed: 1,
          rulesFailed: 0,
        },
        rules: [],
        evidencePath: [],
        ruleVersions: {},
        status: 'completed',
      };

      const attestation = service.attest(verificationResult);

      expect(attestation.status).toBe('signed');
    });

    it('should include signature in attestation', () => {
      const verificationResult: VerificationResult = {
        id: 'ver-1',
        observationId: 'obs-1',
        timestamp: new Date().toISOString(),
        summary: {
          passed: true,
          confidence: 0.95,
          rulesApplied: 1,
          rulesPassed: 1,
          rulesFailed: 0,
        },
        rules: [],
        evidencePath: [],
        ruleVersions: {},
        status: 'completed',
      };

      const attestation = service.attest(verificationResult);

      expect(attestation.signature).toBeDefined();
      expect(attestation.signature).toMatch(/^0x/);
    });

    it('should preserve verification result data', () => {
      const verificationResult: VerificationResult = {
        id: 'ver-1',
        observationId: 'obs-1',
        timestamp: '2026-08-12T10:00:00Z',
        summary: {
          passed: true,
          confidence: 0.85,
          rulesApplied: 2,
          rulesPassed: 2,
          rulesFailed: 0,
        },
        rules: [],
        evidencePath: [],
        ruleVersions: { 'rule-1': '1.0.0', 'rule-2': '2.0.0' },
        status: 'completed',
      };

      const attestation = service.attest(verificationResult);

      expect(attestation.verified).toBe(verificationResult.summary.passed);
      expect(attestation.confidence).toBe(verificationResult.summary.confidence);
      expect(attestation.ruleVersions).toEqual(verificationResult.ruleVersions);
    });

    it('should support custom attestation options', () => {
      const verificationResult: VerificationResult = {
        id: 'ver-1',
        observationId: 'obs-1',
        timestamp: new Date().toISOString(),
        summary: {
          passed: true,
          confidence: 0.95,
          rulesApplied: 1,
          rulesPassed: 1,
          rulesFailed: 0,
        },
        rules: [],
        evidencePath: [],
        ruleVersions: {},
        status: 'completed',
      };

      const attestation = service.attest(verificationResult, {
        attestedBy: 'custom-attestor',
        algorithm: 'RSA-SHA256',
      });

      expect(attestation.attestedBy).toBe('custom-attestor');
      expect(attestation.signingAlgorithm).toBe('RSA-SHA256');
    });

    it('should include timestamp of attestation', () => {
      const verificationResult: VerificationResult = {
        id: 'ver-1',
        observationId: 'obs-1',
        timestamp: new Date().toISOString(),
        summary: {
          passed: true,
          confidence: 0.95,
          rulesApplied: 1,
          rulesPassed: 1,
          rulesFailed: 0,
        },
        rules: [],
        evidencePath: [],
        ruleVersions: {},
        status: 'completed',
      };

      const before = new Date();
      const attestation = service.attest(verificationResult);
      const after = new Date();

      const attestedTime = new Date(attestation.attestedAt);
      expect(attestedTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(attestedTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Attestation Verification', () => {
    it('should verify a valid attestation', () => {
      const verificationResult: VerificationResult = {
        id: 'ver-1',
        observationId: 'obs-1',
        timestamp: new Date().toISOString(),
        summary: {
          passed: true,
          confidence: 0.95,
          rulesApplied: 1,
          rulesPassed: 1,
          rulesFailed: 0,
        },
        rules: [],
        evidencePath: [],
        ruleVersions: {},
        status: 'completed',
      };

      const attestation = service.attest(verificationResult);
      const isValid = service.verify(attestation);

      expect(isValid).toBe(true);
    });

    it('should reject attestation without signature', () => {
      const attestation = {
        id: 'att-1',
        verificationId: 'ver-1',
        observationId: 'obs-1',
        verified: true,
        confidence: 0.95,
        signature: undefined,
        signingKey: 'key',
        keyVersion: '1',
        signingAlgorithm: 'HMAC-SHA256',
        attestedAt: new Date().toISOString(),
        attestedBy: 'test',
        ruleVersions: {},
        status: 'signed' as const,
      };

      const isValid = service.verify(attestation);

      expect(isValid).toBe(false);
    });

    it('should reject attestation without verification ID', () => {
      const attestation = {
        id: 'att-1',
        verificationId: undefined,
        observationId: 'obs-1',
        verified: true,
        confidence: 0.95,
        signature: '0xabc123',
        signingKey: 'key',
        keyVersion: '1',
        signingAlgorithm: 'HMAC-SHA256',
        attestedAt: new Date().toISOString(),
        attestedBy: 'test',
        ruleVersions: {},
        status: 'signed' as const,
      };

      const isValid = service.verify(attestation as any);

      expect(isValid).toBe(false);
    });

    it('should reject unsigned attestation', () => {
      const attestation = {
        id: 'att-1',
        verificationId: 'ver-1',
        observationId: 'obs-1',
        verified: true,
        confidence: 0.95,
        signature: '0xabc123',
        signingKey: 'key',
        keyVersion: '1',
        signingAlgorithm: 'HMAC-SHA256',
        attestedAt: new Date().toISOString(),
        attestedBy: 'test',
        ruleVersions: {},
        status: 'unsigned' as any,
      };

      const isValid = service.verify(attestation as any);

      expect(isValid).toBe(false);
    });

    it('should reject attestation with mismatched key version', () => {
      const verificationResult: VerificationResult = {
        id: 'ver-1',
        observationId: 'obs-1',
        timestamp: new Date().toISOString(),
        summary: {
          passed: true,
          confidence: 0.95,
          rulesApplied: 1,
          rulesPassed: 1,
          rulesFailed: 0,
        },
        rules: [],
        evidencePath: [],
        ruleVersions: {},
        status: 'completed',
      };

      const attestation = service.attest(verificationResult);

      // Rotate to new key
      service.rotateKey('new-key', '2');

      const isValid = service.verify(attestation);

      expect(isValid).toBe(false);
    });
  });

  describe('Key Management', () => {
    it('should provide key information', () => {
      const keyInfo = service.getKeyInfo();

      expect(keyInfo.key).toBeDefined();
      expect(keyInfo.version).toBeDefined();
    });

    it('should support key rotation', () => {
      const originalKey = service.getKeyInfo();

      service.rotateKey('new-key-2026-production', '2');

      const newKey = service.getKeyInfo();

      expect(newKey.key).toBe('new-key-2026-production');
      expect(newKey.version).toBe('2');
      expect(newKey.key).not.toBe(originalKey.key);
      expect(newKey.version).not.toBe(originalKey.version);
    });

    it('should invalidate attestations with old key after rotation', () => {
      const verificationResult: VerificationResult = {
        id: 'ver-1',
        observationId: 'obs-1',
        timestamp: new Date().toISOString(),
        summary: {
          passed: true,
          confidence: 0.95,
          rulesApplied: 1,
          rulesPassed: 1,
          rulesFailed: 0,
        },
        rules: [],
        evidencePath: [],
        ruleVersions: {},
        status: 'completed',
      };

      const attestationWithOldKey = service.attest(verificationResult);

      service.rotateKey('new-key', '2');

      const isValid = service.verify(attestationWithOldKey);

      expect(isValid).toBe(false);
    });

    it('should validate new attestations after key rotation', () => {
      const verificationResult: VerificationResult = {
        id: 'ver-1',
        observationId: 'obs-1',
        timestamp: new Date().toISOString(),
        summary: {
          passed: true,
          confidence: 0.95,
          rulesApplied: 1,
          rulesPassed: 1,
          rulesFailed: 0,
        },
        rules: [],
        evidencePath: [],
        ruleVersions: {},
        status: 'completed',
      };

      service.rotateKey('new-key', '2');

      const attestationWithNewKey = service.attest(verificationResult);

      const isValid = service.verify(attestationWithNewKey);

      expect(isValid).toBe(true);
    });
  });

  describe('Confidentiality Preservation', () => {
    it('should handle failed verifications', () => {
      const verificationResult: VerificationResult = {
        id: 'ver-1',
        observationId: 'obs-1',
        timestamp: new Date().toISOString(),
        summary: {
          passed: false,
          confidence: 0.3,
          rulesApplied: 2,
          rulesPassed: 0,
          rulesFailed: 2,
        },
        rules: [],
        evidencePath: [],
        ruleVersions: {},
        status: 'completed',
      };

      const attestation = service.attest(verificationResult);

      expect(attestation.verified).toBe(false);
      expect(attestation.confidence).toBe(0.3);
    });
  });
});
