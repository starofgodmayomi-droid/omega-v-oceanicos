import crypto from 'crypto';

export type TxMempoolStatus = 'PENDING' | 'ORDERED' | 'EXECUTED' | 'EXPIRED';

export interface EncryptedMempoolTx {
  txHash: string;
  senderDid: string;
  encryptedPayload: string;
  ephemeralPublicKey: string;
  gasLimit: number;
  receivedTimestamp: number;
  fairSequenceNumber?: number;
  status: TxMempoolStatus;
}

export interface VDFProof {
  challenge: string;
  iterations: number;
  output: string;
  proof: string;
  computedAt: string;
}

export interface SequencerBatchReceipt {
  batchNumber: number;
  txCount: number;
  transactionsRoot: string;
  stateDeltaRoot: string;
  vdfProof: VDFProof;
  sequencerSignature: string;
  timestamp: string;
  orderedTxHashes: string[];
}

export interface SequencerStats {
  totalMempoolTxs: number;
  pendingMempoolTxs: number;
  totalBatchesSealed: number;
  avgBatchSize: number;
  latestBatchNumber: number;
  vdfIterationsDifficulty: number;
}

export class OceanicosSequencerEngine {
  private mempool: Map<string, EncryptedMempoolTx> = new Map();
  private batches: SequencerBatchReceipt[] = [];
  private signingKey: string;
  private currentSequenceNumber: number = 1;
  private vdfDifficulty: number;

  constructor(signingKey = 'omega-v-sequencer-secret-key', vdfDifficulty = 1000) {
    this.signingKey = signingKey;
    this.vdfDifficulty = vdfDifficulty;
  }

  public submitEncryptedTx(spec: {
    senderDid: string;
    encryptedPayload: string;
    ephemeralPublicKey?: string;
    gasLimit?: number;
  }): EncryptedMempoolTx {
    const receivedTimestamp = Date.now();
    const ephemeralKey = spec.ephemeralPublicKey || '0x' + crypto.randomBytes(32).toString('hex');
    const gasLimit = spec.gasLimit || 100000;

    const txHash = '0x' + crypto.createHash('sha256')
      .update(`${spec.senderDid}:${spec.encryptedPayload}:${ephemeralKey}:${receivedTimestamp}`)
      .digest('hex');

    const tx: EncryptedMempoolTx = {
      txHash,
      senderDid: spec.senderDid,
      encryptedPayload: spec.encryptedPayload,
      ephemeralPublicKey: ephemeralKey,
      gasLimit,
      receivedTimestamp,
      status: 'PENDING',
    };

    this.mempool.set(txHash, tx);
    return tx;
  }

  public computeVDF(challenge: string, iterations: number = this.vdfDifficulty): VDFProof {
    let current = challenge;
    // Sequential hashing (inherently non-parallelizable)
    for (let i = 0; i < iterations; i++) {
      current = crypto.createHash('sha256').update(current).digest('hex');
    }

    const proof = '0x' + crypto.createHmac('sha256', this.signingKey)
      .update(`VDF_PROOF:${challenge}:${iterations}:${current}`)
      .digest('hex');

    return {
      challenge,
      iterations,
      output: '0x' + current,
      proof,
      computedAt: new Date().toISOString(),
    };
  }

  public verifyVDF(vdf: VDFProof): boolean {
    const expectedProof = '0x' + crypto.createHmac('sha256', this.signingKey)
      .update(`VDF_PROOF:${vdf.challenge}:${vdf.iterations}:${vdf.output.replace(/^0x/, '')}`)
      .digest('hex');

    return vdf.proof === expectedProof;
  }

  public sealBatch(maxTxs: number = 50): SequencerBatchReceipt {
    const pendingTxs = Array.from(this.mempool.values())
      .filter((t) => t.status === 'PENDING')
      .sort((a, b) => a.receivedTimestamp - b.receivedTimestamp) // Deterministic Arrival-Time Fair Ordering
      .slice(0, maxTxs);

    const batchNumber = this.batches.length + 1;
    const challenge = `BATCH_CHALLENGE_${batchNumber}_${Date.now()}`;
    const vdfProof = this.computeVDF(challenge, this.vdfDifficulty);

    const orderedHashes: string[] = [];
    for (const tx of pendingTxs) {
      tx.fairSequenceNumber = this.currentSequenceNumber++;
      tx.status = 'ORDERED';
      orderedHashes.push(tx.txHash);
    }

    // Compute Transactions Root
    const txRoot = '0x' + crypto.createHash('sha256')
      .update(orderedHashes.join('|') || 'EMPTY_BATCH')
      .digest('hex');

    // Compute State Delta Root
    const stateDeltaRoot = '0x' + crypto.createHash('sha256')
      .update(`${batchNumber}:${txRoot}:${vdfProof.output}`)
      .digest('hex');

    const timestamp = new Date().toISOString();
    const sigPayload = `${batchNumber}:${orderedHashes.length}:${txRoot}:${stateDeltaRoot}:${vdfProof.output}:${timestamp}`;
    const sequencerSignature = '0x' + crypto.createHmac('sha256', this.signingKey)
      .update(sigPayload)
      .digest('hex');

    const receipt: SequencerBatchReceipt = {
      batchNumber,
      txCount: orderedHashes.length,
      transactionsRoot: txRoot,
      stateDeltaRoot,
      vdfProof,
      sequencerSignature,
      timestamp,
      orderedTxHashes: orderedHashes,
    };

    this.batches.push(receipt);
    return receipt;
  }

  public verifyBatchReceipt(receipt: SequencerBatchReceipt): { valid: boolean; batchNumber: number } {
    if (!this.verifyVDF(receipt.vdfProof)) {
      return { valid: false, batchNumber: receipt.batchNumber };
    }

    const sigPayload = `${receipt.batchNumber}:${receipt.txCount}:${receipt.transactionsRoot}:${receipt.stateDeltaRoot}:${receipt.vdfProof.output}:${receipt.timestamp}`;
    const expectedSig = '0x' + crypto.createHmac('sha256', this.signingKey)
      .update(sigPayload)
      .digest('hex');

    return {
      valid: receipt.sequencerSignature === expectedSig,
      batchNumber: receipt.batchNumber,
    };
  }

  public getMempool(): EncryptedMempoolTx[] {
    return Array.from(this.mempool.values());
  }

  public getBatches(): SequencerBatchReceipt[] {
    return this.batches;
  }

  public getStats(): SequencerStats {
    const all = Array.from(this.mempool.values());
    const pending = all.filter((t) => t.status === 'PENDING');
    const totalBatches = this.batches.length;
    const totalTxsInBatches = this.batches.reduce((sum, b) => sum + b.txCount, 0);

    return {
      totalMempoolTxs: all.length,
      pendingMempoolTxs: pending.length,
      totalBatchesSealed: totalBatches,
      avgBatchSize: totalBatches > 0 ? Math.round((totalTxsInBatches / totalBatches) * 10) / 10 : 0,
      latestBatchNumber: this.batches[this.batches.length - 1]?.batchNumber ?? 0,
      vdfIterationsDifficulty: this.vdfDifficulty,
    };
  }
}

export default OceanicosSequencerEngine;
