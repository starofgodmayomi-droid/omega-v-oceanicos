/**
 * @omega-v/amm — Verifiable Automated Market Maker & Decentralized Liquidity Engine
 * Constant Product Invariant (x · y = k), Liquidity Provisioning, Slippage Bounds & Swap Execution Proofs
 *
 * Ω∞v ::= REALITY ⇄ OBSERVE ⇄ EVIDENCE ⇄ VERIFY ⇄ REMEMBER ⇄ REASON ⇄ INTEND ⇄ BUILD ⇄ TEST ⇄ ATTEST ⇄ ACT ⇄ CONSEQUENCE ⇄ LEARN ⇄ AUDIT ⇄ RECOMPILE ↺∞
 */

import { createHmac, randomUUID } from 'crypto';

/* ─── Types ─────────────────────────────────────────────────────── */

export interface LiquidityPool {
  poolId: string;
  tokenA: string;
  tokenB: string;
  reserveA: number;
  reserveB: number;
  totalLpShares: number;
  feeBps: number;
  kInvariant: number;
  lpBalances: Map<string, number>;
  createdAt: string;
}

export interface SwapReceipt {
  swapId: string;
  poolId: string;
  traderDid: string;
  tokenIn: string;
  amountIn: number;
  tokenOut: string;
  amountOut: number;
  feePaid: number;
  priceImpactPct: number;
  kBefore: number;
  kAfter: number;
  swapProof: string;
  executedAt: string;
}

export interface LiquidityReceipt {
  receiptId: string;
  poolId: string;
  providerDid: string;
  action: 'ADD' | 'REMOVE';
  amountA: number;
  amountB: number;
  lpShares: number;
  receiptProof: string;
  timestamp: string;
}

export interface AMMStats {
  totalPools: number;
  totalSwaps: number;
  totalLiquidityPositions: number;
  cumulativeVolume: number;
  totalFeesCollected: number;
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function hmac(key: string, data: string): string {
  return '0x' + createHmac('sha256', key).update(data).digest('hex');
}

/* ─── Engine ─────────────────────────────────────────────────────── */

export class OceanicosAMMEngine {
  private readonly secret: string;
  private pools: Map<string, LiquidityPool> = new Map();
  private swaps: SwapReceipt[] = [];
  private totalVolume = 0;
  private totalFees = 0;

  constructor(secret = 'amm-omega-v-secret') {
    this.secret = secret;
  }

  /* ── 1. Create Liquidity Pool ── */

  createPool(opts: {
    tokenA: string;
    tokenB: string;
    initialA: number;
    initialB: number;
    creatorDid: string;
    feeBps?: number;
  }): LiquidityPool {
    if (!opts.tokenA || !opts.tokenB || opts.tokenA === opts.tokenB) {
      throw new Error('Valid distinct tokenA and tokenB are required');
    }
    if (opts.initialA <= 0 || opts.initialB <= 0) {
      throw new Error('Initial liquidity amounts must be greater than zero');
    }

    const sortedTokens = [opts.tokenA.toUpperCase(), opts.tokenB.toUpperCase()].sort();
    const isStandardOrder = sortedTokens[0] === opts.tokenA.toUpperCase();
    const tokenA = sortedTokens[0];
    const tokenB = sortedTokens[1];
    const reserveA = isStandardOrder ? opts.initialA : opts.initialB;
    const reserveB = isStandardOrder ? opts.initialB : opts.initialA;

    const feeBps = opts.feeBps ?? 30; // 30 bps = 0.3%
    const poolId = `pool-${tokenA}-${tokenB}-${feeBps}`;

    if (this.pools.has(poolId)) {
      throw new Error(`Pool ${poolId} already exists`);
    }

    const initialLpShares = Math.sqrt(reserveA * reserveB);
    const lpBalances = new Map<string, number>();
    lpBalances.set(opts.creatorDid, initialLpShares);

    const pool: LiquidityPool = {
      poolId,
      tokenA,
      tokenB,
      reserveA,
      reserveB,
      totalLpShares: initialLpShares,
      feeBps,
      kInvariant: reserveA * reserveB,
      lpBalances,
      createdAt: new Date().toISOString(),
    };

    this.pools.set(poolId, pool);
    return { ...pool };
  }

