import { OceanicosSequencerEngine } from '../index';

describe('OceanicosSequencerEngine — MEV-Resistant Fair Ordering & VDF Batches', () => {
  let engine: OceanicosSequencerEngine;

  beforeEach(() => {
    engine = new OceanicosSequencerEngine('test-sequencer-key', 500);
  });

  describe('1. Encrypted Transaction Mempool Submission', () => {
    it('should ingest encrypted transactions into mempool in arrival order', () => {
      const tx1 = engine.submitEncryptedTx({
        senderDid: 'did:omega:agent:user-alpha',
        encryptedPayload: '0xencrypted_calldata_swap_usdc_for_eth',
      });

      const tx2 = engine.submitEncryptedTx({
        senderDid: 'did:omega:agent:user-beta',
        encryptedPayload: '0xencrypted_calldata_stake_omega',
      });

      expect(tx1.txHash).toMatch(/^0x/);
      expect(tx1.status).toBe('PENDING');
      expect(tx2.txHash).toMatch(/^0x/);

      const mempool = engine.getMempool();
      expect(mempool.length).toBe(2);
    });
  });

  describe('2. Verifiable Delay Function (VDF) Computation & Verification', () => {
    it('should compute sequential VDF proof and verify cryptographic integrity', () => {
      const vdf = engine.computeVDF('TEST_CHALLENGE_SEED', 500);
      expect(vdf.iterations).toBe(500);
      expect(vdf.output).toMatch(/^0x/);
      expect(vdf.proof).toMatch(/^0x/);

      const isValid = engine.verifyVDF(vdf);
      expect(isValid).toBe(true);
    });
  });

  describe('3. Deterministic Fair Batch Sealing & Attestation', () => {
    it('should seal pending mempool into fair-ordered batch with VDF and cryptographic receipt', () => {
      engine.submitEncryptedTx({
        senderDid: 'did:omega:agent:user-01',
        encryptedPayload: '0xpayload1',
      });
      engine.submitEncryptedTx({
        senderDid: 'did:omega:agent:user-02',
        encryptedPayload: '0xpayload2',
      });

      const batch = engine.sealBatch(10);
      expect(batch.batchNumber).toBe(1);
      expect(batch.txCount).toBe(2);
      expect(batch.transactionsRoot).toMatch(/^0x/);
      expect(batch.stateDeltaRoot).toMatch(/^0x/);
      expect(batch.sequencerSignature).toMatch(/^0x/);

      // Verify batch receipt
      const verification = engine.verifyBatchReceipt(batch);
      expect(verification.valid).toBe(true);

      // Mempool transactions are now ORDERED
      const mempool = engine.getMempool();
      expect(mempool.every((t) => t.status === 'ORDERED')).toBe(true);
      expect(mempool[0].fairSequenceNumber).toBeDefined();
    });
  });

  describe('4. Aggregate Sequencer Statistics', () => {
    it('should compute aggregate sequencer throughput metrics', () => {
      const stats = engine.getStats();
      expect(stats.totalMempoolTxs).toBe(0);
      expect(stats.totalBatchesSealed).toBe(0);
      expect(stats.vdfIterationsDifficulty).toBe(500);
    });
  });
});
