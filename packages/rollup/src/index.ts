import crypto from 'crypto';

export type RollupType = 'OPTIMISTIC' | 'VALIDITY_ZK';
export type RollupBlockStatus = 'PROPOSED' | 'COMMITTED_L1' | 'CHALLENGED' | 'FINALIZED' | 'REVERTED';

export interface L2Account {
  address: string;
  nonce: number;
  balance: number;
  storageRoot: string;
}

export interface L2Transaction {
  txHash: string;
  from: string;
  to: string;
  value: number;
  nonce: number;
  calldata: string;
  signature: string;
  status: 'PENDING' | 'EXECUTED' | 'FAILED';
  blockHeight?: number;
}

export interface RollupBlock {
  blockHeight: number;
  rollupType: RollupType;
  txCount: number;
  txHashes: string[];
  preStateRoot: string;
  postStateRoot: string;
  batchCommitment: string;
  l1TxHash?: string;
  status: RollupBlockStatus;
  proposerDid: string;
  proposedAt: string;
  finalizedAt?: string;
  challengeWindowEndsAt?: string;
}

export interface RollupChallenge {
  challengeId: string;
  blockHeight: number;
  challengerDid: string;
  disputedPostStateRoot: string;
  status: 'OPEN' | 'SLASHED_SEQUENCER' | 'REJECTED_CHALLENGER';
  resolvedAt?: string;
}

export interface RollupStats {
  totalBlocks: number;
  finalizedBlocks: number;
  totalL2Transactions: number;
  activeAccounts: number;
  totalL2ValueLocked: number;
  openChallenges: number;
  latestPreStateRoot: string;
  latestPostStateRoot: string;
}

export class OceanicosRollupEngine {
  private accounts: Map<string, L2Account> = new Map();
  private pendingTxs: L2Transaction[] = [];
  private blocks: RollupBlock[] = [];
  private challenges: Map<string, RollupChallenge> = new Map();
  private currentStateRoot: string;
  private signingKey: string;

  constructor(signingKey = 'omega-v-rollup-key') {
    this.signingKey = signingKey;
    this.currentStateRoot = '0x' + crypto.createHash('sha256').update('GENESIS_L2_STATE').digest('hex');

    // Seed default L2 accounts
    this.accounts.set('0xAlice', { address: '0xAlice', nonce: 0, balance: 100000, storageRoot: '0x0' });
    this.accounts.set('0xBob', { address: '0xBob', nonce: 0, balance: 50000, storageRoot: '0x0' });
  }

  public getAccount(address: string): L2Account {
    let acc = this.accounts.get(address);
    if (!acc) {
      acc = { address, nonce: 0, balance: 0, storageRoot: '0x0' };
      this.accounts.set(address, acc);
    }
    return acc;
  }

  public submitL2Transaction(spec: {
    from: string;
    to: string;
    value: number;
    calldata?: string;
    signature?: string;
  }): L2Transaction {
    const sender = this.getAccount(spec.from);
    if (sender.balance < spec.value) {
      throw new Error(`Insufficient L2 balance for ${spec.from}: has ${sender.balance}, needs ${spec.value}`);
    }

    const nonce = sender.nonce;
    const calldata = spec.calldata || '0x';
    const sig = spec.signature || '0x' + crypto.createHmac('sha256', this.signingKey).update(`${spec.from}:${spec.to}:${spec.value}:${nonce}`).digest('hex');

    const txHash = '0x' + crypto.createHash('sha256')
      .update(`${spec.from}:${spec.to}:${spec.value}:${nonce}:${calldata}:${Date.now()}`)
      .digest('hex');

    const tx: L2Transaction = {
      txHash,
      from: spec.from,
      to: spec.to,
      value: spec.value,
      nonce,
      calldata,
      signature: sig,
      status: 'PENDING',
    };

    this.pendingTxs.push(tx);
    return tx;
  }

