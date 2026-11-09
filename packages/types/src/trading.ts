/**
 * Ω∞v OCEANICOS — XAU/USD Sovereign Trading Companion Types
 * Compressed root equation trading contracts and entities.
 */

export type TradeSide = 'BUY' | 'SELL';
export type TradeOrderType = 'MARKET' | 'LIMIT' | 'STOP';
export type TradeOrderStatus = 'PENDING' | 'EXECUTED' | 'REJECTED' | 'CANCELLED';
export type TradePositionStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketQuote {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  spread: number;
  high24h: number;
  low24h: number;
  change24h: number;
  changePercent24h: number;
  timestamp: string;
  source: 'live-stream' | 'gold-api' | 'synthetic-drift' | 'cached';
  sovereignProofHash?: string;
}

export interface TradingOrder {
  id: string;
  symbol: string;
  side: TradeSide;
  type: TradeOrderType;
  price: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage?: number;
  status: TradeOrderStatus;
  createdAt: string;
  executedAt?: string;
  executedPrice?: number;
  rejectionReason?: string;
  verificationGate: {
    passed: boolean;
    rule: string;
    gateState: 'ADMITTED' | 'REJECTED' | 'PENDING';
    verifiedBy: string;
  };
  clientOrderId?: string;
}

export interface TradingPosition {
  id: string;
  symbol: string;
  side: TradeSide;
  entryPrice: number;
  quantity: number;
  currentPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  stopLoss?: number;
  takeProfit?: number;
  marginUsed: number;
  leverage: number;
  status: TradePositionStatus;
  openedAt: string;
  closedAt?: string;
  closePrice?: number;
  evidenceHash: string;
}

export type SignalDirection = 'BUY' | 'SELL' | 'HOLD' | 'STRONG_BUY' | 'STRONG_SELL';

export type SignalStrategy =
  | 'MOMENTUM_CONVERGENCE'
  | 'PLURALISTIC_FUSION'
  | 'MEAN_REVERSION'
  | 'GOLD_BREAKOUT'
  | 'MACD_RSI_VOLATILITY'
  | 'WATER_BODY_FLOW';

export interface TechnicalIndicators {
  rsi?: number;
  macd?: {
    line: number;
    signal: number;
    histogram: number;
  };
  sma20?: number;
  sma50?: number;
  ema12?: number;
  ema26?: number;
  bollinger?: {
    upper: number;
    middle: number;
    lower: number;
  };
  atr?: number;
}

export interface TradingSignal {
  id: string;
  symbol: string;
  direction: SignalDirection;
  confidence: number; // 0.0 - 1.0
  strategy: SignalStrategy;
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  targetPrice?: number;
  stopLoss?: number;
  rationale: string;
  indicators: TechnicalIndicators;
  generatedAt: string;
  verified: boolean;
  provenance: {
    organ: string;
    model: string;
    consensusRatio: number;
    sovereignIdentity: string;
  };
}

export interface Portfolio {
  id: string;
  currency: string;
  initialBalance: number;
  balance: number;
  equity: number;
  marginUsed: number;
  freeMargin: number;
  marginLevelPercent: number;
  unrealizedPnl: number;
  realizedPnl: number;
  winCount: number;
  lossCount: number;
  totalTrades: number;
  winRate: number;
  positions: TradingPosition[];
  updatedAt: string;
  sovereignOwner: string;
}

export type RiskLevel = 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
export type RiskStatus = 'NORMAL' | 'WARNING' | 'BREACHED' | 'HALTED';

export interface RiskGuardrailReport {
  id: string;
  riskLevel: RiskLevel;
  status: RiskStatus;
  maxDrawdownLimitPercent: number;
  currentDrawdownPercent: number;
  maxDailyLossLimit: number;
  currentDailyLoss: number;
  maxPositionSizeLots: number;
  maxOpenTrades: number;
  currentOpenTrades: number;
  sovereignGuardrailsEnabled: boolean;
  failClosedTriggered: boolean;
  warnings: string[];
  evaluatedAt: string;
}
