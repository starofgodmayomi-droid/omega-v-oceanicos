/**
 * Ω∞v OCEANICOS — Sovereign XAU/USD Portfolio & Position Ledger
 * Real-time paper trading balance, equity, margin calculus, and open position management.
 */

import React from 'react';
import type { Portfolio, TradingPosition, MarketQuote } from './tradingTypes';
import { theme } from './oceanicosTheme';

interface PortfolioPanelProps {
  portfolio: Portfolio;
  quote: MarketQuote | null;
  onClosePosition: (positionId: string) => void;
}

export function PortfolioPanel({ portfolio, quote, onClosePosition }: PortfolioPanelProps) {
  const currentBid = quote?.bid ?? 2735.0;
  const currentAsk = quote?.ask ?? 2735.35;

  // Compute live unrealized P&L across all open positions
  const positionsWithLivePnl = portfolio.positions.map((pos: TradingPosition) => {
    if (pos.status !== 'OPEN') return pos;
    const currentPrice = pos.side === 'BUY' ? currentBid : currentAsk;
    // For gold, standard lot = 100 troy oz
    const priceDiff = pos.side === 'BUY' ? currentPrice - pos.entryPrice : pos.entryPrice - currentPrice;
    const pnl = Number((priceDiff * pos.quantity * 100).toFixed(2));
    return {
      ...pos,
      currentPrice,
      unrealizedPnl: pnl,
    };
  });

  const totalUnrealizedPnl = positionsWithLivePnl
    .filter((p: TradingPosition) => p.status === 'OPEN')
    .reduce((sum: number, p: TradingPosition) => sum + p.unrealizedPnl, 0);

  const liveEquity = Number((portfolio.balance + totalUnrealizedPnl).toFixed(2));
  const openPositions = positionsWithLivePnl.filter((p: TradingPosition) => p.status === 'OPEN');
  const closedPositions = positionsWithLivePnl.filter((p: TradingPosition) => p.status === 'CLOSED');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        width: '100%',
      }}
    >
      {/* 1. Account Metrics Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
        }}
      >
        {/* Balance */}
        <div
          style={{
            padding: '16px',
            background: 'rgba(10, 31, 40, 0.75)',
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radiusSmall,
          }}
        >
          <div style={{ fontSize: '11px', color: theme.textMuted, fontFamily: theme.fontMono }}>
            ACCOUNT BALANCE
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: theme.text, marginTop: '4px' }}>
            ${portfolio.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '10px', color: theme.textDim, marginTop: '2px' }}>
            {portfolio.currency} Paper Treasury
          </div>
        </div>

        {/* Equity */}
        <div
          style={{
            padding: '16px',
            background: 'rgba(10, 31, 40, 0.75)',
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radiusSmall,
          }}
        >
          <div style={{ fontSize: '11px', color: theme.textMuted, fontFamily: theme.fontMono }}>
            NET EQUITY
          </div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: liveEquity >= portfolio.balance ? '#69e7b9' : '#ed9986',
              marginTop: '4px',
            }}
          >
            ${liveEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '10px', color: theme.textDim, marginTop: '2px' }}>
            Live mark-to-market
          </div>
        </div>

        {/* Floating P&L */}
        <div
          style={{
            padding: '16px',
            background: 'rgba(10, 31, 40, 0.75)',
            border: `1px solid ${totalUnrealizedPnl >= 0 ? 'rgba(105, 231, 185, 0.3)' : 'rgba(237, 153, 134, 0.3)'}`,
            borderRadius: theme.radiusSmall,
          }}
        >
          <div style={{ fontSize: '11px', color: theme.textMuted, fontFamily: theme.fontMono }}>
            FLOATING UNREALIZED P&L
          </div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: totalUnrealizedPnl >= 0 ? '#69e7b9' : '#ed9986',
              marginTop: '4px',
            }}
          >
            {totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toFixed(2)}
          </div>
          <div style={{ fontSize: '10px', color: theme.textDim, marginTop: '2px' }}>
            Realized: ${portfolio.realizedPnl.toFixed(2)}
          </div>
        </div>

        {/* Margin & Free Margin */}
        <div
          style={{
            padding: '16px',
            background: 'rgba(10, 31, 40, 0.75)',
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radiusSmall,
          }}
        >
          <div style={{ fontSize: '11px', color: theme.textMuted, fontFamily: theme.fontMono }}>
            FREE MARGIN / LEVEL
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: theme.accentWarm, marginTop: '4px' }}>
            ${(liveEquity - portfolio.marginUsed).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '10px', color: theme.textDim, marginTop: '2px' }}>
            Used: ${portfolio.marginUsed.toFixed(2)} | Level: {portfolio.marginUsed > 0 ? ((liveEquity / portfolio.marginUsed) * 100).toFixed(0) + '%' : '∞'}
          </div>
        </div>

        {/* Win Rate */}
        <div
          style={{
            padding: '16px',
            background: 'rgba(10, 31, 40, 0.75)',
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radiusSmall,
          }}
        >
          <div style={{ fontSize: '11px', color: theme.textMuted, fontFamily: theme.fontMono }}>
            PERFORMANCE / WIN RATE
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#f0c674', marginTop: '4px' }}>
            {portfolio.totalTrades > 0 ? (portfolio.winRate * 100).toFixed(1) + '%' : 'N/A'}
          </div>
          <div style={{ fontSize: '10px', color: theme.textDim, marginTop: '2px' }}>
            {portfolio.winCount} Wins / {portfolio.lossCount} Losses ({portfolio.totalTrades} Total)
          </div>
        </div>
      </div>

      {/* 2. Open Positions Table */}
      <div
        style={{
          background: 'rgba(10, 31, 40, 0.75)',
          borderRadius: theme.radius,
          border: `1px solid ${theme.border}`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: `1px solid ${theme.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>⚡</span>
            <span style={{ fontWeight: 700, fontSize: '13px', color: theme.text }}>
              Active Positions ({openPositions.length})
            </span>
          </div>
          <span style={{ fontSize: '11px', fontFamily: theme.fontMono, color: theme.textDim }}>
            Mark-to-Market Realtime
          </span>
        </div>

        {openPositions.length === 0 ? (
          <div
            style={{
              padding: '36px',
              textAlign: 'center',
              color: theme.textDim,
              fontSize: '13px',
            }}
          >
            No open gold positions. Enter an order to initiate paper trading.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px', fontFamily: theme.fontMono }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.2)', color: theme.textDim, borderBottom: `1px solid ${theme.border}` }}>
                  <th style={{ padding: '10px 14px' }}>Position ID</th>
                  <th style={{ padding: '10px 14px' }}>Symbol</th>
                  <th style={{ padding: '10px 14px' }}>Side</th>
                  <th style={{ padding: '10px 14px' }}>Lots</th>
                  <th style={{ padding: '10px 14px' }}>Entry</th>
                  <th style={{ padding: '10px 14px' }}>Current</th>
                  <th style={{ padding: '10px 14px' }}>S/L</th>
                  <th style={{ padding: '10px 14px' }}>T/P</th>
                  <th style={{ padding: '10px 14px' }}>Profit/Loss</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {openPositions.map((pos: TradingPosition) => {
                  const isProfit = pos.unrealizedPnl >= 0;
                  return (
                    <tr
                      key={pos.id}
                      style={{
                        borderBottom: '1px solid rgba(105, 231, 185, 0.06)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '12px 14px', color: theme.textMuted }}>{pos.id.slice(0, 10)}...</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#f0c674' }}>{pos.symbol}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            background: pos.side === 'BUY' ? 'rgba(105, 231, 185, 0.15)' : 'rgba(237, 153, 134, 0.15)',
                            color: pos.side === 'BUY' ? '#69e7b9' : '#ed9986',
                          }}
                        >
                          {pos.side}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: theme.text }}>{pos.quantity} lots</td>
                      <td style={{ padding: '12px 14px', color: theme.text }}>{pos.entryPrice.toFixed(2)}</td>
                      <td style={{ padding: '12px 14px', color: theme.text }}>{pos.currentPrice.toFixed(2)}</td>
                      <td style={{ padding: '12px 14px', color: pos.stopLoss ? '#ed9986' : theme.textDim }}>
                        {pos.stopLoss ? pos.stopLoss.toFixed(2) : '-'}
                      </td>
                      <td style={{ padding: '12px 14px', color: pos.takeProfit ? '#69e7b9' : theme.textDim }}>
                        {pos.takeProfit ? pos.takeProfit.toFixed(2) : '-'}
                      </td>
                      <td
                        style={{
                          padding: '12px 14px',
                          fontWeight: 700,
                          color: isProfit ? '#69e7b9' : '#ed9986',
                        }}
                      >
                        {isProfit ? '+' : ''}${pos.unrealizedPnl.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button
                          onClick={() => onClosePosition(pos.id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            border: '1px solid rgba(237, 153, 134, 0.4)',
                            background: 'rgba(237, 153, 134, 0.1)',
                            color: '#ed9986',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Closed Trades History */}
      {closedPositions.length > 0 && (
        <div
          style={{
            background: 'rgba(10, 31, 40, 0.75)',
            borderRadius: theme.radius,
            border: `1px solid ${theme.border}`,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${theme.border}` }}>
            <span style={{ fontWeight: 700, fontSize: '13px', color: theme.textMuted }}>
              Execution History & Provenance ({closedPositions.length})
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px', fontFamily: theme.fontMono }}>
              <thead>
                <tr style={{ color: theme.textDim, borderBottom: `1px solid ${theme.border}` }}>
                  <th style={{ padding: '8px 14px' }}>Ticket</th>
                  <th style={{ padding: '8px 14px' }}>Side</th>
                  <th style={{ padding: '8px 14px' }}>Volume</th>
                  <th style={{ padding: '8px 14px' }}>Entry</th>
                  <th style={{ padding: '8px 14px' }}>Exit</th>
                  <th style={{ padding: '8px 14px' }}>Realized P&L</th>
                  <th style={{ padding: '8px 14px' }}>Evidence Hash</th>
                </tr>
              </thead>
              <tbody>
                {closedPositions.map((pos: TradingPosition) => (
                  <tr key={pos.id} style={{ borderBottom: '1px solid rgba(105, 231, 185, 0.04)' }}>
                    <td style={{ padding: '8px 14px', color: theme.textDim }}>{pos.id.slice(0, 10)}...</td>
                    <td style={{ padding: '8px 14px', color: pos.side === 'BUY' ? '#69e7b9' : '#ed9986' }}>{pos.side}</td>
                    <td style={{ padding: '8px 14px' }}>{pos.quantity}</td>
                    <td style={{ padding: '8px 14px' }}>{pos.entryPrice.toFixed(2)}</td>
                    <td style={{ padding: '8px 14px' }}>{pos.closePrice?.toFixed(2) ?? '-'}</td>
                    <td style={{ padding: '8px 14px', fontWeight: 700, color: pos.realizedPnl >= 0 ? '#69e7b9' : '#ed9986' }}>
                      {pos.realizedPnl >= 0 ? '+' : ''}${pos.realizedPnl.toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 14px', color: theme.textDim }}>{pos.evidenceHash.slice(0, 16)}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