  public produceBlock(spec: {
    proposerDid: string;
    rollupType?: RollupType;
    maxTxs?: number;
  }): RollupBlock {
    const rollupType = spec.rollupType || 'OPTIMISTIC';
    const maxTxs = spec.maxTxs || 20;
    const txsToInclude = this.pendingTxs.splice(0, maxTxs);

    const preStateRoot = this.currentStateRoot;
    const blockHeight = this.blocks.length + 1;
    const executedTxHashes: string[] = [];

    // Apply state transitions
    for (const tx of txsToInclude) {
      const sender = this.getAccount(tx.from);
      const recipient = this.getAccount(tx.to);

      sender.balance -= tx.value;
      sender.nonce += 1;
      recipient.balance += tx.value;

      tx.status = 'EXECUTED';
      tx.blockHeight = blockHeight;
      executedTxHashes.push(tx.txHash);
    }

    // Compute new post-state root
    const stateRepresentation = Array.from(this.accounts.entries())
      .map(([k, v]) => `${k}:${v.nonce}:${v.balance}`)
      .sort()
      .join('|');

    const postStateRoot = '0x' + crypto.createHash('sha256')
      .update(`${preStateRoot}:${stateRepresentation}:${blockHeight}`)
      .digest('hex');

    this.currentStateRoot = postStateRoot;

    // Batch commitment
    const batchCommitment = '0x' + crypto.createHash('sha256')
      .update(`${blockHeight}:${executedTxHashes.join(',')}:${preStateRoot}:${postStateRoot}`)
      .digest('hex');

    const challengeWindowEndsAt = rollupType === 'OPTIMISTIC'
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    const block: RollupBlock = {
      blockHeight,
      rollupType,
      txCount: executedTxHashes.length,
      txHashes: executedTxHashes,
      preStateRoot,
      postStateRoot,
      batchCommitment,
      status: 'PROPOSED',
      proposerDid: spec.proposerDid,
      proposedAt: new Date().toISOString(),
      challengeWindowEndsAt,
    };

    this.blocks.push(block);
    return block;
  }

  public commitToL1(blockHeight: number, l1TxHash?: string): RollupBlock {
    const block = this.blocks.find((b) => b.blockHeight === blockHeight);
    if (!block) throw new Error(`Block ${blockHeight} not found`);

    block.status = 'COMMITTED_L1';
    block.l1TxHash = l1TxHash || '0x' + crypto.randomBytes(32).toString('hex');
    return block;
  }

  public finalizeBlock(blockHeight: number): RollupBlock {
    const block = this.blocks.find((b) => b.blockHeight === blockHeight);
    if (!block) throw new Error(`Block ${blockHeight} not found`);

    block.status = 'FINALIZED';
    block.finalizedAt = new Date().toISOString();
    return block;
  }

  public challengeBlock(spec: {
    blockHeight: number;
    challengerDid: string;
    disputedPostStateRoot: string;
  }): RollupChallenge {
    const block = this.blocks.find((b) => b.blockHeight === spec.blockHeight);
    if (!block) throw new Error(`Block ${spec.blockHeight} not found`);

    const challengeId = 'chal-' + crypto.randomBytes(8).toString('hex');
    block.status = 'CHALLENGED';

    const challenge: RollupChallenge = {
      challengeId,
      blockHeight: spec.blockHeight,
      challengerDid: spec.challengerDid,
      disputedPostStateRoot: spec.disputedPostStateRoot,
      status: 'OPEN',
    };

    this.challenges.set(challengeId, challenge);
    return challenge;
  }

  public getBlocks(): RollupBlock[] {
    return this.blocks;
  }

  public getAccounts(): L2Account[] {
    return Array.from(this.accounts.values());
  }

  public getStats(): RollupStats {
    const finalized = this.blocks.filter((b) => b.status === 'FINALIZED').length;
    const totalTxs = this.blocks.reduce((sum, b) => sum + b.txCount, 0);
    const totalValue = Array.from(this.accounts.values()).reduce((sum, a) => sum + a.balance, 0);
    const openChal = Array.from(this.challenges.values()).filter((c) => c.status === 'OPEN').length;

    return {
      totalBlocks: this.blocks.length,
      finalizedBlocks: finalized,
      totalL2Transactions: totalTxs,
      activeAccounts: this.accounts.size,
      totalL2ValueLocked: totalValue,
      openChallenges: openChal,
      latestPreStateRoot: this.blocks[this.blocks.length - 1]?.preStateRoot || this.currentStateRoot,
      latestPostStateRoot: this.currentStateRoot,
    };
  }
}

export default OceanicosRollupEngine;
