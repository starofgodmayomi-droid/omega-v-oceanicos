import crypto from 'crypto';

export type ShardStatus = 'ACTIVE' | 'SPLITTING' | 'MERGING';
export type Tx2PCState = 'PREPARED' | 'COMMITTED' | 'ABORTED';

export interface ShardPartition {
  shardId: string;
  slotStart: number;
  slotEnd: number;
  assignedValidators: string[];
  stateCount: number;
  merkleRoot: string;
  status: ShardStatus;
  createdAt: string;
}

export interface CrossShardTransaction {
  txId: string;
  sourceShardId: string;
  targetShardId: string;
  key: string;
  sourceValue: unknown;
  targetValue: unknown;
  state: Tx2PCState;
  prepareProofs: string[];
  commitProof?: string;
  timestamp: string;
}

export interface ShardRebalanceEvent {
  eventId: string;
  parentShardId: string;
  childShardA: string;
  childShardB: string;
  migratedKeysCount: number;
  timestamp: string;
}

export interface ShardingStats {
  totalShards: number;
  activeShards: number;
  totalStateKeys: number;
  totalCrossShardTxs: number;
  committedCrossShardTxs: number;
  rebalanceEventsCount: number;
}

export const MAX_SLOTS = 1024;
export const SPLIT_THRESHOLD = 50; // Threshold of state objects before triggering automated shard split

export class OceanicosShardingEngine {
  private shards: Map<string, ShardPartition> = new Map();
  private shardState: Map<string, Map<string, unknown>> = new Map(); // shardId -> (key -> value)
  private crossShardTxs: Map<string, CrossShardTransaction> = new Map();
  private rebalanceHistory: ShardRebalanceEvent[] = [];
  private signingKey: string;

  constructor(signingKey = 'omega-v-sharding-secret-key') {
    this.signingKey = signingKey;
    this.seedGenesisShards();
  }

  private seedGenesisShards(): void {
    // Partition slot space [0, 1023] into 2 initial shards
    this.provisionShard({
      shardId: 'shard-00',
      slotStart: 0,
      slotEnd: 511,
      assignedValidators: ['did:omega:validator:genesis-alpha', 'did:omega:validator:genesis-beta'],
    });

    this.provisionShard({
      shardId: 'shard-01',
      slotStart: 512,
      slotEnd: 1023,
      assignedValidators: ['did:omega:validator:genesis-beta', 'did:omega:validator:genesis-gamma'],
    });
  }

