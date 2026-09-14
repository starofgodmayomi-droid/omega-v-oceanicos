import { OceanicosShardingEngine } from '../index';

describe('OceanicosShardingEngine — Adaptive State Sharding & Cross-Shard 2PC', () => {
  let engine: OceanicosShardingEngine;

  beforeEach(() => {
    engine = new OceanicosShardingEngine('test-sharding-key');
  });

  describe('1. Genesis Shard Partitioning & Deterministic Slot Routing', () => {
    it('should initialize 2 active genesis shards covering all 1024 slots', () => {
      const shards = engine.getShards();
      expect(shards.length).toBe(2);
      expect(shards[0].slotStart).toBe(0);
      expect(shards[0].slotEnd).toBe(511);
      expect(shards[1].slotStart).toBe(512);
      expect(shards[1].slotEnd).toBe(1023);
      expect(shards.every((s) => s.status === 'ACTIVE')).toBe(true);
    });

    it('should route state keys deterministically to their respective shards', () => {
      const shardA = engine.routeKeyToShard('user:account:alice');
      const shardB = engine.routeKeyToShard('user:account:bob');

      expect(shardA.status).toBe('ACTIVE');
      expect(shardB.status).toBe('ACTIVE');
    });
  });

  describe('2. State Placement & Merkle Root Recalculation', () => {
    it('should put state in shard and update its cryptographic Merkle root', () => {
      const res1 = engine.putState('contract:0x123:balance', { amount: 1000 });
      expect(res1.shardId).toBeDefined();
      expect(res1.merkleRoot).toMatch(/^0x/);

      const fetched = engine.getState('contract:0x123:balance');
      expect(fetched).not.toBeNull();
      expect(fetched!.value).toEqual({ amount: 1000 });
      expect(fetched!.shardId).toBe(res1.shardId);
    });
  });

  describe('3. Cross-Shard Atomic Two-Phase Commit (2PC)', () => {
    it('should execute 2PC prepare and atomic commit across distinct shards', () => {
      // 1. Prepare 2PC transaction
      const tx = engine.prepareCrossShardTx({
        key: 'cross-asset:transfer-01',
        sourceShardId: 'shard-00',
        targetShardId: 'shard-01',
        sourceValue: { balance: 900 },
        targetValue: { balance: 100 },
      });

      expect(tx.txId).toMatch(/^ctx-/);
      expect(tx.state).toBe('PREPARED');
      expect(tx.prepareProofs.length).toBe(2);

      // 2. Commit 2PC transaction
      const committed = engine.commitCrossShardTx(tx.txId);
      expect(committed.state).toBe('COMMITTED');
      expect(committed.commitProof).toMatch(/^0x/);
    });
  });

  describe('4. Dynamic Shard Splitting & Rebalancing', () => {
    it('should split overloaded shard into child sub-shards and migrate keys', () => {
      // Put keys in shard-00
      for (let i = 0; i < 10; i++) {
        engine.putState(`test:key:${i}`, { val: i });
      }

      const rebalanceEvent = engine.splitShard('shard-00');
      expect(rebalanceEvent.parentShardId).toBe('shard-00');
      expect(rebalanceEvent.childShardA).toBe('shard-00-a');
      expect(rebalanceEvent.childShardB).toBe('shard-00-b');

      const allShards = engine.getShards();
      const active = allShards.filter((s) => s.status === 'ACTIVE');
      expect(active.length).toBe(3); // shard-00-a, shard-00-b, shard-01
    });
  });

  describe('5. Aggregate Sharding Statistics', () => {
    it('should compute sharding metrics', () => {
      const stats = engine.getStats();
      expect(stats.totalShards).toBe(2);
      expect(stats.activeShards).toBe(2);
      expect(stats.totalStateKeys).toBe(0);
    });
  });
});
