/**
 * Ω∞v OCEANICOS — Sovereign XAU/USD Position & Risk Engine Route
 * Fail-closed admission gates, portfolio persistence, and mark-to-market trade execution.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type {
  Portfolio,
  TradingPosition,
  TradingOrder,
  TradeSide,
  TradeOrderType,
  RiskGuardrailReport,
  RiskLevel,
  RiskStatus,
} from '@oceanicos/types';
import { globalMarketEngine } from './market-route.js';

export interface OrderInput {
  symbol?: string;
  side: TradeSide;
  type?: TradeOrderType;
  quantity: number; // in lots (e.g. 0.01 - 2.0)
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage?: number;
}

export class TradingEngine {
  private portfolio: Portfolio;
  private orders: TradingOrder[] = [];
  private readonly storagePath: string;
  private readonly maxPositionSizeLots: number = 2.0;
  private readonly maxOpenPositions: number = 5;
  private readonly maxDrawdownLimitPercent: number = 5.0;
  private readonly maxLeverage: number = 50;

  constructor(storagePath?: string) {
    this.storagePath = storagePath ?? join(process.cwd(), '.omega', 'trading-ledger.json');
    this.portfolio = {
      id: 'port-elion-1111',
      currency: 'USD',
      initialBalance: 100000.0,
      balance: 100000.0,
      equity: 100000.0,
      marginUsed: 0.0,
      freeMargin: 100000.0,
      marginLevelPercent: 100.0,
      unrealizedPnl: 0.0,
      realizedPnl: 0.0,
      winCount: 0,
      lossCount: 0,
      totalTrades: 0,
      winRate: 0.0,
      positions: [],
      updatedAt: new Date().toISOString(),
      sovereignOwner: 'ELION VAREL // 11:11 (did:omega:human:starofgodmayomi)',
    };

    this.restore();
  }

  public getPortfolio(): Portfolio {
    this.recomputeMarkToMarket();
    return this.portfolio;
  }

  public getOrders(): TradingOrder[] {
    return this.orders;
  }

  public getPositions(status?: 'OPEN' | 'CLOSED'): TradingPosition[] {
    this.recomputeMarkToMarket();
    if (status) {
      return this.portfolio.positions.filter((p) => p.status === status);
    }
    return this.portfolio.positions;
  }

  public evaluateRiskGuardrails(): RiskGuardrailReport {
    this.recomputeMarkToMarket();
    const balance = this.portfolio.balance;
    const equity = this.portfolio.equity;
    const drawdownAmount = balance > equity ? balance - equity : 0;
    const currentDrawdownPercent = balance > 0 ? Number(((drawdownAmount / balance) * 100).toFixed(2)) : 0;
    const openTrades = this.portfolio.positions.filter((p) => p.status === 'OPEN').length;

    const warnings: string[] = [];
    let status: RiskStatus = 'NORMAL';
    let failClosedTriggered = false;

    if (currentDrawdownPercent >= this.maxDrawdownLimitPercent) {
      status = 'BREACHED';
      failClosedTriggered = true;
      warnings.push(`Drawdown limit breached: ${currentDrawdownPercent}% >= ${this.maxDrawdownLimitPercent}%. New orders halted.`);
    } else if (currentDrawdownPercent >= this.maxDrawdownLimitPercent * 0.7) {
      status = 'WARNING';
      warnings.push(`Drawdown warning threshold reached: ${currentDrawdownPercent}%`);
    }

    if (openTrades >= this.maxOpenPositions) {
      warnings.push(`Max open positions reached (${openTrades}/${this.maxOpenPositions})`);
    }

    return {
      id: `risk-eval-${Date.now()}`,
      riskLevel: 'BALANCED',
      status,
      maxDrawdownLimitPercent: this.maxDrawdownLimitPercent,
      currentDrawdownPercent,
      maxDailyLossLimit: balance * (this.maxDrawdownLimitPercent / 100),
      currentDailyLoss: drawdownAmount,
      maxPositionSizeLots: this.maxPositionSizeLots,
      maxOpenTrades: this.maxOpenPositions,
      currentOpenTrades: openTrades,
      sovereignGuardrailsEnabled: true,
      failClosedTriggered,
      warnings,
      evaluatedAt: new Date().toISOString(),
    };
  }

  public submitOrder(input: OrderInput): { order: TradingOrder; position?: TradingPosition } {
    const symbol = input.symbol ?? 'XAU/USD';
    const side = input.side;
    const type = input.type ?? 'MARKET';
    const lots = Math.max(0.01, input.quantity);
    const leverage = Math.min(Math.max(1, input.leverage ?? 20), this.maxLeverage);

    const quote = globalMarketEngine.getQuote();
    const execPrice = type === 'MARKET' ? (side === 'BUY' ? quote.ask : quote.bid) : input.price ?? (side === 'BUY' ? quote.ask : quote.bid);

    // 1 standard lot = 100 troy ounces
    const notionalValue = lots * 100 * execPrice;
    const requiredMargin = Number((notionalValue / leverage).toFixed(2));

    const riskReport = this.evaluateRiskGuardrails();
    const orderId = `ord-${Date.now()}-${randomUUID().slice(0, 8)}`;

    // Admission Gate Checks
    let passed = true;
    let rejectionReason: string | undefined = undefined;

    if (riskReport.failClosedTriggered) {
      passed = false;
      rejectionReason = `FAIL-CLOSED: ${riskReport.warnings.join('; ')}`;
    } else if (lots > this.maxPositionSizeLots) {
      passed = false;
      rejectionReason = `REJECTED: Requested ${lots} lots exceeds max limit of ${this.maxPositionSizeLots} lots`;
    } else if (riskReport.currentOpenTrades >= this.maxOpenPositions) {
      passed = false;
      rejectionReason = `REJECTED: Maximum open positions count reached (${this.maxOpenPositions})`;
    } else if (requiredMargin > this.portfolio.freeMargin) {
      passed = false;
      rejectionReason = `INSUFFICIENT_MARGIN: Required margin $${requiredMargin} exceeds free margin $${this.portfolio.freeMargin.toFixed(2)}`;
    }

    const verificationHash = createHash('sha256')
      .update(`${orderId}:${symbol}:${side}:${lots}:${execPrice}:${passed}:${quote.sovereignProofHash}`)
      .digest('hex');

    const order: TradingOrder = {
      id: orderId,
      symbol,
      side,
      type,
      price: execPrice,
      quantity: lots,
      stopLoss: input.stopLoss,
      takeProfit: input.takeProfit,
      leverage,
      status: passed ? 'EXECUTED' : 'REJECTED',
      createdAt: new Date().toISOString(),
      executedAt: passed ? new Date().toISOString() : undefined,
      executedPrice: passed ? execPrice : undefined,
      rejectionReason,
      verificationGate: {
        passed,
        rule: 'SOVEREIGN_ADMISSION_GATE_V1111',
        gateState: passed ? 'ADMITTED' : 'REJECTED',
        verifiedBy: `ELION_VAREL_IMMUNE_SYSTEM:${verificationHash.slice(0, 16)}`,
      },
    };

    this.orders.unshift(order);

    if (!passed) {
      this.persist();
      return { order };
    }

    // Create Position
    const positionId = `pos-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const position: TradingPosition = {
      id: positionId,
      symbol,
      side,
      entryPrice: execPrice,
      quantity: lots,
      currentPrice: execPrice,
      unrealizedPnl: 0,
      realizedPnl: 0,
      stopLoss: input.stopLoss,
      takeProfit: input.takeProfit,
      marginUsed: requiredMargin,
      leverage,
      status: 'OPEN',
      openedAt: new Date().toISOString(),
      evidenceHash: verificationHash,
    };

    this.portfolio.positions.unshift(position);
    this.portfolio.marginUsed = Number((this.portfolio.marginUsed + requiredMargin).toFixed(2));
    this.portfolio.totalTrades += 1;
    this.recomputeMarkToMarket();
    this.persist();

    return { order, position };
  }

  public closePosition(positionId: string): { position: TradingPosition; portfolio: Portfolio } {
    const pos = this.portfolio.positions.find((p) => p.id === positionId && p.status === 'OPEN');
    if (!pos) {
      throw new Error(`Position not found or already closed: ${positionId}`);
    }

    const quote = globalMarketEngine.getQuote();
    const exitPrice = pos.side === 'BUY' ? quote.bid : quote.ask;
    const diff = pos.side === 'BUY' ? exitPrice - pos.entryPrice : pos.entryPrice - exitPrice;
    const realized = Number((diff * pos.quantity * 100).toFixed(2));
    const isWin = realized > 0;

    pos.status = 'CLOSED';
    pos.closedAt = new Date().toISOString();
    pos.closePrice = exitPrice;
    pos.realizedPnl = realized;
    pos.unrealizedPnl = 0;

    this.portfolio.balance = Number((this.portfolio.balance + realized).toFixed(2));
    this.portfolio.marginUsed = Math.max(0, Number((this.portfolio.marginUsed - pos.marginUsed).toFixed(2)));
    this.portfolio.realizedPnl = Number((this.portfolio.realizedPnl + realized).toFixed(2));

    if (isWin) this.portfolio.winCount += 1;
    else this.portfolio.lossCount += 1;

    const totalResolved = this.portfolio.winCount + this.portfolio.lossCount;
    this.portfolio.winRate = totalResolved > 0 ? Number((this.portfolio.winCount / totalResolved).toFixed(3)) : 0;

    this.recomputeMarkToMarket();
    this.persist();

    return { position: pos, portfolio: this.portfolio };
  }

  public resetPortfolio(): Portfolio {
    this.portfolio.balance = this.portfolio.initialBalance;
    this.portfolio.equity = this.portfolio.initialBalance;
    this.portfolio.marginUsed = 0;
    this.portfolio.freeMargin = this.portfolio.initialBalance;
    this.portfolio.marginLevelPercent = 100.0;
    this.portfolio.unrealizedPnl = 0;
    this.portfolio.realizedPnl = 0;
    this.portfolio.winCount = 0;
    this.portfolio.lossCount = 0;
    this.portfolio.totalTrades = 0;
    this.portfolio.winRate = 0;
    this.portfolio.positions = [];
    this.portfolio.updatedAt = new Date().toISOString();
    this.orders = [];
    this.persist();
    return this.portfolio;
  }

  private recomputeMarkToMarket(): void {
    const quote = globalMarketEngine.getQuote();
    let totalUnrealized = 0;

    for (const pos of this.portfolio.positions) {
      if (pos.status === 'OPEN') {
        const current = pos.side === 'BUY' ? quote.bid : quote.ask;
        const diff = pos.side === 'BUY' ? current - pos.entryPrice : pos.entryPrice - current;
        pos.currentPrice = current;
        pos.unrealizedPnl = Number((diff * pos.quantity * 100).toFixed(2));
        totalUnrealized += pos.unrealizedPnl;
      }
    }

    this.portfolio.unrealizedPnl = Number(totalUnrealized.toFixed(2));
    this.portfolio.equity = Number((this.portfolio.balance + totalUnrealized).toFixed(2));
    this.portfolio.freeMargin = Math.max(0, Number((this.portfolio.equity - this.portfolio.marginUsed).toFixed(2)));
    this.portfolio.marginLevelPercent =
      this.portfolio.marginUsed > 0
        ? Number(((this.portfolio.equity / this.portfolio.marginUsed) * 100).toFixed(1))
        : 100.0;
    this.portfolio.updatedAt = new Date().toISOString();
  }

  private persist(): void {
    try {
      const dir = dirname(this.storagePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      const data = {
        portfolio: this.portfolio,
        orders: this.orders.slice(0, 100),
      };
      const tmp = `${this.storagePath}.${randomUUID()}.tmp`;
      writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
      renameSync(tmp, this.storagePath);
    } catch {
      /* ambient fallback in constrained environments */
    }
  }

  private restore(): void {
    try {
      if (existsSync(this.storagePath)) {
        const content = readFileSync(this.storagePath, 'utf8');
        const parsed = JSON.parse(content);
        if (parsed?.portfolio) {
          this.portfolio = parsed.portfolio;
        }
        if (Array.isArray(parsed?.orders)) {
          this.orders = parsed.orders;
        }
      }
    } catch {
      /* ambient fallback */
    }
  }
}

