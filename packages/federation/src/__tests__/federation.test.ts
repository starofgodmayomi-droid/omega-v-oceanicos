import { FederationMeshEngine } from '../index';
import { OceanicosClient } from '@omega-v/sdk';

describe('@omega-v/federation — FederationMeshEngine', () => {
  let mesh: FederationMeshEngine;
  let sdk: OceanicosClient;

  beforeEach(() => {
    mesh = new FederationMeshEngine('cluster-local-test');
    sdk = new OceanicosClient({ mode: 'local' });
  });

  describe('Peer Registration & Discovery', () => {
    it('should bootstrap canonical cluster peers', () => {
      const peers = mesh.getPeers();
      expect(peers.length).toBeGreaterThanOrEqual(2);
      expect(peers.some((p) => p.clusterName === 'Ω∞v-US-East-Primary')).toBe(true);
      expect(peers.some((p) => p.clusterName === 'Ω∞v-EU-Central-Primary')).toBe(true);
    });

    it('should register a new cluster peer node', () => {
      const customPeer = mesh.registerPeer({
        clusterName: 'Ω∞v-AP-Tokyo-Node',
        endpoint: 'https://ap-tokyo.omega-v.network',
        publicKey: '0x04c92847aefb374928174628a89f72b94e823c1',
        trustScore: 0.99,
      });

      expect(customPeer.nodeId).toMatch(/^node-/);
      expect(customPeer.status).toBe('PEERED');
      expect(mesh.getPeers().some((p) => p.clusterName === 'Ω∞v-AP-Tokyo-Node')).toBe(true);
    });
  });

  describe('Cross-Cluster Proof Export & Verification', () => {
    it('should export a cross-cluster proof from local verification result', async () => {
      const loopResult = await sdk.runLoop({
        claim: 'Cross-Cluster Inter-Mesh SLA Claim',
        category: 'mesh-verification',
        observedBy: 'cluster-local-observer',
      });

      const proof = mesh.exportProof(
        'Cross-Cluster Inter-Mesh SLA Claim',
        loopResult,
        'Ω∞v-EU-Central-Primary'
      );

      expect(proof.proofId).toMatch(/^proof-mesh-/);
      expect(proof.originCluster).toBe('cluster-local-test');
      expect(proof.targetCluster).toBe('Ω∞v-EU-Central-Primary');
      expect(proof.verificationMerkleRoot).toHaveLength(64);
      expect(proof.attestationSignature).toMatch(/^0x/);
      expect(proof.confidence).toBeGreaterThan(0);
    });

    it('should verify incoming valid remote cross-cluster proof', async () => {
      const loopResult = await sdk.runLoop({
        claim: 'Remote cluster claim',
        category: 'mesh-verification',
        observedBy: 'cluster-remote-observer',
      });

      const proof = mesh.exportProof('Remote cluster claim', loopResult);

      const verification = mesh.verifyRemoteProof(proof);
      expect(verification.valid).toBe(true);
      expect(verification.reasons).toHaveLength(0);
      expect(verification.originCluster).toBe('cluster-local-test');
    });

    it('should reject malformed remote proofs', () => {
      const verification = mesh.verifyRemoteProof({
        proofId: '',
        originCluster: '',
        targetCluster: '',
        claim: '',
        observationHash: '',
        verificationMerkleRoot: 'invalid',
        attestationSignature: 'invalid-sig-no-0x',
        confidence: 0.5,
        timestamp: new Date().toISOString(),
      });

      expect(verification.valid).toBe(false);
      expect(verification.reasons.length).toBeGreaterThan(0);
    });
  });

  describe('Mesh Summary & Proof History', () => {
    it('should return accurate mesh summary metrics', async () => {
      const loopResult = await sdk.runLoop({
        claim: 'Summary verification test',
      });

      mesh.exportProof('Summary verification test', loopResult);
      mesh.exportProof('Summary verification test 2', loopResult);

      const summary = mesh.getMeshSummary();
      expect(summary.totalPeers).toBeGreaterThanOrEqual(2);
      expect(summary.activePeers).toBeGreaterThanOrEqual(2);
      expect(summary.totalProofsExchanged).toBe(2);
      expect(summary.avgTrustScore).toBeGreaterThan(0);

      expect(mesh.getProofLedger()).toHaveLength(2);
    });
  });
});
