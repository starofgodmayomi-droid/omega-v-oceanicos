import { OceanicosEnclaveEngine } from '../index';

describe('OceanicosEnclaveEngine — Hardware TEE Confidential Computing & Remote Attestation', () => {
  let engine: OceanicosEnclaveEngine;

  beforeEach(() => {
    engine = new OceanicosEnclaveEngine('test-hw-root-key');
  });

  describe('1. Enclave Provisioning & Measurement Hashes', () => {
    it('should provision canonical SGX and Nitro enclaves on initialization', () => {
      const enclaves = engine.getEnclaves();
      expect(enclaves.length).toBeGreaterThanOrEqual(2);
      expect(enclaves.map((e) => e.type)).toContain('INTEL_SGX');
      expect(enclaves.map((e) => e.type)).toContain('AWS_NITRO');
    });

    it('should compute cryptographic MRENCLAVE and MRSIGNER measurement hashes', () => {
      const enclave = engine.provisionEnclave({
        type: 'AMD_SEV',
        name: 'AMD SEV-SNP Confidential VM Node',
        codePayload: 'AMD_SEV_KERNEL_PAYLOAD_V1',
        authorSignerKey: 'did:omega:publisher:amd-signer',
      });

      expect(enclave.enclaveId).toMatch(/^enclave-amd_sev/);
      expect(enclave.mrEnclave).toHaveLength(64);
      expect(enclave.mrSigner).toHaveLength(64);
      expect(enclave.pcrValues.pcr0).toHaveLength(64);
      expect(enclave.pcrValues.pcr1).toHaveLength(64);
      expect(enclave.pcrValues.pcr2).toHaveLength(64);
      expect(enclave.status).toBe('READY');
    });
  });

  describe('2. Remote Attestation Generation & Verification', () => {
    it('should generate cryptographically verifiable Remote Attestation report with hardware signature', () => {
      const report = engine.generateRemoteAttestation(
        'enclave-sgx-primary-01',
        { claim: 'confidential memory payload verification' },
        'nonce-1234567890'
      );

      expect(report.reportId).toMatch(/^att-rep-/);
      expect(report.type).toBe('INTEL_SGX');
      expect(report.mrEnclave).toHaveLength(64);
      expect(report.hardwareNonce).toBe('nonce-1234567890');
      expect(report.hardwareSignature).toMatch(/^0x/);
      expect(report.certificateChain.length).toBeGreaterThanOrEqual(3);

      // Verify attestation
      const verification = engine.verifyRemoteAttestation(report);
      expect(verification.valid).toBe(true);
      expect(verification.trusted).toBe(true);

      // Tampered signature fails
      const tampered = { ...report, hardwareSignature: '0x12345678' };
      expect(engine.verifyRemoteAttestation(tampered).valid).toBe(false);
    });
  });

  describe('3. Enclave State Sealing & Unsealing', () => {
    it('should seal data with AES-256-GCM bound to MRENCLAVE and successfully unseal', () => {
      const secret = { privateKey: '0xabc123secretkey', token: 'jwt-scoped-token' };
      const sealed = engine.sealData('enclave-sgx-primary-01', secret);

      expect(sealed.sealId).toMatch(/^seal-/);
      expect(sealed.mrEnclaveConstraint).toHaveLength(64);
      expect(sealed.ciphertext).toBeDefined();
      expect(sealed.iv).toHaveLength(24);
      expect(sealed.authTag).toHaveLength(32);

      // Unseal inside the same enclave measurement
      const unsealed = engine.unsealData('enclave-sgx-primary-01', sealed);
      expect(JSON.parse(unsealed)).toEqual(secret);
    });

    it('should reject unsealing when MRENCLAVE measurement constraint does not match', () => {
      const secret = 'TOP_SECRET_ORACLE_KEY';
      const sealed = engine.sealData('enclave-sgx-primary-01', secret);

      // Attempting to unseal in Nitro enclave (different MRENCLAVE) must throw
      expect(() => {
        engine.unsealData('enclave-nitro-isolated-02', sealed);
      }).toThrow(/MRENCLAVE mismatch/);
    });
  });

  describe('4. Confidential Code Execution & Stats', () => {
    it('should execute operation inside confidential enclave memory and issue signed report', () => {
      const result = engine.executeConfidentialCode(
        'enclave-sgx-primary-01',
        'VERIFY_ZERO_KNOWLEDGE_PROOF',
        {
          witness: '0.98',
          curve: 'bn254',
        }
      );

      expect(result.executionId).toMatch(/^exec-/);
      expect(result.verified).toBe(true);
      expect(result.output.operation).toBe('VERIFY_ZERO_KNOWLEDGE_PROOF');
      expect(result.attestationReport).toBeDefined();
      expect(engine.verifyRemoteAttestation(result.attestationReport).valid).toBe(true);
    });

    it('should calculate enclave statistics', () => {
      const stats = engine.getStats();
      expect(stats.totalEnclaves).toBeGreaterThanOrEqual(2);
      expect(stats.readyEnclaves).toBeGreaterThanOrEqual(2);
      expect(stats.supportedTypes).toContain('INTEL_SGX');
      expect(stats.supportedTypes).toContain('AWS_NITRO');
    });
  });
});