  getPools(): LiquidityPool[] {
    return Array.from(this.pools.values());
  }

  getPool(poolId: string): LiquidityPool | undefined {
    return this.pools.get(poolId);
  }

  /* ── 2. Add Liquidity ── */

  addLiquidity(opts: {
    poolId: string;
    amountA: number;
    amountB: number;
    providerDid: string;
    minShares?: number;
  }): LiquidityReceipt {
    const pool = this.pools.get(opts.poolId);
    if (!pool) throw new Error(`Pool ${opts.poolId} not found`);
    if (opts.amountA <= 0 || opts.amountB <= 0) throw new Error('Liquidity amounts must be > 0');

    // LP shares minted = min((amountA / reserveA) * totalShares, (amountB / reserveB) * totalShares)
    const sharesA = (opts.amountA / pool.reserveA) * pool.totalLpShares;
    const sharesB = (opts.amountB / pool.reserveB) * pool.totalLpShares;
    const mintedShares = Math.min(sharesA, sharesB);

    if (opts.minShares && mintedShares < opts.minShares) {
      throw new Error(
        `Slippage error: minted shares ${mintedShares} < minShares ${opts.minShares}`
      );
    }

    pool.reserveA += opts.amountA;
    pool.reserveB += opts.amountB;
    pool.totalLpShares += mintedShares;
    pool.kInvariant = pool.reserveA * pool.reserveB;

    const currentBal = pool.lpBalances.get(opts.providerDid) ?? 0;
    pool.lpBalances.set(opts.providerDid, currentBal + mintedShares);

    const now = new Date().toISOString();
    const receiptId = `liq-${randomUUID().slice(0, 10)}`;
    const receiptProof = hmac(
      this.secret,
      `LIQ_ADD:${receiptId}:${pool.poolId}:${opts.providerDid}:${opts.amountA}:${opts.amountB}:${mintedShares}:${now}`
    );

    return {
      receiptId,
      poolId: pool.poolId,
      providerDid: opts.providerDid,
      action: 'ADD',
      amountA: opts.amountA,
      amountB: opts.amountB,
      lpShares: mintedShares,
      receiptProof,
      timestamp: now,
    };
  }

  /* ── 3. Remove Liquidity ── */

  removeLiquidity(opts: {
    poolId: string;
    sharesToBurn: number;
    providerDid: string;
    minA?: number;
    minB?: number;
  }): LiquidityReceipt {
    const pool = this.pools.get(opts.poolId);
    if (!pool) throw new Error(`Pool ${opts.poolId} not found`);
    if (opts.sharesToBurn <= 0) throw new Error('Shares to burn must be > 0');

    const providerBal = pool.lpBalances.get(opts.providerDid) ?? 0;
    if (providerBal < opts.sharesToBurn) {
      throw new Error(`Insufficient LP share balance: ${providerBal} < ${opts.sharesToBurn}`);
    }

    const shareFraction = opts.sharesToBurn / pool.totalLpShares;
    const amountA = shareFraction * pool.reserveA;
    const amountB = shareFraction * pool.reserveB;

    if (opts.minA && amountA < opts.minA)
      throw new Error(`Slippage: amountA ${amountA} < minA ${opts.minA}`);
    if (opts.minB && amountB < opts.minB)
      throw new Error(`Slippage: amountB ${amountB} < minB ${opts.minB}`);

    pool.reserveA -= amountA;
    pool.reserveB -= amountB;
    pool.totalLpShares -= opts.sharesToBurn;
    pool.kInvariant = pool.reserveA * pool.reserveB;
    pool.lpBalances.set(opts.providerDid, providerBal - opts.sharesToBurn);

    const now = new Date().toISOString();
    const receiptId = `liq-${randomUUID().slice(0, 10)}`;
    const receiptProof = hmac(
      this.secret,
      `LIQ_REMOVE:${receiptId}:${pool.poolId}:${opts.providerDid}:${amountA}:${amountB}:${opts.sharesToBurn}:${now}`
    );

    return {
      receiptId,
      poolId: pool.poolId,
      providerDid: opts.providerDid,
      action: 'REMOVE',
      amountA,
      amountB,
      lpShares: opts.sharesToBurn,
      receiptProof,
      timestamp: now,
    };
  }

