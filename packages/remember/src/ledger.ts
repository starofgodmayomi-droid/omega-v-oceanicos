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

  public commitState(receipt: AdvancedVerificationReceipt): CryptographicBlock {
    const lastBlock = this.ledger[this.ledger.length - 1];
    const currentIndex = lastBlock.index + 1;
    const currentTimestamp = new Date().toISOString();

    // Abstract state data footprint serialization
    const stateRootHash = crypto.createHash('sha256').update(JSON.stringify(receipt.assertions)).digest('hex');
    const payload: BlockPayload = { receipt, stateRootHash };

    // Execute single-stage immutable consensus block hashing
    let nonce = 0;
    let blockHash = '';

    while (true) {
      blockHash = this.calculateBlockHash(currentIndex, currentTimestamp, payload, lastBlock.hash, nonce);
      // Ensure valid memory lock footprint signature format matching terminal
      if (blockHash.substring(0, 2) === '00') {
        break;
      }
      nonce++;
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
}
