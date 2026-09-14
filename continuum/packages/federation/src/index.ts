import { FullLoopResult } from '@omega-v/sdk';
import * as crypto from 'crypto';

export type PeerStatus = 'ONLINE' | 'PEERED' | 'UNREACHABLE' | 'REVOKED';

export interface FederatedMeshNode {
  nodeId: string;
  clusterName: string;
  endpoint: string;
  publicKey: string;
  trustScore: number; // 0.0 to 1.0
  status: PeerStatus;
  lastSeen: string;
}

export interface CrossClusterProof {
  proofId: string;
  originCluster: string;
  targetCluster: string;
  claim: string;
  observationHash: string;
  verificationMerkleRoot: string;
  attestationSignature: string;
  confidence: number;
  timestamp: string;
}

export interface RemoteProofVerificationResult {
  valid: boolean;
  trustScore: number;
  originCluster: string;
  verifiedAt: string;
  reasons: string[];
}

export interface MeshSummary {
  clusterId: string;
  totalPeers: number;
  activePeers: number;
  totalProofsExchanged: number;
  avgTrustScore: number;
}

/**
 * FederationMeshEngine: Cross-Cluster Verification Proof Federation Protocol
 * for interconnecting distributed verification meshes across sovereign clusters.
 *
 * ```
 * 💧 Ω∞v ::= Cluster_A(Proof) ⇄ Merkle Attestation ⇄ Federation Mesh ⇄ Cluster_B(Trust)
 * ```
 */
export class FederationMeshEngine {
  private clusterId: string;
  private peers: Map<string, FederatedMeshNode> = new Map();
  private proofLedger: Map<string, CrossClusterProof> = new Map();

  constructor(clusterId?: string) {
    this.clusterId = clusterId || `cluster-${crypto.randomBytes(4).toString('hex')}`;
    this.bootstrapCanonicalPeers();
  }

  private bootstrapCanonicalPeers(): void {
    this.registerPeer({
      clusterName: 'Ω∞v-US-East-Primary',
      endpoint: 'https://useast.omega-v.network',
      publicKey: '0x04a89f72b94e823c10928374aefb374928174628',
    });
    this.registerPeer({
      clusterName: 'Ω∞v-EU-Central-Primary',
      endpoint: 'https://eucentral.omega-v.network',
      publicKey: '0x04b918274aefb374928174628a89f72b94e823c1',
    });
  }

  /**
   * Register a remote cluster peer in the verification mesh
   */
  public registerPeer(node: {
    clusterName: string;
    endpoint: string;
    publicKey: string;
    nodeId?: string;
    trustScore?: number;
  }): FederatedMeshNode {
    const nodeId = node.nodeId || `node-${crypto.randomBytes(6).toString('hex')}`;
    const peer: FederatedMeshNode = {
      nodeId,
      clusterName: node.clusterName,
      endpoint: node.endpoint,
      publicKey: node.publicKey,
      trustScore: node.trustScore ?? 0.95,
      status: 'PEERED',
      lastSeen: new Date().toISOString(),
    };

    this.peers.set(peer.nodeId, peer);
    this.peers.set(peer.clusterName, peer);
    return peer;
  }

  /**
   * Export a cross-cluster verification proof from a local loop execution
   */
  public exportProof(
    claim: string,
    result: FullLoopResult,
    targetCluster: string = 'global-mesh'
  ): CrossClusterProof {
    const proofId = `proof-mesh-${crypto.randomBytes(8).toString('hex')}`;
    const observationHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(result.observation))
      .digest('hex');

    const verificationMerkleRoot = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          passed: result.verification.summary.passed,
          rulesPassed: result.verification.summary.rulesPassed,
          evidence: result.verification.evidencePath,
        })
      )
      .digest('hex');

    const proof: CrossClusterProof = {
      proofId,
      originCluster: this.clusterId,
      targetCluster,
      claim,
      observationHash,
      verificationMerkleRoot,
      attestationSignature: result.attestation.signature,
      confidence: result.observation.confidence,
      timestamp: new Date().toISOString(),
    };

    this.proofLedger.set(proof.proofId, proof);
    return proof;
  }

  /**
   * Verify an incoming remote proof from a federated cluster
   */
  public verifyRemoteProof(proof: CrossClusterProof): RemoteProofVerificationResult {
    const reasons: string[] = [];
    let valid = true;

    if (!proof.proofId || !proof.originCluster || !proof.attestationSignature) {
      return {
        valid: false,
        trustScore: 0,
        originCluster: proof.originCluster || 'UNKNOWN',
        verifiedAt: new Date().toISOString(),
        reasons: ['Malformed cross-cluster proof structure'],
      };
    }

    // Check if origin cluster is a known peer
    const peer = this.peers.get(proof.originCluster);
    const trustScore = peer ? peer.trustScore : 0.5; // fallback trust for unindexed mesh peers

    if (proof.confidence < 0.8) {
      reasons.push('Remote proof confidence score is below required threshold (0.8)');
    }

    if (!proof.verificationMerkleRoot || proof.verificationMerkleRoot.length !== 64) {
      valid = false;
      reasons.push('Invalid verification Merkle root format');
    }

    if (!proof.attestationSignature.startsWith('0x')) {
      valid = false;
      reasons.push('Invalid cryptographic attestation signature header');
    }

    // Record proof in local federation cache
    this.proofLedger.set(proof.proofId, proof);

    return {
      valid,
      trustScore,
      originCluster: proof.originCluster,
      verifiedAt: new Date().toISOString(),
      reasons,
    };
  }

  /**
   * Get all registered peers
   */
  public getPeers(): FederatedMeshNode[] {
    const unique = new Map<string, FederatedMeshNode>();
    for (const peer of this.peers.values()) {
      unique.set(peer.nodeId, peer);
    }
    return Array.from(unique.values());
  }

  /**
   * Get proof ledger history
   */
  public getProofLedger(): CrossClusterProof[] {
    return Array.from(this.proofLedger.values());
  }

  /**
   * Get overall mesh summary statistics
   */
  public getMeshSummary(): MeshSummary {
    const peers = this.getPeers();
    const activePeers = peers.filter((p) => p.status === 'PEERED' || p.status === 'ONLINE').length;
    const avgTrustScore =
      peers.length > 0 ? peers.reduce((acc, p) => acc + p.trustScore, 0) / peers.length : 1.0;

    return {
      clusterId: this.clusterId,
      totalPeers: peers.length,
      activePeers,
      totalProofsExchanged: this.proofLedger.size,
      avgTrustScore: Number(avgTrustScore.toFixed(2)),
    };
  }
}

export default FederationMeshEngine;
