import RSAAttestationService from '../rsa-attestation';
import { VerificationResult } from '@omega-v/types';

describe('RSAAttestationService', () => {
  let service: RSAAttestationService;

  beforeEach(() => {
    service = new RSAAttestationService({
      algorithm: 'RSA-SHA256',
      keySize: 2048,
    });
  });

  describe('Key Management', () => {
    it('should generate initial RSA key pair', () => {
      const version = service.getCurrentKeyVersion();
      expect(version).toBe(1);

      const keyPair = service.getKeyVersion(1);
      expect(keyPair).toBeDefined();
      expect(keyPair?.publicKey).toMatch(/-----BEGIN PUBLIC KEY-----/);
      expect(keyPair?.privateKey).toMatch(/-----BEGIN PRIVATE KEY-----/);
    });

    it('should rotate to new key version', () => {
      const initialVersion = service.getCurrentKeyVersion();
      const newVersion = service.rotateKey();

      expect(newVersion).toBe(initialVersion + 1);
      expect(service.getCurrentKeyVersion()).toBe(newVersion);

      // Both versions should exist
      expect(service.getKeyVersion(initialVersion)).toBeDefined();
      expect(service.getKeyVersion(newVersion)).toBeDefined();
    });

    it('should get all public key versions', () => {
      service.rotateKey();
      service.rotateKey();

      const versions = service.getAllPublicKeyVersions();

      expect(Object.keys(versions).length).toBe(3);
      expect(versions[1]).toBeDefined();
      expect(versions[2]).toBeDefined();
      expect(versions[3]).toBeDefined();
    });

    it('should return null for non-existent key version', () => {
      const keyPair = service.getKeyVersion(999);
      expect(keyPair).toBeNull();
    });
  });

  describe('Attestation Creation', () => {
    const verification: VerificationResult = {
      id: 'ver-rsa-1',
      observationId: 'obs-rsa-1',
      timestamp: new Date().toISOString(),
      summary: {
        passed: true,
        confidence: 0.95,
        rulesApplied: 2,
        rulesPassed: 2,
        rulesFailed: 0,
      },
      rules: [
        { name: 'rule1', passed: true, confidence: 0.95 },
        { name: 'rule2', passed: true, confidence: 0.95 },
      ],
      evidencePath: [
        {
          step: 1,
          rule: 'rule1',
          condition: 'test',
          value: true,
          expected: true,
          passed: true,
          reasoning: 'Test passed',
        },
      ],
      ruleVersions: { rule1: '1.0.0', rule2: '1.0.0' },
      status: 'completed',
    };

    it('should create RSA attestation with valid signature', () => {
      const attestation = service.createAttestation(verification, 'obs-rsa-1');

      expect(attestation).toBeDefined();
      expect(attestation.id).toMatch(/^att-/);
      expect(attestation.verified).toBe(true);
      expect(attestation.confidence).toBe(0.95);
      expect(attestation.signature).toBeDefined();
      expect(attestation.signature.length).toBeGreaterThan(0);
      expect(attestation.signingAlgorithm).toBe('RSA-SHA256');
      expect(attestation.verifyingPublicKey).toBeDefined();
      expect(attestation.status).toBe('signed');
    });

    it('should set correct key version in attestation', () => {
      const attestation = service.createAttestation(verification, 'obs-rsa-1');

      expect(attestation.keyVersion).toBe('1');
      expect(attestation.signingKey).toBe('rsa-key-1');
    });

    it('should preserve verification details in attestation', () => {
      const attestation = service.createAttestation(verification, 'obs-rsa-1');

      expect(attestation.observationId).toBe('obs-rsa-1');
      expect(attestation.verificationId).toBe('ver-rsa-1');
      expect(attestation.ruleVersions).toEqual(verification.ruleVersions);
    });
  });

  describe('Attestation Verification', () => {
    const verification: VerificationResult = {
      id: 'ver-rsa-verify',
      observationId: 'obs-rsa-verify',
      timestamp: new Date().toISOString(),
      summary: {
        passed: true,
        confidence: 0.9,
        rulesApplied: 1,
        rulesPassed: 1,
        rulesFailed: 0,
      },
      rules: [{ name: 'test-rule', passed: true, confidence: 0.9 }],
      evidencePath: [],
      ruleVersions: { 'test-rule': '1.0.0' },
      status: 'completed',
    };

    it('should verify valid RSA attestation', () => {
      const attestation = service.createAttestation(verification, 'obs-rsa-verify');
      const isValid = service.verifyAttestation(attestation);

      expect(isValid).toBe(true);
    });

    it('should reject modified attestation', () => {
      const attestation = service.createAttestation(verification, 'obs-rsa-verify');

      // Modify the verified flag
      const tamperedAttestation = {
        ...attestation,
        verified: !attestation.verified,
      };

      const isValid = service.verifyAttestation(tamperedAttestation);
      expect(isValid).toBe(false);
    });

    it('should reject attestation with invalid signature', () => {
      const attestation = service.createAttestation(verification, 'obs-rsa-verify');

      // Corrupt the signature
      const corruptedAttestation = {
        ...attestation,
        signature: attestation.signature.slice(0, -10) + '0123456789',
      };

      const isValid = service.verifyAttestation(corruptedAttestation);
      expect(isValid).toBe(false);
    });

    it('should reject attestation with wrong public key', () => {
      const attestation = service.createAttestation(verification, 'obs-rsa-verify');

      // Use a different key's public key
      service.rotateKey();
      const newKeyPair = service.getKeyVersion(service.getCurrentKeyVersion());

      const attestationWithWrongKey = {
        ...attestation,
        verifyingPublicKey: newKeyPair?.publicKey,
      };

      const isValid = service.verifyAttestation(attestationWithWrongKey);
      expect(isValid).toBe(false);
    });

    it('should return false for attestation without public key', () => {
      const attestation = service.createAttestation(verification, 'obs-rsa-verify');
      const attestationNoKey = { ...attestation, verifyingPublicKey: undefined };

      const isValid = service.verifyAttestation(attestationNoKey);
      expect(isValid).toBe(false);
    });
  });

  describe('Key Rotation', () => {
    const verification: VerificationResult = {
      id: 'ver-rotation',
      observationId: 'obs-rotation',
      timestamp: new Date().toISOString(),
      summary: {
        passed: true,
        confidence: 0.95,
        rulesApplied: 1,
        rulesPassed: 1,
        rulesFailed: 0,
      },
      rules: [{ name: 'rule', passed: true, confidence: 0.95 }],
      evidencePath: [],
      ruleVersions: { rule: '1.0.0' },
      status: 'completed',
    };

    it('should create attestations with different key versions', () => {
      const att1 = service.createAttestation(verification, 'obs-rotation');
      expect(att1.keyVersion).toBe('1');

      service.rotateKey();

      const att2 = service.createAttestation(verification, 'obs-rotation');
      expect(att2.keyVersion).toBe('2');

      // Both attestations should be independently verifiable
      expect(service.verifyAttestation(att1)).toBe(true);
      expect(service.verifyAttestation(att2)).toBe(true);
    });

    it('should mark attestation as revoked after key rotation', () => {
      const attestation = service.createAttestation(verification, 'obs-rotation');
      expect(attestation.status).toBe('signed');

      const revokedAttestation = service.markRevoked(attestation);
      expect(revokedAttestation.status).toBe('revoked');

      // Revoked attestation can still be verified (historical validation)
      expect(service.verifyAttestation(revokedAttestation)).toBe(true);
    });

    it('should maintain verification across multiple key rotations', () => {
      const attestations = [];

      for (let i = 0; i < 5; i++) {
        const att = service.createAttestation(verification, `obs-rotation-${i}`);
        attestations.push(att);

        if (i < 4) {
          service.rotateKey();
        }
      }

      // All attestations should still verify
      for (const att of attestations) {
        expect(service.verifyAttestation(att)).toBe(true);
      }
    });
  });

  describe('Algorithm Support', () => {
    it('should support RSA-SHA512 algorithm', () => {
      const rsaSha512Service = new RSAAttestationService({
        algorithm: 'RSA-SHA512',
        keySize: 2048,
      });

      const verification: VerificationResult = {
        id: 'ver-sha512',
        observationId: 'obs-sha512',
        timestamp: new Date().toISOString(),
        summary: {
          passed: true,
          confidence: 0.95,
          rulesApplied: 1,
          rulesPassed: 1,
          rulesFailed: 0,
        },
        rules: [{ name: 'rule', passed: true, confidence: 0.95 }],
        evidencePath: [],
        ruleVersions: { rule: '1.0.0' },
        status: 'completed',
      };

      const attestation = rsaSha512Service.createAttestation(verification, 'obs-sha512');

      expect(attestation.signingAlgorithm).toBe('RSA-SHA512');
      expect(rsaSha512Service.verifyAttestation(attestation)).toBe(true);
    });

    it('should support different key sizes', () => {
      const rsa4096Service = new RSAAttestationService({
        algorithm: 'RSA-SHA256',
        keySize: 4096,
      });

      const verification: VerificationResult = {
        id: 'ver-4096',
        observationId: 'obs-4096',
        timestamp: new Date().toISOString(),
        summary: {
          passed: true,
          confidence: 0.95,
          rulesApplied: 1,
          rulesPassed: 1,
          rulesFailed: 0,
        },
        rules: [{ name: 'rule', passed: true, confidence: 0.95 }],
        evidencePath: [],
        ruleVersions: { rule: '1.0.0' },
        status: 'completed',
      };

      const attestation = rsa4096Service.createAttestation(verification, 'obs-4096');
      expect(rsa4096Service.verifyAttestation(attestation)).toBe(true);
    });
  });
});
