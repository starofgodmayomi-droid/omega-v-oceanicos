import * as crypto from 'crypto';
import { Attestation } from '@omega-v/types';

export interface AuditPathStep {
  position: 'left' | 'right';
  hash: string;
}

export interface MerkleInclusionProof {
  leafHash: string;
  leafIndex: number;
  treeSize: number;
  merkleRoot: string;
  auditPath: AuditPathStep[];
}

export interface NotarizationSeal {
  sealId: string;
  treeHeight: number;
  leafIndex: number;
  leafHash: string;
  merkleRoot: string;
  timestamp: string;
  notarySignature: string;
}

export interface NotarySummary {
  treeSize: number;
  merkleRoot: string;
  totalSeals: number;
  lastNotarizedAt: string;
}

/**
 * OceanicosNotaryEngine: RFC-6962 compliant Merkle Transparency Log,
 * Cryptographic Timestamp Notarization & Inclusion Proof Engine.
 *
 * ```
 * 💧 Ω∞v ::= Attestation ⇄ RFC-6962 Merkle Tree ⇄ Inclusion Proof ⇄ Notarization Seal
 * ```
 */
export class OceanicosNotaryEngine {
  private leaves: string[] = [];
  private seals: Map<string, NotarizationSeal> = new Map();
  private notarySecret: string;

  constructor(secret?: string) {
    this.notarySecret = secret || 'Ω∞v-NOTARY-TRANSPARENCY-LOG-SECRET-KEY-v1';
    this.bootstrapGenesisLeaf();
  }

  private bootstrapGenesisLeaf(): void {
    const genesisData = JSON.stringify({
      genesis: '💧 Ω∞v Oceanicos Merkle Transparency Root',
      epoch: 0,
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    this.anchorLeaf(genesisData);
  }

  /**
   * RFC 6962 Leaf Hashing: SHA-256(0x00 || data)
   */
  public hashLeaf(data: string): string {
    const prefix = Buffer.from([0x00]);
    const payload = Buffer.from(data, 'utf8');
    return crypto
      .createHash('sha256')
      .update(Buffer.concat([prefix, payload]))
      .digest('hex');
  }

  /**
   * RFC 6962 Internal Node Hashing: SHA-256(0x01 || left || right)
   */
  public hashNode(left: string, right: string): string {
    const prefix = Buffer.from([0x01]);
    const payload = Buffer.concat([prefix, Buffer.from(left, 'hex'), Buffer.from(right, 'hex')]);
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Anchor arbitrary data as a new leaf in the Merkle Transparency Tree
   */
  public anchorLeaf(data: string): NotarizationSeal {
    const leafHash = this.hashLeaf(data);
    const leafIndex = this.leaves.length;
    this.leaves.push(leafHash);

    const merkleRoot = this.computeMerkleRoot(this.leaves);
    const timestamp = new Date().toISOString();
    const sealId = `seal-${Date.now()}-${leafHash.slice(0, 8)}`;

    const notarySignature = crypto
      .createHmac('sha256', this.notarySecret)
      .update(`${sealId}:${leafIndex}:${leafHash}:${merkleRoot}:${timestamp}`)
      .digest('hex');

    const seal: NotarizationSeal = {
      sealId,
      treeHeight: Math.ceil(Math.log2(this.leaves.length || 1)),
      leafIndex,
      leafHash,
      merkleRoot,
      timestamp,
      notarySignature: `0x${notarySignature}`,
    };

    this.seals.set(seal.sealId, seal);
    return seal;
  }

  /**
   * Anchor a verification attestation into the Merkle transparency log
   */
  public anchorAttestation(
    attestation:
      Attestation | { signature: string; timestamp?: string; attestedAt?: string; claim?: string }
  ): NotarizationSeal {
    const timestamp =
      (attestation as any).attestedAt || (attestation as any).timestamp || new Date().toISOString();
    const data = JSON.stringify({
      signature: attestation.signature,
      timestamp,
      claim: (attestation as any).claim || 'Ω∞v Verification Attestation',
    });
    return this.anchorLeaf(data);
  }

  /**
   * Compute the root hash of a list of leaves
   */
  private computeMerkleRoot(leafHashes: string[]): string {
    if (leafHashes.length === 0) {
      return crypto.createHash('sha256').update('').digest('hex');
    }
    if (leafHashes.length === 1) {
      return leafHashes[0];
    }

    let currentLevel = [...leafHashes];
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          nextLevel.push(this.hashNode(currentLevel[i], currentLevel[i + 1]));
        } else {
          // Odd leaf is promoted to next level (RFC 6962)
          nextLevel.push(currentLevel[i]);
        }
      }
      currentLevel = nextLevel;
    }

    return currentLevel[0];
  }

  /**
   * Get current Merkle Transparency Tree root
   */
  public getMerkleRoot(): string {
    return this.computeMerkleRoot(this.leaves);
  }

  /**
   * Get current number of leaves in tree
   */
  public getTreeSize(): number {
    return this.leaves.length;
  }

  /**
   * Generate an RFC-6962 Merkle Inclusion Proof for a specific leaf index
   */
  public generateInclusionProof(leafIndex: number): MerkleInclusionProof {
    if (leafIndex < 0 || leafIndex >= this.leaves.length) {
      throw new Error(`Leaf index ${leafIndex} out of bounds [0, ${this.leaves.length - 1}]`);
    }

    const auditPath: AuditPathStep[] = [];
    let currentLevel = [...this.leaves];
    let currentIndex = leafIndex;

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          if (i === currentIndex) {
            auditPath.push({ position: 'right', hash: currentLevel[i + 1] });
          } else if (i + 1 === currentIndex) {
            auditPath.push({ position: 'left', hash: currentLevel[i] });
          }
          nextLevel.push(this.hashNode(currentLevel[i], currentLevel[i + 1]));
        } else {
          nextLevel.push(currentLevel[i]);
        }
      }
      currentIndex = Math.floor(currentIndex / 2);
      currentLevel = nextLevel;
    }

    return {
      leafHash: this.leaves[leafIndex],
      leafIndex,
      treeSize: this.leaves.length,
      merkleRoot: this.getMerkleRoot(),
      auditPath,
    };
  }

  /**
   * Verify an RFC-6962 Merkle Inclusion Proof
   */
  public verifyInclusionProof(proof: MerkleInclusionProof): boolean {
    let currentHash = proof.leafHash;

    for (const step of proof.auditPath) {
      if (step.position === 'left') {
        currentHash = this.hashNode(step.hash, currentHash);
      } else {
        currentHash = this.hashNode(currentHash, step.hash);
      }
    }

    return currentHash === proof.merkleRoot;
  }

  /**
   * Get all notarization seals
   */
  public getAllSeals(): NotarizationSeal[] {
    return Array.from(this.seals.values());
  }

  /**
   * Get notary status summary
   */
  public getSummary(): NotarySummary {
    const seals = this.getAllSeals();
    const lastSeal = seals[seals.length - 1];

    return {
      treeSize: this.leaves.length,
      merkleRoot: this.getMerkleRoot(),
      totalSeals: seals.length,
      lastNotarizedAt: lastSeal ? lastSeal.timestamp : new Date().toISOString(),
    };
  }
}

export default OceanicosNotaryEngine;
