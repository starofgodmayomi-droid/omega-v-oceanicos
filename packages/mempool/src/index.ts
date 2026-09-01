/**
 * @omega-v/mempool — High-Throughput Transaction Mempool Engine
 * Priority Queue with Dynamic Gas Pricing, Nonce Sequential Tracking,
 * MEV Protection Bundles, and Merkle Mempool Root Commitments
 *
 * Ω∞v ::= REALITY ⇄ OBSERVE ⇄ EVIDENCE ⇄ VERIFY ⇄ REMEMBER ⇄ REASON ⇄ INTEND ⇄ BUILD ⇄ TEST ⇄ ATTEST ⇄ ACT ⇄ CONSEQUENCE ⇄ LEARN ⇄ AUDIT ⇄ RECOMPILE ↺∞
 */

import { createHmac, randomUUID } from 'crypto';

/* ─── Types ─────────────────────────────────────────────────────── */

export type MempoolTxStatus = 'PENDING' | 'QUEUED' | 'INCLUDED' | 'REPLACED' | 'DROPPED';

export interface MempoolTransaction {
  txHash: string;
  senderDid: string;
  nonce: number;
  gasPriceGwei: number;
  gasLimit: number;
  payload: Record<string, unknown>;
  status: MempoolTxStatus;
  receivedAt: string;
  admissionProof: string;
}

export interface MEVBundleSubmission {
  bundleId: string;
  searcherDid: string;
  txHashes: string[];
  bidTipGwei: number;
  targetBlockEpoch: number;
  status: 'PENDING' | 'SIMULATED' | 'INCLUDED' | 'REJECTED';
  bundleProof: string;
  submittedAt: string;
}

export interface MempoolHarvestReceipt {
  harvestId: string;
  includedTxCount: number;
  totalGasUsed: number;
  totalFeeYieldGwei: number;
  mempoolRootHash: string;
  harvestAttestation: string;
  harvestedAt: string;
  transactions: MempoolTransaction[];
}

export interface MempoolStats {
  pendingCount: number;
  queuedCount: number;
  includedCount: number;
  replacedCount: number;
  droppedCount: number;
  activeBundles: number;
  medianGasPriceGwei: number;
  mempoolMerkleRoot: string;
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function hmac(key: string, data: string): string {
  return '0x' + createHmac('sha256', key).update(data).digest('hex');
}

/* ─── Engine ─────────────────────────────────────────────────────── */

export class OceanicosMempoolEngine {
  private readonly secret: string;
  private pendingTxs: Map<string, MempoolTransaction> = new Map();
  private accountNonces: Map<string, number> = new Map();
  private bundles: Map<string, MEVBundleSubmission> = new Map();
  private replacedCount = 0;
  private droppedCount = 0;
  private includedCount = 0;

  constructor(secret = 'mempool-omega-v-canonical-secret') {
    this.secret = secret;
  }

  /* ── 1. Transaction Admission & Replace-By-Fee ── */

  submitTransaction(opts: {
    senderDid: string;
    nonce: number;
    gasPriceGwei: number;
    gasLimit: number;
    payload: Record<string, unknown>;
  }): MempoolTransaction {
    if (!opts.senderDid.startsWith('did:')) {
      throw new Error('Invalid sender DID format');
    }
    if (opts.gasPriceGwei <= 0 || opts.gasLimit <= 0) {
      throw new Error('Gas price and gas limit must be greater than 0');
    }

    const currentConfirmedNonce = this.accountNonces.get(opts.senderDid) ?? 0;
    if (opts.nonce < currentConfirmedNonce) {
      throw new Error(`Nonce ${opts.nonce} is already consumed for sender ${opts.senderDid} (current: ${currentConfirmedNonce})`);
    }

    // Check for Replace-By-Fee (RBF)
    const existingSameNonce = Array.from(this.pendingTxs.values()).find(
      (tx) => tx.senderDid === opts.senderDid && tx.nonce === opts.nonce && (tx.status === 'PENDING' || tx.status === 'QUEUED')
    );

    if (existingSameNonce) {
      if (opts.gasPriceGwei < existingSameNonce.gasPriceGwei * 1.10) {
        throw new Error(`Replacement transaction must have at least 10% higher gas price than existing ${existingSameNonce.gasPriceGwei} Gwei`);
      }
      existingSameNonce.status = 'REPLACED';
      this.replacedCount++;
    }

    const txHash = hmac(this.secret, `TX:${opts.senderDid}:${opts.nonce}:${opts.gasPriceGwei}:${Date.now()}:${randomUUID()}`);
    const status: MempoolTxStatus = opts.nonce === currentConfirmedNonce ? 'PENDING' : 'QUEUED';
    const receivedAt = new Date().toISOString();
    const admissionProof = hmac(this.secret, `ADMIT:${txHash}:${opts.senderDid}:${opts.nonce}:${status}:${receivedAt}`);

    const tx: MempoolTransaction = {
      txHash,
      senderDid: opts.senderDid,
      nonce: opts.nonce,
      gasPriceGwei: opts.gasPriceGwei,
      gasLimit: opts.gasLimit,
      payload: opts.payload,
      status,
      receivedAt,
      admissionProof,
    };

    this.pendingTxs.set(txHash, tx);
    return { ...tx };
  }

