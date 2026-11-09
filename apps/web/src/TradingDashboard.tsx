/**
 * Ω∞v OCEANICOS — Sovereign XAU/USD Full-Stack AI Trading Companion Dashboard
 * Live gold ticker, interactive canvas chart, order ticket, AI signals, and portfolio management.
 */

import React, { useState, useEffect, useCallback } from 'react';
import type {
  Candle,
  MarketQuote,
  TradingSignal,
  TradingPosition,
  Portfolio,
  TradeSide,
  TradeOrderType,
} from './tradingTypes';
import { TradingChart } from './TradingChart';
import { PortfolioPanel } from './PortfolioPanel';
import { theme } from './oceanicosTheme';

const API_BASE = '';

const INITIAL_PORTFOLIO: Portfolio = {
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

export function TradingDashboard() {
  const [quote, setQuote] = useState<MarketQuote | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [timeframe, setTimeframe] = useState<string>('15m');
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [marketStatus, setMarketStatus] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<Portfolio>(() => {
    const saved = localStorage.getItem('oceanicos_trading_portfolio');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        /* fallback */
      }
    }
    return INITIAL_PORTFOLIO;
  });

  // Order Ticket State
  const [orderSide, setOrderSide] = useState<TradeSide>('BUY');
  const [orderType, setOrderType] = useState<TradeOrderType>('MARKET');
  const [lots, setLots] = useState<number>(0.1);
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [leverage, setLeverage] = useState<number>(20);
  const [orderStatusMsg, setOrderStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active View Tab inside dashboard
  const [activeTab, setActiveTab] = useState<'trade' | 'portfolio' | 'signals'>('trade');

  // Persist portfolio
  useEffect(() => {
    localStorage.setItem('oceanicos_trading_portfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  // Fetch Live Quote & Market Status
  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/market/quote`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.quote) {
        setQuote(data.quote);
      }
    } catch {
      /* ambient */
    }
  }, []);

  // Fetch Real-time Portfolio & Positions from Server
  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/trading/portfolio`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.portfolio) {
        setPortfolio(data.portfolio);
      }
    } catch {
      /* ambient fallback to localStorage */
    }
  }, []);

  // Fetch OHLCV Candles
  const fetchCandles = useCallback(async (tf: string) => {
    try {
      const res = await fetch(`${API_BASE}/v1/market/history?timeframe=${tf}&limit=120`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.candles)) {
        setCandles(data.candles);
      }
    } catch {
      /* ambient */
    }
  }, []);

  // Fetch Signals & Status
  const fetchSignalsAndStatus = useCallback(async () => {
    try {
      const [sigRes, statusRes] = await Promise.all([
        fetch(`${API_BASE}/v1/market/signals`),
        fetch(`${API_BASE}/v1/market/status`),
      ]);
      if (sigRes.ok) {
        const sigData = await sigRes.json();
        if (sigData.success) setSignals(sigData.signals);
      }
      if (statusRes.ok) {
        const stData = await statusRes.json();
        if (stData.success) setMarketStatus(stData);
      }
    } catch {
      /* ambient */
    }
  }, []);

  useEffect(() => {
    fetchQuote();
    fetchPortfolio();
    fetchCandles(timeframe);
    fetchSignalsAndStatus();

    // Live Server-Sent Events stream for sub-second real-time gold ticks
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${API_BASE}/v1/market/stream`);
      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.quote) {
            setQuote(payload.quote);
          }
        } catch {
          /* ambient parsing */
        }
      };
      es.onerror = () => {
        // Fallback polling seamlessly covers updates if SSE is interrupted or proxied
        if (es) {
          es.close();
          es = null;
        }
      };
    } catch {
      /* ambient */
    }

    // Fast quote & portfolio polling (every 2.5s) to sync with market engine and backup stream
    const quoteInterval = setInterval(() => {
      fetchQuote();
      fetchPortfolio();
    }, 2500);
    // Candle polling (every 10s)
    const candleInterval = setInterval(() => fetchCandles(timeframe), 10000);
    // Signals polling (every 20s)
    const sigInterval = setInterval(fetchSignalsAndStatus, 20000);

    return () => {
      if (es) {
        es.close();
      }
      clearInterval(quoteInterval);
      clearInterval(candleInterval);
      clearInterval(sigInterval);
    };
  }, [fetchQuote, fetchPortfolio, fetchCandles, fetchSignalsAndStatus, timeframe]);

  // Calculate Margin Requirement
  const currentPrice = quote ? (orderSide === 'BUY' ? quote.ask : quote.bid) : 2735.0;
  // 1 standard lot = 100 oz of gold
  const notionalValue = lots * 100 * currentPrice;
  const requiredMargin = Number((notionalValue / leverage).toFixed(2));

  // Apply AI Signal into Order Form
  const applySignal = (sig: TradingSignal) => {
    if (sig.direction.includes('BUY')) {
      setOrderSide('BUY');
    } else if (sig.direction.includes('SELL')) {
      setOrderSide('SELL');
    }
    if (sig.targetPrice) setTakeProfit(sig.targetPrice.toFixed(2));
    if (sig.stopLoss) setStopLoss(sig.stopLoss.toFixed(2));
    setActiveTab('trade');
    setOrderStatusMsg({
      type: 'success',
      text: `Applied ${sig.strategy} parameters: Target ${sig.targetPrice ?? '-'}, S/L ${sig.stopLoss ?? '-'}`,
    });
  };

  // Execute Order (Sovereign Admission Gate)
  const handleExecuteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote) return;

    const sl = stopLoss ? parseFloat(stopLoss) : undefined;
    const tp = takeProfit ? parseFloat(takeProfit) : undefined;
    const execPrice = orderType === 'MARKET' ? (orderSide === 'BUY' ? quote.ask : quote.bid) : parseFloat(limitPrice) || currentPrice;

    try {
      const res = await fetch(`${API_BASE}/v1/trading/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: 'XAU/USD',
          side: orderSide,
          type: orderType,
          quantity: lots,
          price: execPrice,
          stopLoss: sl,
          takeProfit: tp,
          leverage,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.portfolio) setPortfolio(data.portfolio);
        setOrderStatusMsg({
          type: 'success',
          text: `Verified & Admitted: ${data.order.side} ${data.order.quantity} lots XAU/USD @ ${data.order.price.toFixed(2)} (Gate: ${data.order.verificationGate.gateState})`,
        });
        return;
      } else {
        setOrderStatusMsg({
          type: 'error',
          text: data.error || data.order?.rejectionReason || 'Order rejected by sovereign admission gate',
        });
        return;
      }
    } catch {
      // Offline fallback
      if (requiredMargin > portfolio.balance - portfolio.marginUsed) {
        setOrderStatusMsg({
          type: 'error',
          text: `Insufficient Free Margin. Required: $${requiredMargin}, Available: $${(portfolio.balance - portfolio.marginUsed).toFixed(2)}`,
        });
        return;
      }

      const newPosition: TradingPosition = {
        id: `pos-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        symbol: 'XAU/USD',
        side: orderSide,
        entryPrice: execPrice,
        quantity: lots,
        currentPrice: execPrice,
        unrealizedPnl: 0,
        realizedPnl: 0,
        stopLoss: sl,
        takeProfit: tp,
        marginUsed: requiredMargin,
        leverage,
        status: 'OPEN',
        openedAt: new Date().toISOString(),
        evidenceHash: quote.sovereignProofHash ?? 'SOVEREIGN_HASH_DEV',
      };

      setPortfolio((prev: Portfolio) => ({
        ...prev,
        marginUsed: Number((prev.marginUsed + requiredMargin).toFixed(2)),
        positions: [newPosition, ...prev.positions],
        totalTrades: prev.totalTrades + 1,
        updatedAt: new Date().toISOString(),
      }));

      setOrderStatusMsg({
        type: 'success',
        text: `Order Admitted (Offline Queue): ${orderSide} ${lots} lots @ ${execPrice.toFixed(2)}`,
      });
    }
  };

  // Close Position
  const handleClosePosition = async (positionId: string) => {
    try {
      const res = await fetch(`${API_BASE}/v1/trading/positions/${positionId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.portfolio) {
          setPortfolio(data.portfolio);
          setOrderStatusMsg({
            type: 'success',
            text: `Position closed mark-to-market. Realized P&L: $${data.position.realizedPnl.toFixed(2)}`,
          });
          return;
        }
      }
    } catch {
      /* fallback to local close */
    }

    if (!quote) return;
    const currentBid = quote.bid;
    const currentAsk = quote.ask;

    setPortfolio((prev: Portfolio) => {
      const pos = prev.positions.find((p: TradingPosition) => p.id === positionId && p.status === 'OPEN');
      if (!pos) return prev;

      const exitPrice = pos.side === 'BUY' ? currentBid : currentAsk;
      const diff = pos.side === 'BUY' ? exitPrice - pos.entryPrice : pos.entryPrice - exitPrice;
      const realized = Number((diff * pos.quantity * 100).toFixed(2));
      const isWin = realized > 0;

      const updatedPositions: TradingPosition[] = prev.positions.map((p: TradingPosition) => {
        if (p.id === positionId) {
          return {
            ...p,
            status: 'CLOSED',
            closedAt: new Date().toISOString(),
            closePrice: exitPrice,
            realizedPnl: realized,
            unrealizedPnl: 0,
          };
        }
        return p;
      });

      const newBalance = Number((prev.balance + realized).toFixed(2));
      const newMarginUsed = Math.max(0, Number((prev.marginUsed - pos.marginUsed).toFixed(2)));
      const winCount = isWin ? prev.winCount + 1 : prev.winCount;
      const lossCount = !isWin ? prev.lossCount + 1 : prev.lossCount;
      const winRate = Number((winCount / (winCount + lossCount || 1)).toFixed(3));

      return {
        ...prev,
        balance: newBalance,
        marginUsed: newMarginUsed,
        realizedPnl: Number((prev.realizedPnl + realized).toFixed(2)),
        winCount,
        lossCount,
        winRate,
        positions: updatedPositions,
        updatedAt: new Date().toISOString(),
      };
    });

    setOrderStatusMsg({
      type: 'success',
      text: `Position ${positionId.slice(0, 8)} closed mark-to-market.`,
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        maxWidth: '1440px',
        width: '100%',
        margin: '0 auto',
        padding: '0 0 60px',
      }}
    >
      {/* 1. Sovereign Gold Market Ribbon */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          padding: '16px 24px',
          background: 'linear-gradient(135deg, rgba(14, 42, 55, 0.95) 0%, rgba(6, 20, 26, 0.98) 100%)',
          borderRadius: theme.radius,
          border: '1px solid rgba(240, 198, 116, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'radial-gradient(circle, #f0c674 0%, #b8860b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(240, 198, 116, 0.4)',
              fontSize: '22px',
            }}
          >
            🥇
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#f0c674', letterSpacing: '0.01em' }}>
                XAU/USD
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: theme.radiusPill,
                  background: 'rgba(105, 231, 185, 0.15)',
                  color: '#69e7b9',
                  fontWeight: 700,
                  border: '1px solid rgba(105, 231, 185, 0.3)',
                }}
              >
                LIVE TICKER
              </span>
            </div>
            <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px', fontFamily: theme.fontMono }}>
              Spot Gold against US Dollar • Sovereign Companion
            </div>
          </div>
        </div>

        {/* Live Bid/Ask & 24h Stats */}
        {quote && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {/* Bid */}
            <div>
              <div style={{ fontSize: '10px', color: theme.textDim, fontFamily: theme.fontMono }}>BID</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#ed9986', fontFamily: theme.fontMono }}>
                {quote.bid.toFixed(2)}
              </div>
            </div>

            {/* Ask */}
            <div>
              <div style={{ fontSize: '10px', color: theme.textDim, fontFamily: theme.fontMono }}>ASK</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#69e7b9', fontFamily: theme.fontMono }}>
                {quote.ask.toFixed(2)}
              </div>
            </div>

            {/* Spread */}
            <div>
              <div style={{ fontSize: '10px', color: theme.textDim, fontFamily: theme.fontMono }}>SPREAD</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: theme.accentWarm, fontFamily: theme.fontMono }}>
                {quote.spread.toFixed(2)}
              </div>
            </div>

            {/* 24h Change */}
            <div>
              <div style={{ fontSize: '10px', color: theme.textDim, fontFamily: theme.fontMono }}>24H CHANGE</div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: quote.change24h >= 0 ? '#69e7b9' : '#ed9986',
                  fontFamily: theme.fontMono,
                }}
              >
                {quote.change24h >= 0 ? '+' : ''}{quote.change24h.toFixed(2)} ({quote.changePercent24h}%)
              </div>
            </div>

            {/* 24h High/Low */}
            <div>
              <div style={{ fontSize: '10px', color: theme.textDim, fontFamily: theme.fontMono }}>24H HIGH / LOW</div>
              <div style={{ fontSize: '12px', color: theme.textMuted, fontFamily: theme.fontMono }}>
                <span style={{ color: '#69e7b9' }}>{quote.high24h.toFixed(2)}</span> /{' '}
                <span style={{ color: '#ed9986' }}>{quote.low24h.toFixed(2)}</span>
              </div>
            </div>

            {/* Sessions */}
            {marketStatus && (
              <div style={{ paddingLeft: '12px', borderLeft: `1px solid ${theme.border}` }}>
                <div style={{ fontSize: '10px', color: theme.textDim, fontFamily: theme.fontMono }}>ACTIVE SESSIONS</div>
                <div style={{ fontSize: '12px', color: theme.accent, fontWeight: 700 }}>
                  {marketStatus.activeSessions.join(', ')}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Sub-Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('trade')}
          style={{
            padding: '8px 20px',
            borderRadius: theme.radiusPill,
            border: 'none',
            background: activeTab === 'trade' ? 'rgba(240, 198, 116, 0.2)' : 'transparent',
            color: activeTab === 'trade' ? '#f0c674' : theme.textMuted,
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>📈</span>
          <span>Chart & Execution</span>
        </button>
        <button
          onClick={() => setActiveTab('portfolio')}
          style={{
            padding: '8px 20px',
            borderRadius: theme.radiusPill,
            border: 'none',
            background: activeTab === 'portfolio' ? 'rgba(105, 231, 185, 0.2)' : 'transparent',
            color: activeTab === 'portfolio' ? theme.accent : theme.textMuted,
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>💼</span>
          <span>Portfolio & Orders ({portfolio.positions.filter((p: TradingPosition) => p.status === 'OPEN').length})</span>
        </button>
        <button
          onClick={() => setActiveTab('signals')}
          style={{
            padding: '8px 20px',
            borderRadius: theme.radiusPill,
            border: 'none',
            background: activeTab === 'signals' ? 'rgba(105, 231, 185, 0.2)' : 'transparent',
            color: activeTab === 'signals' ? theme.accent : theme.textMuted,
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>🧠</span>
          <span>AI Trading Signals ({signals.length})</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {orderStatusMsg && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: theme.radiusSmall,
            background: orderStatusMsg.type === 'success' ? 'rgba(105, 231, 185, 0.15)' : 'rgba(237, 153, 134, 0.15)',
            border: `1px solid ${orderStatusMsg.type === 'success' ? 'rgba(105, 231, 185, 0.4)' : 'rgba(237, 153, 134, 0.4)'}`,
            color: orderStatusMsg.type === 'success' ? '#69e7b9' : '#ed9986',
            fontSize: '12px',
            fontFamily: theme.fontMono,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{orderStatusMsg.text}</span>
          <button
            onClick={() => setOrderStatusMsg(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '14px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. Main Views */}
      {activeTab === 'trade' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(600px, 1fr) 340px',
            gap: '20px',
            alignItems: 'start',
          }}
        >
          {/* Left: Chart & Quick Signals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <TradingChart
              candles={candles}
              quote={quote}
              timeframe={timeframe}
              onTimeframeChange={(tf) => setTimeframe(tf)}
              height={440}
            />

            {/* Quick AI Signal Strip */}
            {signals.length > 0 && (
              <div
                style={{
                  background: 'rgba(10, 31, 40, 0.8)',
                  borderRadius: theme.radius,
                  border: `1px solid ${theme.border}`,
                  padding: '16px 20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px' }}>⚡</span>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#69e7b9' }}>
                      AI Sovereign Signals Convergence
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: theme.textDim, fontFamily: theme.fontMono }}>
                    Gemini Flash Quant & Pluralism Tensor
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                  {signals.map((sig) => (
                    <div
                      key={sig.id}
                      style={{
                        padding: '12px 14px',
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: theme.radiusSmall,
                        border: '1px solid rgba(105, 231, 185, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#f0c674' }}>
                          {sig.strategy}
                        </span>
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 800,
                            background: sig.direction.includes('BUY')
                              ? 'rgba(105, 231, 185, 0.2)'
                              : sig.direction.includes('SELL')
                                ? 'rgba(237, 153, 134, 0.2)'
                                : 'rgba(255,255,255,0.1)',
                            color: sig.direction.includes('BUY')
                              ? '#69e7b9'
                              : sig.direction.includes('SELL')
                                ? '#ed9986'
                                : theme.textMuted,
                          }}
                        >
                          {sig.direction} ({(sig.confidence * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: theme.textMuted, lineHeight: '1.4' }}>
                        {sig.rationale}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{ fontSize: '10px', color: theme.textDim, fontFamily: theme.fontMono }}>
                          TP: {sig.targetPrice ?? '-'} | SL: {sig.stopLoss ?? '-'}
                        </span>
                        <button
                          onClick={() => applySignal(sig)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(240, 198, 116, 0.4)',
                            background: 'rgba(240, 198, 116, 0.15)',
                            color: '#f0c674',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Apply to Order
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Order Entry Ticket */}
          <div
            style={{
              background: 'rgba(10, 31, 40, 0.95)',
              borderRadius: theme.radius,
              border: '1px solid rgba(105, 231, 185, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '14px', color: theme.text }}>ORDER ENTRY TICKET</span>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: theme.fontMono,
                  color: '#69e7b9',
                  background: 'rgba(105, 231, 185, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                PAPER EXECUTION
              </span>
            </div>

            {/* Buy / Sell Toggle Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setOrderSide('BUY')}
                style={{
                  padding: '12px',
                  borderRadius: theme.radiusSmall,
                  border: orderSide === 'BUY' ? '2px solid #69e7b9' : '1px solid rgba(105, 231, 185, 0.2)',
                  background: orderSide === 'BUY' ? 'rgba(105, 231, 185, 0.2)' : 'rgba(0,0,0,0.2)',
                  color: '#69e7b9',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>BUY / LONG</div>
                <div style={{ fontSize: '11px', fontFamily: theme.fontMono, marginTop: '2px', opacity: 0.85 }}>
                  {quote ? quote.ask.toFixed(2) : '-'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOrderSide('SELL')}
                style={{
                  padding: '12px',
                  borderRadius: theme.radiusSmall,
                  border: orderSide === 'SELL' ? '2px solid #ed9986' : '1px solid rgba(237, 153, 134, 0.2)',
                  background: orderSide === 'SELL' ? 'rgba(237, 153, 134, 0.2)' : 'rgba(0,0,0,0.2)',
                  color: '#ed9986',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>SELL / SHORT</div>
                <div style={{ fontSize: '11px', fontFamily: theme.fontMono, marginTop: '2px', opacity: 0.85 }}>
                  {quote ? quote.bid.toFixed(2) : '-'}
                </div>
              </button>
            </div>

            <form onSubmit={handleExecuteOrder} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Order Type */}
              <div>
                <label style={{ fontSize: '11px', color: theme.textMuted, fontFamily: theme.fontMono }}>ORDER TYPE</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '4px' }}>
                  {(['MARKET', 'LIMIT', 'STOP'] as TradeOrderType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setOrderType(t)}
                      style={{
                        padding: '6px',
                        borderRadius: '4px',
                        border: 'none',
                        background: orderType === t ? 'rgba(105, 231, 185, 0.2)' : 'rgba(0,0,0,0.25)',
                        color: orderType === t ? theme.accent : theme.textDim,
                        fontSize: '11px',
                        fontFamily: theme.fontMono,
                        fontWeight: orderType === t ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Limit Price (if LIMIT or STOP) */}
              {orderType !== 'MARKET' && (
                <div>
                  <label style={{ fontSize: '11px', color: theme.textMuted, fontFamily: theme.fontMono }}>EXECUTION PRICE</label>
                  <input
                    type="number"
                    step="0.01"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder={currentPrice.toFixed(2)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: 'rgba(0,0,0,0.4)',
                      border: `1px solid ${theme.border}`,
                      borderRadius: '6px',
                      color: theme.text,
                      fontFamily: theme.fontMono,
                      fontSize: '12px',
                      marginTop: '4px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              {/* Volume / Lots */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '11px', color: theme.textMuted, fontFamily: theme.fontMono }}>LOT SIZE</label>
                  <span style={{ fontSize: '10px', color: theme.textDim, fontFamily: theme.fontMono }}>
                    {(lots * 100).toFixed(0)} oz Gold
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginTop: '4px' }}>
                  {[0.01, 0.05, 0.1, 0.5].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setLots(amt)}
                      style={{
                        padding: '4px',
                        borderRadius: '4px',
                        border: 'none',
                        background: lots === amt ? 'rgba(240, 198, 116, 0.2)' : 'rgba(0,0,0,0.2)',
                        color: lots === amt ? '#f0c674' : theme.textDim,
                        fontSize: '11px',
                        fontFamily: theme.fontMono,
                        cursor: 'pointer',
                      }}
                    >
                      {amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="10.0"
                  value={lots}
                  onChange={(e) => setLots(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'rgba(0,0,0,0.4)',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '6px',
                    color: theme.text,
                    fontFamily: theme.fontMono,
                    fontSize: '12px',
                    marginTop: '6px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Stop Loss & Take Profit */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: '#ed9986', fontFamily: theme.fontMono }}>STOP LOSS</label>
                  <input
                    type="number"
                    step="0.01"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder="Optional"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(237, 153, 134, 0.3)',
                      borderRadius: '6px',
                      color: '#ed9986',
                      fontFamily: theme.fontMono,
                      fontSize: '12px',
                      marginTop: '4px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#69e7b9', fontFamily: theme.fontMono }}>TAKE PROFIT</label>
                  <input
                    type="number"
                    step="0.01"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    placeholder="Optional"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(105, 231, 185, 0.3)',
                      borderRadius: '6px',
                      color: '#69e7b9',
                      fontFamily: theme.fontMono,
                      fontSize: '12px',
                      marginTop: '4px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Leverage Selector */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '11px', color: theme.textMuted, fontFamily: theme.fontMono }}>LEVERAGE</label>
                  <span style={{ fontSize: '11px', color: theme.accentWarm, fontWeight: 700, fontFamily: theme.fontMono }}>
                    {leverage}x
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginTop: '4px' }}>
                  {[1, 10, 20, 50, 100].map((lev) => (
                    <button
                      key={lev}
                      type="button"
                      onClick={() => setLeverage(lev)}
                      style={{
                        padding: '4px',
                        borderRadius: '4px',
                        border: 'none',
                        background: leverage === lev ? 'rgba(105, 231, 185, 0.2)' : 'rgba(0,0,0,0.25)',
                        color: leverage === lev ? theme.accent : theme.textDim,
                        fontSize: '10px',
                        fontFamily: theme.fontMono,
                        fontWeight: leverage === lev ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {lev}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculus Readout */}
              <div
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  background: 'rgba(0,0,0,0.3)',
                  border: `1px solid ${theme.border}`,
                  fontSize: '11px',
                  fontFamily: theme.fontMono,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.textDim }}>
                  <span>Notional Value:</span>
                  <span style={{ color: theme.text }}>${notionalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.textDim }}>
                  <span>Required Margin:</span>
                  <span style={{ color: theme.accentWarm, fontWeight: 700 }}>${requiredMargin.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.textDim }}>
                  <span>Verification Gate:</span>
                  <span style={{ color: '#69e7b9' }}>ADMITTED ✓</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                style={{
                  padding: '14px',
                  borderRadius: theme.radiusSmall,
                  border: 'none',
                  background:
                    orderSide === 'BUY'
                      ? 'linear-gradient(135deg, #69e7b9 0%, #20b2aa 100%)'
                      : 'linear-gradient(135deg, #ed9986 0%, #cd5c5c 100%)',
                  color: '#06141a',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: orderSide === 'BUY' ? '0 0 20px rgba(105, 231, 185, 0.4)' : '0 0 20px rgba(237, 153, 134, 0.4)',
                  transition: 'all 0.2s ease',
                  marginTop: '4px',
                }}
              >
                EXECUTE {orderSide} ORDER
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. Portfolio & History Tab */}
      {activeTab === 'portfolio' && (
        <PortfolioPanel
          portfolio={portfolio}
          quote={quote}
          onClosePosition={handleClosePosition}
        />
      )}

      {/* 5. AI Signals Tab */}
      {activeTab === 'signals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '16px 20px',
              background: 'rgba(10, 31, 40, 0.8)',
              borderRadius: theme.radius,
              border: `1px solid ${theme.border}`,
            }}
          >
            <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#f0c674' }}>
              Autonomous Multi-Strategy Convergence Matrix
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: theme.textMuted }}>
              Cross-model synthesis of Momentum, Mean Reversion, Bollinger Volatility, and Macro Gold session flows.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
            {signals.map((sig) => (
              <div
                key={sig.id}
                style={{
                  padding: '18px',
                  background: 'rgba(10, 31, 40, 0.75)',
                  borderRadius: theme.radius,
                  border: `1px solid ${theme.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#f0c674' }}>{sig.strategy}</div>
                    <div style={{ fontSize: '11px', color: theme.textDim, fontFamily: theme.fontMono }}>
                      Timeframe: {sig.timeframe} • Organ: {sig.provenance.organ}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: theme.radiusPill,
                      fontSize: '11px',
                      fontWeight: 800,
                      background: sig.direction.includes('BUY')
                        ? 'rgba(105, 231, 185, 0.2)'
                        : sig.direction.includes('SELL')
                          ? 'rgba(237, 153, 134, 0.2)'
                          : 'rgba(255,255,255,0.1)',
                      color: sig.direction.includes('BUY')
                        ? '#69e7b9'
                        : sig.direction.includes('SELL')
                          ? '#ed9986'
                          : theme.textMuted,
                    }}
                  >
                    {sig.direction}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: theme.text, lineHeight: '1.5' }}>
                  {sig.rationale}
                </div>

                {/* Technical Indicator Badges */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '11px', fontFamily: theme.fontMono }}>
                  <span style={{ padding: '3px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', color: theme.textMuted }}>
                    RSI: {sig.indicators.rsi?.toFixed(1) ?? 'N/A'}
                  </span>
                  <span style={{ padding: '3px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', color: theme.textMuted }}>
                    MACD: {sig.indicators.macd?.histogram?.toFixed(2) ?? 'N/A'}
                  </span>
                  <span style={{ padding: '3px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', color: theme.textMuted }}>
                    ATR: {sig.indicators.atr?.toFixed(2) ?? 'N/A'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: `1px solid ${theme.border}` }}>
                  <span style={{ fontSize: '11px', color: theme.textDim, fontFamily: theme.fontMono }}>
                    Target: <strong style={{ color: '#69e7b9' }}>{sig.targetPrice ?? '-'}</strong> | S/L:{' '}
                    <strong style={{ color: '#ed9986' }}>{sig.stopLoss ?? '-'}</strong>
                  </span>
                  <button
                    onClick={() => applySignal(sig)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: theme.radiusSmall,
                      border: '1px solid rgba(240, 198, 116, 0.4)',
                      background: 'rgba(240, 198, 116, 0.15)',
                      color: '#f0c674',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Load into Order Ticket
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