export const globalTradingEngine = new TradingEngine();

export function registerTradingRoute(fastify: FastifyInstance): void {
  // 1. Portfolio & Summary
  fastify.get('/v1/trading/portfolio', async () => {
    return {
      success: true,
      portfolio: globalTradingEngine.getPortfolio(),
    };
  });

  // 2. Submit Order (with Sovereign Admission Gate)
  fastify.post('/v1/trading/order', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as OrderInput & { lots?: number };
    const quantity = typeof body?.quantity === 'number' ? body.quantity : (typeof body?.lots === 'number' ? body.lots : undefined);
    if (!body || !body.side || typeof quantity !== 'number') {
      reply.status(400);
      return { success: false, error: 'INVALID_ORDER_INPUT: side and quantity (or lots) required' };
    }

    const orderInput: OrderInput = {
      ...body,
      quantity,
    };

    const result = globalTradingEngine.submitOrder(orderInput);
    if (!result.order.verificationGate.passed) {
      reply.status(422);
      return {
        success: false,
        order: result.order,
        error: result.order.rejectionReason,
      };
    }

    return {
      success: true,
      order: result.order,
      position: result.position,
      portfolio: globalTradingEngine.getPortfolio(),
    };
  });

  // 3. List Orders
  fastify.get('/v1/trading/orders', async () => {
    return {
      success: true,
      orders: globalTradingEngine.getOrders(),
    };
  });

  // 4. List Positions
  fastify.get('/v1/trading/positions', async (request: FastifyRequest) => {
    const query = request.query as { status?: 'OPEN' | 'CLOSED' };
    return {
      success: true,
      positions: globalTradingEngine.getPositions(query?.status),
    };
  });

  // 5. Close Position
  fastify.post('/v1/trading/positions/:id/close', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };
    try {
      const result = globalTradingEngine.closePosition(params.id);
      return {
        success: true,
        position: result.position,
        portfolio: result.portfolio,
      };
    } catch (err: any) {
      reply.status(404);
      return {
        success: false,
        error: err.message,
      };
    }
  });

  // 6. Risk Guardrails Audit Report
  fastify.get('/v1/trading/risk', async () => {
    return {
      success: true,
      risk: globalTradingEngine.evaluateRiskGuardrails(),
    };
  });

  // 7. Reset Paper Portfolio (Dev/Testing)
  fastify.post('/v1/trading/reset', async () => {
    return {
      success: true,
      portfolio: globalTradingEngine.resetPortfolio(),
    };
  });
}
