import { OceanicosConsensusEngine } from '../index';

describe('OceanicosConsensusEngine — BFT State Machine Replication & Quorum Certificates', () => {
  let engine: OceanicosConsensusEngine;

  beforeEach(() => {
    engine = new OceanicosConsensusEngine('test-consensus-key');
  });

  describe('1. Genesis State & Validator Registration', () => {
    it('should initialize Genesis block at height 0 with canonical validators', () => {
      const chain = engine.getChain();
      expect(chain.length).toBe(1);
      expect(chain[0].height).toBe(0);
      expect(chain[0].previousBlockHash).toMatch(/^0x0000/);
      expect(chain[0].blockHash).toMatch(/^0x/);

      const validators = engine.getValidators();
      expect(validators.length).toBe(3);
      expect(validators.every((v) => v.status === 'ACTIVE')).toBe(true);
    });

    it('should register a new validator node with stake', () => {
      const val = engine.registerValidator({
        did: 'did:omega:validator:delta-node',
        stake: 250000,
      });

      expect(val.validatorId).toMatch(/^val-/);
      expect(val.did).toBe('did:omega:validator:delta-node');
      expect(val.stake).toBe(250000);
      expect(val.status).toBe('ACTIVE');
    });
  });

  describe('2. Block Proposal & Quorum Certificate Gathering', () => {
    it('should propose a new block and gather votes until 2/3+1 supermajority QC is achieved', () => {
      // 1. Propose Block 1
      const block1 = engine.proposeBlock({
        proposerDid: 'did:omega:validator:genesis-alpha',
        transactions: [{ txId: 'tx-101', type: 'STATE_TRANSITION', payload: { delta: 42 } }],
        stateRoot: '0xabc123stateRootHash',
        attestationProofs: ['proof-att-001'],
      });

      expect(block1.height).toBe(1);
      expect(block1.previousBlockHash).toBe(engine.getChain()[0].blockHash);
      expect(block1.blockHash).toMatch(/^0x/);

      // 2. Genesis stakes: Alpha (500k), Beta (300k), Gamma (200k) -> Total = 1,000k. Supermajority > 666.6k.
      // Vote 1: Alpha (500k / 1000k = 50%) -> Quorum not reached yet
      const vote1 = engine.castVote({
        validatorDid: 'did:omega:validator:genesis-alpha',
        blockHash: block1.blockHash,
        blockHeight: 1,
      });
      expect(vote1.quorumReached).toBe(false);

      // Vote 2: Beta (300k -> total 800k / 1000k = 80%) -> Quorum REACHED!
      const vote2 = engine.castVote({
        validatorDid: 'did:omega:validator:genesis-beta',
        blockHash: block1.blockHash,
        blockHeight: 1,
      });
      expect(vote2.quorumReached).toBe(true);
      expect(vote2.qc.signatures['did:omega:validator:genesis-alpha']).toBeDefined();
      expect(vote2.qc.signatures['did:omega:validator:genesis-beta']).toBeDefined();

      // 3. Finalize Block
      const finalized = engine.finalizeBlock(block1, vote2.qc);
      expect(finalized.quorumCertificate).toBeDefined();
      expect(engine.getChain().length).toBe(2);
      expect(engine.getChain()[1].height).toBe(1);
    });

    it('should reject finalizing block if QC has not achieved supermajority', () => {
      const block1 = engine.proposeBlock({
        proposerDid: 'did:omega:validator:genesis-alpha',
        transactions: [],
        stateRoot: '0xstateroot',
      });

      // Only Alpha votes (50%)
      const { qc } = engine.castVote({
        validatorDid: 'did:omega:validator:genesis-alpha',
        blockHash: block1.blockHash,
        blockHeight: 1,
      });

      expect(() => {
        engine.finalizeBlock(block1, qc);
      }).toThrow(/Quorum Certificate has not achieved/);
    });
  });

  describe('3. Byzantine Equivocation Detection & Slashing', () => {
    it('should detect double-proposing equivocation and 100% slash the offender', () => {
      const slashRecord = engine.detectEquivocation({
        validatorDid: 'did:omega:validator:genesis-gamma',
        blockHeight: 1,
        blockHashA: '0x1111111111111111111111111111111111111111111111111111111111111111',
        blockHashB: '0x2222222222222222222222222222222222222222222222222222222222222222',
      });

      expect(slashRecord.recordId).toMatch(/^slash-/);
      expect(slashRecord.slashedStake).toBe(200000);
      expect(slashRecord.evidenceHash).toHaveLength(64);

      const gamma = engine
        .getValidators()
        .find((v) => v.did === 'did:omega:validator:genesis-gamma')!;
      expect(gamma.status).toBe('SLASHED');
      expect(gamma.stake).toBe(0);
      expect(gamma.slashedAmount).toBe(200000);

      // Slashed validator cannot propose or vote
      expect(() => {
        engine.proposeBlock({
          proposerDid: 'did:omega:validator:genesis-gamma',
          transactions: [],
          stateRoot: '0xroot',
        });
      }).toThrow(/not active/);
    });
  });

  describe('4. Chain Statistics & Metrics', () => {
    it('should compute aggregate consensus statistics', () => {
      const stats = engine.getStats();
      expect(stats.chainHeight).toBe(0);
      expect(stats.totalBlocks).toBe(1);
      expect(stats.activeValidators).toBe(3);
      expect(stats.totalStaked).toBe(1000000);
    });
  });
});