  /* ── 4. Swap Execution ── */

  getAmountOut(
    poolId: string,
    tokenIn: string,
    amountIn: number
  ): { amountOut: number; priceImpactPct: number; feePaid: number } {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error(`Pool ${poolId} not found`);
    if (amountIn <= 0) throw new Error('amountIn must be > 0');

    const isTokenA = tokenIn.toUpperCase() === pool.tokenA;
    const isTokenB = tokenIn.toUpperCase() === pool.tokenB;
    if (!isTokenA && !isTokenB)
      throw new Error(`Token ${tokenIn} does not belong to pool ${poolId}`);

    const reserveIn = isTokenA ? pool.reserveA : pool.reserveB;
    const reserveOut = isTokenA ? pool.reserveB : pool.reserveA;

    const feeMultiplier = (10000 - pool.feeBps) / 10000;
    const amountInWithFee = amountIn * feeMultiplier;
    const feePaid = amountIn * (pool.feeBps / 10000);

    const amountOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);
    const midPriceBefore = reserveOut / reserveIn;
    const effectivePrice = amountOut / amountIn;
    const priceImpactPct = Math.abs((midPriceBefore - effectivePrice) / midPriceBefore) * 100;

    return { amountOut, priceImpactPct, feePaid };
  }

  swap(opts: {
    poolId: string;
    tokenIn: string;
    amountIn: number;
    traderDid: string;
    minAmountOut?: number;
  }): SwapReceipt {
    const pool = this.pools.get(opts.poolId);
    if (!pool) throw new Error(`Pool ${opts.poolId} not found`);

    const isTokenA = opts.tokenIn.toUpperCase() === pool.tokenA;
    const tokenOut = isTokenA ? pool.tokenB : pool.tokenA;

    const { amountOut, priceImpactPct, feePaid } = this.getAmountOut(
      opts.poolId,
      opts.tokenIn,
      opts.amountIn
    );

    if (opts.minAmountOut && amountOut < opts.minAmountOut) {
      throw new Error(
        `Slippage exceeded: output ${amountOut.toFixed(4)} < minAmountOut ${opts.minAmountOut}`
      );
    }

    const kBefore = pool.kInvariant;

    if (isTokenA) {
      pool.reserveA += opts.amountIn;
      pool.reserveB -= amountOut;
    } else {
      pool.reserveB += opts.amountIn;
      pool.reserveA -= amountOut;
    }

    pool.kInvariant = pool.reserveA * pool.reserveB;
    const kAfter = pool.kInvariant;

    this.totalVolume += opts.amountIn;
    this.totalFees += feePaid;

    const swapId = `swp-${randomUUID().slice(0, 10)}`;
    const now = new Date().toISOString();
    const swapProof = hmac(
      this.secret,
      `SWAP:${swapId}:${pool.poolId}:${opts.traderDid}:${opts.tokenIn}:${opts.amountIn}:${tokenOut}:${amountOut}:${kBefore}:${kAfter}:${now}`
    );

    const receipt: SwapReceipt = {
      swapId,
      poolId: pool.poolId,
      traderDid: opts.traderDid,
      tokenIn: opts.tokenIn.toUpperCase(),
      amountIn: opts.amountIn,
      tokenOut,
      amountOut,
      feePaid,
      priceImpactPct,
      kBefore,
      kAfter,
      swapProof,
      executedAt: now,
    };

    this.swaps.push(receipt);
    return receipt;
  }

  /* ── 5. Query & Stats ── */

  getSwaps(): SwapReceipt[] {
    return [...this.swaps];
  }

  getStats(): AMMStats {
    let totalPositions = 0;
    for (const p of this.pools.values()) {
      totalPositions += p.lpBalances.size;
    }

    return {
      totalPools: this.pools.size,
      totalSwaps: this.swaps.length,
      totalLiquidityPositions: totalPositions,
      cumulativeVolume: this.totalVolume,
      totalFeesCollected: this.totalFees,
    };
  }
}
