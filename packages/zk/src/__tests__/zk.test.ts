import { OceanicosZKEngine } from '../index';

describe('@omega-v/zk — OceanicosZKEngine', () => {
  let zkEngine: OceanicosZKEngine;

  beforeEach(() => {
    zkEngine = new OceanicosZKEngine('test-zk-secret-key');
  });

  describe('Circuit Registry & Discovery', () => {
    it('should bootstrap canonical zk circuits', () => {
      const circuits = zkEngine.getCircuits();
      expect(circuits.length).toBeGreaterThanOrEqual(3);
      expect(circuits.some((c) => c.circuitId === 'circuit-confidence-range')).toBe(true);
      expect(circuits.some((c) => c.circuitId === 'circuit-authorized-region')).toBe(true);
    });

    it('should register custom zk circuit', () => {
      const custom = zkEngine.registerCircuit({
        circuitId: 'circuit-custom-entropy',
        name: 'Entropy Floor Proof',
        type: 'RANGE',
        description: 'Proves high entropy',
        publicParameters: { minThreshold: 128, maxThreshold: 256 },
      });

      expect(custom.circuitId).toBe('circuit-custom-entropy');
      expect(zkEngine.getCircuit('circuit-custom-entropy')).toBeDefined();
    });
  });

  describe('Zero-Knowledge Range Proofs', () => {
    it('should generate valid range proof without leaking exact private witness', () => {
      const privateConfidence = 0.97; // Secret observation value
      const proof = zkEngine.generateRangeProof('circuit-confidence-range', privateConfidence);

      expect(proof.proofId).toMatch(/^zkproof-/);
      expect(proof.commitment).toHaveLength(64);
      expect(proof.proofToken).toMatch(/^0x/);
      expect(proof.circuitType).toBe('RANGE');

      // Verify proof
      const verification = zkEngine.verifyProof(proof);
      expect(verification.valid).toBe(true);
      expect(verification.reason).toBeUndefined();
    });

    it('should reject range proof if witness is out of bounds', () => {
      expect(() => {
        zkEngine.generateRangeProof('circuit-confidence-range', 0.85); // 0.85 < 0.90
      }).toThrow(/falls outside range/);
    });
  });

  describe('Zero-Knowledge Membership Proofs', () => {
    it('should generate and verify jurisdiction set membership proof', () => {
      const secretDatacenter = 'eu-central-1';
      const proof = zkEngine.generateMembershipProof('circuit-authorized-region', secretDatacenter);

      expect(proof.circuitType).toBe('MEMBERSHIP');
      expect(proof.commitment).toHaveLength(64);

      const verification = zkEngine.verifyProof(proof);
      expect(verification.valid).toBe(true);
    });

    it('should reject membership proof if witness not in allowed set', () => {
      expect(() => {
        zkEngine.generateMembershipProof('circuit-authorized-region', 'ap-south-unauthorized');
      }).toThrow(/not a member/);
    });
  });

  describe('Proof Tamper Detection', () => {
    it('should detect tampered commitment or modified public inputs', () => {
      const proof = zkEngine.generateRangeProof('circuit-confidence-range', 0.95);

      // Tamper with commitment
      const tamperedProof = {
        ...proof,
        commitment: '0000000000000000000000000000000000000000000000000000000000000000',
      };

      const verification = zkEngine.verifyProof(tamperedProof);
      expect(verification.valid).toBe(false);
      expect(verification.reason).toContain('mismatch');
    });
  });
});