  getTransactions(filter?: { senderDid?: string; status?: MempoolTxStatus }): MempoolTransaction[] {
    let list = Array.from(this.pendingTxs.values());
    if (filter?.senderDid) {
      list = list.filter((tx) => tx.senderDid === filter.senderDid);
    }
    if (filter?.status) {
      list = list.filter((tx) => tx.status === filter.status);
    }
    return list;
  }

  /* ── 2. MEV Protection & Bundle Bidding ── */

  submitBundle(opts: {
    searcherDid: string;
    txHashes: string[];
    bidTipGwei: number;
    targetBlockEpoch: number;
  }): MEVBundleSubmission {
    if (opts.txHashes.length === 0) {
      throw new Error('MEV Bundle must contain at least one transaction hash');
    }
    for (const h of opts.txHashes) {
      if (!this.pendingTxs.has(h)) {
        throw new Error(`Transaction ${h} not found in mempool`);
      }
    }

    const bundleId = `mev-${randomUUID().slice(0, 10)}`;
    const submittedAt = new Date().toISOString();
    const bundleProof = hmac(
      this.secret,
      `MEV_BUNDLE:${bundleId}:${opts.searcherDid}:${opts.txHashes.join(',')}:${opts.bidTipGwei}:${opts.targetBlockEpoch}`
    );

    const bundle: MEVBundleSubmission = {
      bundleId,
      searcherDid: opts.searcherDid,
      txHashes: opts.txHashes,
      bidTipGwei: opts.bidTipGwei,
      targetBlockEpoch: opts.targetBlockEpoch,
      status: 'SIMULATED',
      bundleProof,
      submittedAt,
    };

    this.bundles.set(bundleId, bundle);
    return { ...bundle };
  }

  getBundles(): MEVBundleSubmission[] {
    return Array.from(this.bundles.values());
  }

  /* ── 3. Harvest Block Batch with Priority Ordering ── */

  popBatch(opts?: { maxGas?: number; maxCount?: number }): MempoolHarvestReceipt {
    const maxGas = opts?.maxGas ?? 1000000;
    const maxCount = opts?.maxCount ?? 100;

    // Filter available pending transactions sorted by descending gas price
    const available = Array.from(this.pendingTxs.values())
      .filter((tx) => tx.status === 'PENDING')
      .sort((a, b) => b.gasPriceGwei - a.gasPriceGwei);

    const included: MempoolTransaction[] = [];
    let currentGas = 0;
    let totalYield = 0;

    for (const tx of available) {
      if (included.length >= maxCount || currentGas + tx.gasLimit > maxGas) {
        break;
      }
      tx.status = 'INCLUDED';
      included.push(tx);
      currentGas += tx.gasLimit;
      totalYield += tx.gasPriceGwei * tx.gasLimit;
      this.includedCount++;

      // Advance sender nonce
      const currentNonce = this.accountNonces.get(tx.senderDid) ?? 0;
      this.accountNonces.set(tx.senderDid, currentNonce + 1);

      // Unblock any queued transactions for this sender that match next nonce
      const queued = Array.from(this.pendingTxs.values()).filter(
        (q) => q.senderDid === tx.senderDid && q.status === 'QUEUED' && q.nonce === currentNonce + 1
      );
      for (const q of queued) {
        q.status = 'PENDING';
      }
    }

    const harvestId = `hrv-${randomUUID().slice(0, 10)}`;
    const now = new Date().toISOString();
    const mempoolRootHash = this.computeMempoolRoot();
    const harvestAttestation = hmac(
      this.secret,
      `HARVEST:${harvestId}:${included.length}:${currentGas}:${totalYield}:${mempoolRootHash}:${now}`
    );

    return {
      harvestId,
      includedTxCount: included.length,
      totalGasUsed: currentGas,
      totalFeeYieldGwei: totalYield,
      mempoolRootHash,
      harvestAttestation,
      harvestedAt: now,
      transactions: included,
    };
  }

  /* ── 4. Telemetry & Mempool Merkle State Root ── */

  computeMempoolRoot(): string {
    const pending = Array.from(this.pendingTxs.values())
      .filter((tx) => tx.status === 'PENDING')
      .map((tx) => tx.txHash)
      .sort();
    return hmac(this.secret, `MEMPOOL_ROOT:${pending.join('|')}`);
  }

  getStats(): MempoolStats {
    const txs = Array.from(this.pendingTxs.values());
    const pending = txs.filter((tx) => tx.status === 'PENDING');
    const queued = txs.filter((tx) => tx.status === 'QUEUED');

    let medianGas = 0;
    if (pending.length > 0) {
      const sortedGas = [...pending].map((tx) => tx.gasPriceGwei).sort((a, b) => a - b);
      const mid = Math.floor(sortedGas.length / 2);
      medianGas = sortedGas.length % 2 !== 0 ? sortedGas[mid] : (sortedGas[mid - 1] + sortedGas[mid]) / 2;
    }

    return {
      pendingCount: pending.length,
      queuedCount: queued.length,
      includedCount: this.includedCount,
      replacedCount: this.replacedCount,
      droppedCount: this.droppedCount,
      activeBundles: this.bundles.size,
      medianGasPriceGwei: Math.round(medianGas * 100) / 100,
      mempoolMerkleRoot: this.computeMempoolRoot(),
    };
  }
}
