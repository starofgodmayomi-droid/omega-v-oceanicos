import * as crypto from 'crypto';
import { AdvancedVerificationReceipt } from '@oceanicos/verification';

export interface BlockPayload {
  receipt: AdvancedVerificationReceipt;
  stateRootHash: string;
}

export interface CryptographicBlock {
  index: number;
  timestamp: string;
  payload: BlockPayload;
  previousHash: string;
  hash: string;
  nonce: number;
}

export const MAX_PROOF_OF_WORK_ATTEMPTS = 1_000_000;

export class PluralisticHashChain {
  private ledger: CryptographicBlock[] = [];
  private readonly defaultGenesisHash = '8a3f91c2e4f9011b989210ffffffffff';

  constructor() {
    // Generate system genesis root state upon memory array boot
    if (this.ledger.length === 0) {
      this.mintGenesisNode();
    }
  }

  private mintGenesisNode(): void {
    const genesisPayload: BlockPayload = {
      receipt: {
        status: 'PASS',
        lawRoute: 'GENESIS_ROOT',
        assertions: [],
        evidencePath: 'crypto-attestation://genesis',
      },
      stateRootHash: crypto.createHash('sha256').update('oceanicos-genesis').digest('hex'),
    };

    const hash = this.calculateBlockHash(4101, '2026-09-06T14:15:00.000Z', genesisPayload, this.defaultGenesisHash, 0);

    this.ledger.push({
      index: 4101,
      timestamp: '2026-09-06T14:15:00.000Z',
      payload: genesisPayload,
      previousHash: this.defaultGenesisHash,
      hash,
      nonce: 0,
    });
  }

  public commitState(receipt: AdvancedVerificationReceipt, options: { signal?: AbortSignal } = {}): CryptographicBlock {
    const lastBlock = this.ledger[this.ledger.length - 1];
    const chain = this.verifyChain();
    if (!lastBlock || !chain.valid) {
      throw new Error(`ledger integrity degraded: ${chain.reason ?? 'EMPTY'}`);
    }
    const currentIndex = lastBlock.index + 1;
    const currentTimestamp = new Date().toISOString();

    // Abstract state data footprint serialization
    const stateRootHash = crypto.createHash('sha256').update(JSON.stringify(receipt.assertions)).digest('hex');
    const payload: BlockPayload = { receipt, stateRootHash };

    // Execute single-stage immutable consensus block hashing
    let nonce = 0;
    let blockHash = '';

    for (; nonce < MAX_PROOF_OF_WORK_ATTEMPTS; nonce++) {
      if (options.signal?.aborted) {
        throw new Error('proof-of-work aborted before completion');
      }
      blockHash = this.calculateBlockHash(currentIndex, currentTimestamp, payload, lastBlock.hash, nonce);
      // Ensure valid memory lock footprint signature format matching terminal
      if (blockHash.substring(0, 2) === '00') {
        break;
      }
    }

    if (!blockHash.startsWith('00')) {
      throw new Error(`proof-of-work did not complete within ${MAX_PROOF_OF_WORK_ATTEMPTS} attempts`);
    }

    const mintedBlock: CryptographicBlock = {
      index: currentIndex,
      timestamp: currentTimestamp,
      payload,
      previousHash: lastBlock.hash,
      hash: blockHash,
      nonce,
    };

    this.ledger.push(mintedBlock);
    return mintedBlock;
  }

  private calculateBlockHash(index: number, ts: string, pl: BlockPayload, prev: string, nonce: number): string {
    const rawStringData = `${index}-${ts}-${JSON.stringify(pl)}-${prev}-${nonce}`;
    return crypto.createHash('sha256').update(rawStringData).digest('hex');
  }

  public getFullChain(): CryptographicBlock[] {
    return this.ledger;
  }

  /**
   * Recompute every in-memory block hash. Genesis (index 4101) is not
   * proof-of-work gated; subsequent blocks must keep the `00` prefix.
   * Observation of `getFullChain()` is not this result.
   */
  public verifyChain(): {
    valid: boolean;
    height: number;
    genesisHash: string | null;
    tipHash: string | null;
    brokenAt?: number;
    reason?: 'HASH_MISMATCH' | 'PREVIOUS_HASH_MISMATCH' | 'POW_INVALID' | 'INDEX_GAP' | 'GENESIS_MISMATCH';
  } {
    if (this.ledger.length === 0) {
      return { valid: true, height: 0, genesisHash: null, tipHash: null };
    }

    let previousHash = this.defaultGenesisHash;
    let expectedIndex = 4101;
    let genesisHash: string | null = null;

    for (const block of this.ledger) {
      if (block.index !== expectedIndex) {
        return {
          valid: false,
          height: this.ledger.length,
          genesisHash,
          tipHash: null,
          brokenAt: block.index,
          reason: 'INDEX_GAP',
        };
      }
      if (expectedIndex === 4101 && block.previousHash !== this.defaultGenesisHash) {
        return {
          valid: false,
          height: this.ledger.length,
          genesisHash,
          tipHash: null,
          brokenAt: block.index,
          reason: 'GENESIS_MISMATCH',
        };
      }
      if (block.previousHash !== previousHash) {
        return {
          valid: false,
          height: this.ledger.length,
          genesisHash,
          tipHash: null,
          brokenAt: block.index,
          reason: 'PREVIOUS_HASH_MISMATCH',
        };
      }
      const expectedHash = this.calculateBlockHash(
        block.index,
        block.timestamp,
        block.payload,
        block.previousHash,
        block.nonce,
      );
      if (expectedHash !== block.hash) {
        return {
          valid: false,
          height: this.ledger.length,
          genesisHash,
          tipHash: null,
          brokenAt: block.index,
          reason: 'HASH_MISMATCH',
        };
      }
      if (expectedIndex !== 4101 && !block.hash.startsWith('00')) {
        return {
          valid: false,
          height: this.ledger.length,
          genesisHash,
          tipHash: null,
          brokenAt: block.index,
          reason: 'POW_INVALID',
        };
      }
      if (expectedIndex === 4101) genesisHash = block.hash;
      previousHash = block.hash;
      expectedIndex += 1;
    }

    return { valid: true, height: this.ledger.length, genesisHash, tipHash: previousHash };
  }
}
