import { OceanicosBridgeEngine } from '../index';

describe('OceanicosBridgeEngine — Cross-Chain Cryptographic State Proofs & Relays', () => {
  let engine: OceanicosBridgeEngine;

  beforeEach(() => {
    engine = new OceanicosBridgeEngine('test-bridge-secret');
  });

  describe('1. Genesis Light Clients & Chain Registry', () => {
    it('should register canonical chains (Ethereum, Solana, Cosmos)', () => {
      const chains = engine.getChains();
      expect(chains.length).toBe(3);
      expect(chains.map((c) => c.network)).toContain('ETHEREUM');
      expect(chains.map((c) => c.network)).toContain('SOLANA');
      expect(chains.map((c) => c.network)).toContain('COSMOS');
    });

    it('should register a custom Substrate parachain light client', () => {
      const client = engine.registerChain({
        chainId: 'chain-polkadot-relay',
        network: 'SUBSTRATE',
        initialHeight: 18000000,
        initialStateRoot: '0xdot_root',
        finalityThresholdBlocks: 1,
        activeRelayers: ['did:omega:relayer:dot-01'],
      });

      expect(client.chainId).toBe('chain-polkadot-relay');
      expect(client.network).toBe('SUBSTRATE');
      expect(engine.getChains().length).toBe(4);
    });
  });

  describe('2. Header Submission & Light Client State Updates', () => {
    it('should submit valid new headers and advance the light client tracking height', () => {
      const res = engine.submitHeader({
        chainId: 'chain-eth-mainnet',
        height: 19850001,
        blockHash: '0xethblockhash101',
        previousBlockHash: '0xethprevhash100',
        stateRoot: '0xnew_eth_state_root_101',
        signatures: ['sig-validator-alpha', 'sig-validator-beta'],
      });

      expect(res.accepted).toBe(true);
      expect(res.latestHeight).toBe(19850001);
      expect(res.latestStateRoot).toBe('0xnew_eth_state_root_101');
    });

    it('should reject stale or older block headers', () => {
      expect(() => {
        engine.submitHeader({
          chainId: 'chain-eth-mainnet',
          height: 19850000, // already at 19850000
          blockHash: '0xstale',
          previousBlockHash: '0xprev',
          stateRoot: '0xroot',
          signatures: [],
        });
      }).toThrow(/Stale header height/);
    });
  });

  describe('3. Cross-Chain Bridge Transfer Lifecycle (Lock, Relay, Finalize)', () => {
    it('should initiate transfer, relay with Merkle inclusion proof, and finalize minting', () => {
      // 1. Initiate Lock
      const transfer = engine.initiateTransfer({
        sourceChain: 'chain-eth-mainnet',
        targetChain: 'chain-solana-mainnet',
        senderDid: 'did:omega:agent:trader-01',
        recipientAddress: 'SolanaWalletAddress111111111111111111',
        assetSymbol: 'USDC',
        amount: 50000,
        lockTxHash: '0xeth_tx_lock_hash_123',
      });

      expect(transfer.transferId).toMatch(/^brg-/);
      expect(transfer.status).toBe('INITIALIZED');
      expect(transfer.nonce).toBe(1);

      // 2. Relayer submission with Merkle proof
      const relayed = engine.relayTransfer({
        transferId: transfer.transferId,
        relayerDid: 'did:omega:relayer:eth-primary',
        merkleProof: '0xmerkle_path_proof_leaf_to_root',
      });

      expect(relayed.status).toBe('RELAYED');
      expect(relayed.merkleProof).toMatch(/^0x/);

      // 3. Finalize on target chain
      const finalized = engine.finalizeTransfer(transfer.transferId);
      expect(finalized.status).toBe('FINALIZED');
      expect(finalized.mintTxHash).toMatch(/^0x/);
      expect(finalized.finalizedAt).toBeDefined();
    });
  });

  describe('4. Aggregate Bridge Telemetry', () => {
    it('should compute aggregate bridge statistics', () => {
      const stats = engine.getStats();
      expect(stats.supportedChains).toBe(3);
      expect(stats.totalTransfers).toBe(0);
      expect(stats.activeRelayers).toBeGreaterThanOrEqual(3);
    });
  });
});