  public provisionShard(spec: {
    shardId: string;
    slotStart: number;
    slotEnd: number;
    assignedValidators: string[];
  }): ShardPartition {
    const shard: ShardPartition = {
      shardId: spec.shardId,
      slotStart: spec.slotStart,
      slotEnd: spec.slotEnd,
      assignedValidators: spec.assignedValidators,
      stateCount: 0,
      merkleRoot: '0x' + crypto.createHash('sha256').update(`EMPTY_${spec.shardId}`).digest('hex'),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    this.shards.set(spec.shardId, shard);
    this.shardState.set(spec.shardId, new Map());
    return shard;
  }

  public routeKeyToSlot(key: string): number {
    const hash = crypto.createHash('sha256').update(key).digest();
    const slot = hash.readUInt16BE(0) % MAX_SLOTS;
    return slot;
  }

  public routeKeyToShard(key: string): ShardPartition {
    const slot = this.routeKeyToSlot(key);
    for (const shard of this.shards.values()) {
      if (shard.status === 'ACTIVE' && slot >= shard.slotStart && slot <= shard.slotEnd) {
        return shard;
      }
    }
    throw new Error(`No active shard found covering slot ${slot} for key '${key}'`);
  }

  public putState(key: string, value: unknown): { shardId: string; merkleRoot: string } {
    const shard = this.routeKeyToShard(key);
    const store = this.shardState.get(shard.shardId)!;

    store.set(key, value);
    shard.stateCount = store.size;

    // Recalculate shard Merkle root
    shard.merkleRoot = this.calculateShardMerkleRoot(shard.shardId);

    // Check if auto-rebalance split threshold is exceeded
    if (shard.stateCount >= SPLIT_THRESHOLD && shard.slotEnd - shard.slotStart >= 2) {
      this.splitShard(shard.shardId);
    }

    return { shardId: shard.shardId, merkleRoot: shard.merkleRoot };
  }

  public getState(key: string): { shardId: string; value: unknown } | null {
    const shard = this.routeKeyToShard(key);
    const store = this.shardState.get(shard.shardId);
    if (!store || !store.has(key)) return null;
    return { shardId: shard.shardId, value: store.get(key) };
  }

  public prepareCrossShardTx(spec: {
    key: string;
    sourceShardId: string;
    targetShardId: string;
    sourceValue: unknown;
    targetValue: unknown;
  }): CrossShardTransaction {
    const txId = `ctx-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = new Date().toISOString();

    const srcShard = this.shards.get(spec.sourceShardId);
    const tgtShard = this.shards.get(spec.targetShardId);
    if (!srcShard || !tgtShard) throw new Error('Invalid source or target shard ID');

    // Create 2PC prepare proofs
    const srcProof = '0x' + crypto.createHmac('sha256', this.signingKey)
      .update(`PREPARE:${txId}:${spec.sourceShardId}:${JSON.stringify(spec.sourceValue)}`)
      .digest('hex');

    const tgtProof = '0x' + crypto.createHmac('sha256', this.signingKey)
      .update(`PREPARE:${txId}:${spec.targetShardId}:${JSON.stringify(spec.targetValue)}`)
      .digest('hex');

    const tx: CrossShardTransaction = {
      txId,
      sourceShardId: spec.sourceShardId,
      targetShardId: spec.targetShardId,
      key: spec.key,
      sourceValue: spec.sourceValue,
      targetValue: spec.targetValue,
      state: 'PREPARED',
      prepareProofs: [srcProof, tgtProof],
      timestamp,
    };

    this.crossShardTxs.set(txId, tx);
    return tx;
  }

  public commitCrossShardTx(txId: string): CrossShardTransaction {
    const tx = this.crossShardTxs.get(txId);
    if (!tx) throw new Error(`Cross-shard transaction '${txId}' not found`);
    if (tx.state !== 'PREPARED') {
      throw new Error(`Transaction '${txId}' is in state '${tx.state}', cannot commit`);
    }

    // Apply state changes atomically
    const srcStore = this.shardState.get(tx.sourceShardId);
    const tgtStore = this.shardState.get(tx.targetShardId);

    if (srcStore && tx.sourceValue !== undefined) {
      srcStore.set(tx.key, tx.sourceValue);
      const srcShard = this.shards.get(tx.sourceShardId)!;
      srcShard.merkleRoot = this.calculateShardMerkleRoot(tx.sourceShardId);
    }

    if (tgtStore && tx.targetValue !== undefined) {
      tgtStore.set(tx.key, tx.targetValue);
      const tgtShard = this.shards.get(tx.targetShardId)!;
      tgtShard.merkleRoot = this.calculateShardMerkleRoot(tx.targetShardId);
    }

    const commitProof = '0x' + crypto.createHmac('sha256', this.signingKey)
      .update(`COMMIT:${txId}:${tx.sourceShardId}:${tx.targetShardId}:${tx.timestamp}`)
      .digest('hex');

    tx.state = 'COMMITTED';
    tx.commitProof = commitProof;

    return tx;
  }

  public splitShard(shardId: string): ShardRebalanceEvent {
    const parent = this.shards.get(shardId);
    if (!parent) throw new Error(`Shard '${shardId}' not found`);

    parent.status = 'SPLITTING';
    const midSlot = Math.floor((parent.slotStart + parent.slotEnd) / 2);

    const childAId = `${shardId}-a`;
    const childBId = `${shardId}-b`;

    const childA = this.provisionShard({
      shardId: childAId,
      slotStart: parent.slotStart,
      slotEnd: midSlot,
      assignedValidators: parent.assignedValidators,
    });

    const childB = this.provisionShard({
      shardId: childBId,
      slotStart: midSlot + 1,
      slotEnd: parent.slotEnd,
      assignedValidators: parent.assignedValidators,
    });

    // Migrate keys
    const parentStore = this.shardState.get(shardId)!;
    const storeA = this.shardState.get(childAId)!;
    const storeB = this.shardState.get(childBId)!;

    let migrated = 0;
    for (const [k, v] of parentStore.entries()) {
      const slot = this.routeKeyToSlot(k);
      if (slot >= childA.slotStart && slot <= childA.slotEnd) {
        storeA.set(k, v);
      } else {
        storeB.set(k, v);
      }
      migrated++;
    }

    childA.stateCount = storeA.size;
    childA.merkleRoot = this.calculateShardMerkleRoot(childAId);
    childB.stateCount = storeB.size;
    childB.merkleRoot = this.calculateShardMerkleRoot(childBId);

    // Archive parent shard
    parent.status = 'MERGING'; // Inactive routing status

    const event: ShardRebalanceEvent = {
      eventId: `reb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      parentShardId: shardId,
      childShardA: childAId,
      childShardB: childBId,
      migratedKeysCount: migrated,
      timestamp: new Date().toISOString(),
    };

    this.rebalanceHistory.push(event);
    return event;
  }

  public getShards(): ShardPartition[] {
    return Array.from(this.shards.values());
  }

  public getCrossShardTxs(): CrossShardTransaction[] {
    return Array.from(this.crossShardTxs.values());
  }

  public getRebalanceHistory(): ShardRebalanceEvent[] {
    return this.rebalanceHistory;
  }

  public getStats(): ShardingStats {
    const shards = Array.from(this.shards.values());
    const active = shards.filter((s) => s.status === 'ACTIVE');
    const totalKeys = Array.from(this.shardState.values()).reduce((sum, m) => sum + m.size, 0);
    const crossTxs = Array.from(this.crossShardTxs.values());
    const committed = crossTxs.filter((t) => t.state === 'COMMITTED');

    return {
      totalShards: shards.length,
      activeShards: active.length,
      totalStateKeys: totalKeys,
      totalCrossShardTxs: crossTxs.length,
      committedCrossShardTxs: committed.length,
      rebalanceEventsCount: this.rebalanceHistory.length,
    };
  }

  private calculateShardMerkleRoot(shardId: string): string {
    const store = this.shardState.get(shardId);
    if (!store || store.size === 0) {
      return '0x' + crypto.createHash('sha256').update(`EMPTY_${shardId}`).digest('hex');
    }

    const sortedEntries = Array.from(store.entries()).sort(([a], [b]) => a.localeCompare(b));
    let combined = '';
    for (const [k, v] of sortedEntries) {
      combined += `${k}:${JSON.stringify(v)}|`;
    }

    return '0x' + crypto.createHash('sha256').update(combined).digest('hex');
  }
}

export default OceanicosShardingEngine;
