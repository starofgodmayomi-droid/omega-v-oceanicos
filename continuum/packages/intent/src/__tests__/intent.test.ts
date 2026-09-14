import { OceanicosIntentEngine } from '../index';

describe('OceanicosIntentEngine — Verifiable AI Agent Intent Solver & Settlement', () => {
  let engine: OceanicosIntentEngine;

  beforeEach(() => {
    engine = new OceanicosIntentEngine('test-intent-key');
  });

  describe('1. User Intent Submission & Auction Opening', () => {
    it('should submit an intent with constraints and open an auction for solvers', () => {
      const intent = engine.submitIntent({
        userDid: 'did:omega:agent:trader-01',
        intentDescription: 'Swap 1000 USDC for maximum ETH across Arbitrum and Base',
        sourceAsset: 'USDC',
        targetAsset: 'ETH',
        minTargetAmount: 0.35,
        maxBudget: 1000,
      });

      expect(intent.intentId).toMatch(/^intent-/);
      expect(intent.status).toBe('AUCTION_OPEN');
      expect(intent.minTargetAmount).toBe(0.35);

      const all = engine.getIntents();
      expect(all.length).toBe(1);
    });
  });

  describe('2. Solver Bidding & Solution Witness Attestations', () => {
    it('should accept competitive solver bids with cryptographic witness proofs', () => {
      const intent = engine.submitIntent({
        userDid: 'did:omega:agent:user-alpha',
        intentDescription: 'Cross-chain rebalancing',
        sourceAsset: 'USDC',
        targetAsset: 'SOL',
        minTargetAmount: 5.0,
        maxBudget: 750,
      });

      const bid1 = engine.submitSolverBid({
        intentId: intent.intentId,
        solverDid: 'did:omega:solver:fast-lane',
        proposedRoute: ['USDC@Arb', 'CelerBridge', 'SOL@Solana'],
        guaranteedOutput: 5.2,
        estimatedFee: 1.5,
      });

      const bid2 = engine.submitSolverBid({
        intentId: intent.intentId,
        solverDid: 'did:omega:solver:deep-liquidity',
        proposedRoute: ['USDC@Arb', 'UniswapV3', 'WETH', 'Wormhole', 'SOL@Solana'],
        guaranteedOutput: 5.4,
        estimatedFee: 1.0,
      });

      expect(bid1.solutionWitnessProof).toMatch(/^0x/);
      expect(bid2.solutionWitnessProof).toMatch(/^0x/);

      const bids = engine.getBids(intent.intentId);
      expect(bids.length).toBe(2);
    });

    it('should reject bids that do not meet minimum output constraints', () => {
      const intent = engine.submitIntent({
        userDid: 'did:omega:agent:user-beta',
        intentDescription: 'Swap asset',
        sourceAsset: 'DAI',
        targetAsset: 'AVAX',
        minTargetAmount: 10.0,
        maxBudget: 200,
      });

      expect(() => {
        engine.submitSolverBid({
          intentId: intent.intentId,
          solverDid: 'did:omega:solver:subpar',
          proposedRoute: ['DAI', 'AVAX'],
          guaranteedOutput: 8.5, // Below min
          estimatedFee: 0.5,
        });
      }).toThrow(/does not satisfy minimum required/);
    });
  });

  describe('3. Optimal Route Selection & Composable Settlement', () => {
    it('should select optimal solver route and atomically settle with signed receipt', () => {
      const intent = engine.submitIntent({
        userDid: 'did:omega:agent:dao-treasury',
        intentDescription: 'Treasury DCA yield deposit',
        sourceAsset: 'USDC',
        targetAsset: 'stETH',
        minTargetAmount: 2.0,
        maxBudget: 6000,
      });

      engine.submitSolverBid({
        intentId: intent.intentId,
        solverDid: 'did:omega:solver:standard',
        proposedRoute: ['USDC', 'Curve', 'stETH'],
        guaranteedOutput: 2.05,
        estimatedFee: 5.0,
      });

      engine.submitSolverBid({
        intentId: intent.intentId,
        solverDid: 'did:omega:solver:prime',
        proposedRoute: ['USDC', 'UniswapX', 'Lido', 'stETH'],
        guaranteedOutput: 2.12,
        estimatedFee: 2.0,
      });

      const receipt = engine.settleIntent(intent.intentId);

      expect(receipt.settlementId).toMatch(/^stl-/);
      expect(receipt.solverDid).toBe('did:omega:solver:prime');
      expect(receipt.finalOutputAmount).toBe(2.12);
      expect(receipt.settlementHash).toMatch(/^0x/);
      expect(receipt.attestationSignature).toMatch(/^0x/);

      const updatedIntent = engine.getIntents().find((i) => i.intentId === intent.intentId);
      expect(updatedIntent?.status).toBe('SETTLED');
    });
  });

  describe('4. Intent Engine Telemetry Statistics', () => {
    it('should aggregate solver efficiency and volume metrics', () => {
      const stats = engine.getStats();
      expect(stats.totalIntents).toBe(0);
      expect(stats.registeredSolvers).toBe(0);
      expect(stats.totalVolumeSettled).toBe(0);
    });
  });
});
