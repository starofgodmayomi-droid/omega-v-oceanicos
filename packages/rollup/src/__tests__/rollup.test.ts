import { OceanicosRollupEngine } from '../index';

describe('OceanicosRollupEngine — Layer-2 Optimistic & ZK-Validity Rollup', () => {
  let engine: OceanicosRollupEngine;

  beforeEach(() => {
    engine = new OceanicosRollupEngine('test-rollup-key');
  });

  describe('1. L2 Account State & Transaction Ingestion', () => {
    it('should initialize with genesis accounts and ingest L2 transactions', () => {
      const alice = engine.getAccount('0xAlice');
      expect(alice.balance).toBe(100000);

      const tx = engine.submitL2Transaction({
        from: '0xAlice',
        to: '0xBob',
        value: 15000,
        calldata: '0xpayment_data',
      });

      expect(tx.txHash).toMatch(/^0x/);
      expect(tx.status).toBe('PENDING');
      expect(tx.value).toBe(15000);
    });

    it('should reject transactions with insufficient balance', () => {
      expect(() => {
        engine.submitL2Transaction({
          from: '0xBob',
          to: '0xAlice',
          value: 999999,
        });
      }).toThrow(/Insufficient L2 balance/);
    });
  });

  describe('2. Block Production & State Transition Roots', () => {
    it('should execute pending transactions into a proposed rollup block', () => {
      engine.submitL2Transaction({ from: '0xAlice', to: '0xBob', value: 20000 });
      engine.submitL2Transaction({ from: '0xBob', to: '0xCharlie', value: 5000 });

      const block = engine.produceBlock({
        proposerDid: 'did:omega:sequencer:primary',
        rollupType: 'OPTIMISTIC',
      });

      expect(block.blockHeight).toBe(1);
      expect(block.txCount).toBe(2);
      expect(block.status).toBe('PROPOSED');
      expect(block.preStateRoot).toMatch(/^0x/);
      expect(block.postStateRoot).toMatch(/^0x/);
      expect(block.preStateRoot).not.toBe(block.postStateRoot);
      expect(block.batchCommitment).toMatch(/^0x/);
      expect(block.challengeWindowEndsAt).toBeDefined();

      // State updated
      expect(engine.getAccount('0xAlice').balance).toBe(80000);
      expect(engine.getAccount('0xBob').balance).toBe(65000);
      expect(engine.getAccount('0xCharlie').balance).toBe(5000);
    });
  });

  describe('3. L1 Commitment & Finalization Lifecycle', () => {
    it('should commit proposed block to L1 and finalize', () => {
      engine.submitL2Transaction({ from: '0xAlice', to: '0xBob', value: 1000 });
      const block = engine.produceBlock({ proposerDid: 'did:omega:sequencer:primary' });

      const committed = engine.commitToL1(block.blockHeight, '0xL1_TX_HASH_ETHEREUM');
      expect(committed.status).toBe('COMMITTED_L1');
      expect(committed.l1TxHash).toBe('0xL1_TX_HASH_ETHEREUM');

      const finalized = engine.finalizeBlock(block.blockHeight);
      expect(finalized.status).toBe('FINALIZED');
      expect(finalized.finalizedAt).toBeDefined();
    });
  });

  describe('4. Fraud Proof Challenge Mechanism', () => {
    it('should register fraud challenge against disputed block state root', () => {
      engine.submitL2Transaction({ from: '0xAlice', to: '0xBob', value: 500 });
      const block = engine.produceBlock({ proposerDid: 'did:omega:sequencer:primary' });

      const challenge = engine.challengeBlock({
        blockHeight: block.blockHeight,
        challengerDid: 'did:omega:challenger:watchtower',
        disputedPostStateRoot: '0xINVALID_COMPUTED_ROOT',
      });

      expect(challenge.challengeId).toMatch(/^chal-/);
      expect(challenge.status).toBe('OPEN');
      expect(engine.getBlocks()[0].status).toBe('CHALLENGED');
    });
  });

  describe('5. Rollup Aggregate Statistics', () => {
    it('should compute comprehensive L2 throughput and value locked statistics', () => {
      const stats = engine.getStats();
      expect(stats.totalBlocks).toBe(0);
      expect(stats.activeAccounts).toBe(2);
      expect(stats.totalL2ValueLocked).toBe(150000);
    });
  });
});
