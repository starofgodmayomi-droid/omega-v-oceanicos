import { OceanicosAMMEngine } from '../index';

describe('@omega-v/amm — Verifiable Automated Market Maker Engine', () => {
  let amm: OceanicosAMMEngine;

  beforeEach(() => {
    amm = new OceanicosAMMEngine('test-amm-secret');
  });

  it('should create a liquidity pool and initialize LP share balances', () => {
    const pool = amm.createPool({
      tokenA: 'ETH',
      tokenB: 'USDC',
      initialA: 10,
      initialB: 30000,
      creatorDid: 'did:omega:agent:liquidity-whale',
      feeBps: 30,
    });

    expect(pool.poolId).toBe('pool-ETH-USDC-30');
    expect(pool.reserveA).toBe(10);
    expect(pool.reserveB).toBe(30000);
    expect(pool.totalLpShares).toBeCloseTo(Math.sqrt(10 * 30000), 2);
    expect(amm.getPools()).toHaveLength(1);
  });

  it('should execute swaps according to constant product formula (x * y = k) with fee', () => {
    const pool = amm.createPool({
      tokenA: 'ETH',
      tokenB: 'USDC',
      initialA: 10,
      initialB: 30000,
      creatorDid: 'did:omega:agent:whale',
    });

    // Swap 1 ETH for USDC
    const swap = amm.swap({
      poolId: pool.poolId,
      tokenIn: 'ETH',
      amountIn: 1,
      traderDid: 'did:omega:agent:trader-1',
      minAmountOut: 2500,
    });

    expect(swap.swapId).toMatch(/^swp-/);
    expect(swap.tokenOut).toBe('USDC');
    expect(swap.amountOut).toBeGreaterThan(2500);
    expect(swap.kAfter).toBeGreaterThanOrEqual(swap.kBefore); // k grows from fees
    expect(swap.swapProof).toMatch(/^0x/);

    const updatedPool = amm.getPool(pool.poolId)!;
    expect(updatedPool.reserveA).toBe(11);
    expect(updatedPool.reserveB).toBeCloseTo(30000 - swap.amountOut, 2);
  });

  it('should enforce slippage limits and reject swaps that breach minAmountOut', () => {
    const pool = amm.createPool({
      tokenA: 'ETH',
      tokenB: 'USDC',
      initialA: 10,
      initialB: 30000,
      creatorDid: 'did:omega:agent:whale',
    });

    expect(() => {
      amm.swap({
        poolId: pool.poolId,
        tokenIn: 'ETH',
        amountIn: 1,
        traderDid: 'did:omega:agent:trader',
        minAmountOut: 2900, // unrealistically tight tolerance
      });
    }).toThrow('Slippage exceeded');
  });

  it('should allow liquidity additions and proportional LP share removals', () => {
    const pool = amm.createPool({
      tokenA: 'ETH',
      tokenB: 'USDC',
      initialA: 10,
      initialB: 30000,
      creatorDid: 'did:omega:agent:whale',
    });

    // Add liquidity
    const addReceipt = amm.addLiquidity({
      poolId: pool.poolId,
      amountA: 5,
      amountB: 15000,
      providerDid: 'did:omega:agent:lp-alice',
    });

    expect(addReceipt.lpShares).toBeGreaterThan(0);
    expect(addReceipt.receiptProof).toMatch(/^0x/);

    // Remove liquidity
    const removeReceipt = amm.removeLiquidity({
      poolId: pool.poolId,
      sharesToBurn: addReceipt.lpShares,
      providerDid: 'did:omega:agent:lp-alice',
    });

    expect(removeReceipt.amountA).toBeCloseTo(5, 1);
    expect(removeReceipt.amountB).toBeCloseTo(15000, 1);
  });

  it('should calculate accurate metrics and quote previews', () => {
    const pool = amm.createPool({
      tokenA: 'ETH',
      tokenB: 'USDC',
      initialA: 10,
      initialB: 30000,
      creatorDid: 'did:omega:agent:whale',
    });

    const quote = amm.getAmountOut(pool.poolId, 'ETH', 1);
    expect(quote.amountOut).toBeGreaterThan(2500);
    expect(quote.priceImpactPct).toBeGreaterThan(0);
    expect(quote.feePaid).toBe(0.003); // 30 bps of 1 ETH = 0.003

    const stats = amm.getStats();
    expect(stats.totalPools).toBe(1);
    expect(stats.totalSwaps).toBe(0);
  });
});
