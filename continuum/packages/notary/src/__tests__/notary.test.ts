import { OceanicosNotaryEngine } from '../index';
import { OceanicosClient } from '@omega-v/sdk';

describe('@omega-v/notary — OceanicosNotaryEngine', () => {
  let notary: OceanicosNotaryEngine;
  let client: OceanicosClient;

  beforeEach(() => {
    notary = new OceanicosNotaryEngine('test-secret-key-123');
    client = new OceanicosClient({ mode: 'local' });
  });

  describe('Merkle Tree Anchoring & Sealing', () => {
    it('should bootstrap with genesis leaf and calculate valid Merkle root', () => {
      expect(notary.getTreeSize()).toBe(1);
      const root = notary.getMerkleRoot();
      expect(root).toHaveLength(64);
    });

    it('should anchor verification attestation into the Merkle tree', async () => {
      const loopResult = await client.runLoop({
        claim: 'Notary Merkle Anchor Verification Claim',
      });

      const seal = notary.anchorAttestation(loopResult.attestation);

      expect(seal.sealId).toMatch(/^seal-/);
      expect(seal.leafIndex).toBe(1);
      expect(seal.leafHash).toHaveLength(64);
      expect(seal.merkleRoot).toHaveLength(64);
      expect(seal.notarySignature).toMatch(/^0x/);
      expect(notary.getTreeSize()).toBe(2);
    });

    it('should anchor multiple leaves and update Merkle root deterministically', () => {
      notary.anchorLeaf('Evidence Payload 1');
      notary.anchorLeaf('Evidence Payload 2');
      notary.anchorLeaf('Evidence Payload 3');

      expect(notary.getTreeSize()).toBe(4);
      const root = notary.getMerkleRoot();
      expect(root).toHaveLength(64);
    });
  });

  describe('RFC-6962 Merkle Inclusion Proofs', () => {
    it('should generate and verify valid inclusion proof for all leaves', () => {
      for (let i = 0; i < 7; i++) {
        notary.anchorLeaf(`Leaf item #${i}`);
      }

      const totalLeaves = notary.getTreeSize();
      for (let idx = 0; idx < totalLeaves; idx++) {
        const proof = notary.generateInclusionProof(idx);
        expect(proof.leafIndex).toBe(idx);
        expect(proof.treeSize).toBe(totalLeaves);
        expect(proof.merkleRoot).toBe(notary.getMerkleRoot());

        const isValid = notary.verifyInclusionProof(proof);
        expect(isValid).toBe(true);
      }
    });

    it('should reject tampered inclusion proof', () => {
      notary.anchorLeaf('Payload Alpha');
      notary.anchorLeaf('Payload Beta');

      const proof = notary.generateInclusionProof(1);
      const tamperedProof = {
        ...proof,
        leafHash: '0000000000000000000000000000000000000000000000000000000000000000',
      };

      const isValid = notary.verifyInclusionProof(tamperedProof);
      expect(isValid).toBe(false);
    });
  });

  describe('Notary Summary & Seal History', () => {
    it('should return complete notary summary and all seals', () => {
      notary.anchorLeaf('Seal Test A');
      notary.anchorLeaf('Seal Test B');

      const summary = notary.getSummary();
      expect(summary.totalSeals).toBe(3); // 1 genesis + 2 custom
      expect(summary.treeSize).toBe(3);
      expect(summary.merkleRoot).toBe(notary.getMerkleRoot());

      const allSeals = notary.getAllSeals();
      expect(allSeals).toHaveLength(3);
    });
  });
});
