/**
 * Ω∞v OCEANICOS — Sovereign XAU/USD Candlestick Canvas Chart
 * High-DPI hardware-accelerated canvas chart with SMAs, Volume, Crosshair, and Price Action.
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import type { Candle, MarketQuote } from './tradingTypes';
import { theme } from './oceanicosTheme';

interface TradingChartProps {
  candles: Candle[];
  quote: MarketQuote | null;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  height?: number;
}

export function TradingChart({
  candles,
  quote,
  timeframe,
  onTimeframeChange,
  height = 420,
}: TradingChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height,
  });

  // Calculate 20 & 50 period Simple Moving Averages
  const { sma20, sma50 } = useMemo(() => {
    const s20: (number | null)[] = [];
    const s50: (number | null)[] = [];

    for (let i = 0; i < candles.length; i++) {
      if (i >= 19) {
        const slice20 = candles.slice(i - 19, i + 1);
        const sum20 = slice20.reduce((acc, c) => acc + c.close, 0);
        s20.push(sum20 / 20);
      } else {
        s20.push(null);
      }

      if (i >= 49) {
        const slice50 = candles.slice(i - 49, i + 1);
        const sum50 = slice50.reduce((acc, c) => acc + c.close, 0);
        s50.push(sum50 / 50);
      } else {
        s50.push(null);
      }
    }

    return { sma20: s20, sma50: s50 };
  }, [candles]);

  // Handle Resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const width = Math.floor(entry.contentRect.width);
        if (width > 0) {
          setCanvasDimensions({ width, height });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [height]);

  // Render Loop
  const renderChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height: chartHeight } = canvasDimensions;

    canvas.width = width * dpr;
    canvas.height = chartHeight * dpr;
    ctx.scale(dpr, dpr);

    // Layout dimensions
    const priceScaleWidth = 65;
    const timeScaleHeight = 28;
    const plotWidth = width - priceScaleWidth;
    const plotHeight = chartHeight - timeScaleHeight;
    const volumeHeight = plotHeight * 0.18;
    const candlePlotHeight = plotHeight - volumeHeight - 8;

    // Background
    ctx.fillStyle = '#06141a';
    ctx.fillRect(0, 0, width, chartHeight);

    // Min & Max Price
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 0;

    for (const c of candles) {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVolume) maxVolume = c.volume;
    }

    // Include current quote if within bounds
    if (quote) {
      if (quote.mid < minPrice) minPrice = quote.mid;
      if (quote.mid > maxPrice) maxPrice = quote.mid;
    }

    // Add padding to price range
    const priceRange = maxPrice - minPrice || 1;
    const paddedMin = minPrice - priceRange * 0.05;
    const paddedMax = maxPrice + priceRange * 0.05;
    const paddedRange = paddedMax - paddedMin;

    const getY = (price: number) => {
      return candlePlotHeight - ((price - paddedMin) / paddedRange) * candlePlotHeight + 10;
    };

    // Horizontal Grid Lines & Price Labels
    const gridSteps = 6;
    ctx.font = '10px "DM Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= gridSteps; i++) {
      const priceVal = paddedMin + (paddedRange / gridSteps) * i;
      const y = getY(priceVal);

      // Grid line
      ctx.strokeStyle = 'rgba(105, 231, 185, 0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(plotWidth, y);
      ctx.stroke();

      // Right-side price scale label
      ctx.fillStyle = theme.textDim;
      ctx.fillText(priceVal.toFixed(2), plotWidth + 6, y);
    }

    // Vertical Time Grid Lines
    const candleCount = candles.length;
    const candleWidth = Math.max(3, (plotWidth - 20) / candleCount);
    const spacing = candleWidth * 0.25;
    const bodyWidth = Math.max(1, candleWidth - spacing);

    const step = Math.max(1, Math.floor(candleCount / 7));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let i = 0; i < candleCount; i += step) {
      const x = 10 + i * candleWidth + candleWidth / 2;
      ctx.strokeStyle = 'rgba(105, 231, 185, 0.05)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, plotHeight);
      ctx.stroke();

      const time = new Date(candles[i].timestamp);
      const timeStr =
        timeframe === '1d'
          ? `${time.getMonth() + 1}/${time.getDate()}`
          : `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;

      ctx.fillStyle = theme.textDim;
      ctx.fillText(timeStr, x, plotHeight + 6);
    }

    // 1. Draw Volume Bars
    const volBaseY = plotHeight;
    for (let i = 0; i < candleCount; i++) {
      const c = candles[i];
      const x = 10 + i * candleWidth;
      const isUp = c.close >= c.open;
      const vHeight = maxVolume > 0 ? (c.volume / maxVolume) * volumeHeight : 0;
      const y = volBaseY - vHeight;

      ctx.fillStyle = isUp ? 'rgba(105, 231, 185, 0.18)' : 'rgba(237, 153, 134, 0.18)';
      ctx.fillRect(x, y, bodyWidth, vHeight);
    }

    // 2. Draw Moving Averages (SMA20 in Cyan, SMA50 in Warm Gold)
    // SMA20
    ctx.strokeStyle = 'rgba(105, 231, 185, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started20 = false;
    for (let i = 0; i < candleCount; i++) {
      const val = sma20[i];
      if (val !== null) {
        const x = 10 + i * candleWidth + candleWidth / 2;
        const y = getY(val);
        if (!started20) {
          ctx.moveTo(x, y);
          started20 = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();

    // SMA50
    ctx.strokeStyle = 'rgba(240, 198, 116, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started50 = false;
    for (let i = 0; i < candleCount; i++) {
      const val = sma50[i];
      if (val !== null) {
        const x = 10 + i * candleWidth + candleWidth / 2;
        const y = getY(val);
        if (!started50) {
          ctx.moveTo(x, y);
          started50 = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();

    // 3. Draw Candlesticks
    for (let i = 0; i < candleCount; i++) {
      const c = candles[i];
      const isUp = c.close >= c.open;
      const bullColor = '#69e7b9';
      const bearColor = '#ed9986';
      const color = isUp ? bullColor : bearColor;

      const x = 10 + i * candleWidth;
      const centerX = x + candleWidth / 2;
      const openY = getY(c.open);
      const closeY = getY(c.close);
      const highY = getY(c.high);
      const lowY = getY(c.low);

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(centerX, highY);
      ctx.lineTo(centerX, lowY);
      ctx.stroke();

      // Body
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));

      ctx.fillStyle = isUp ? 'rgba(105, 231, 185, 0.85)' : 'rgba(237, 153, 134, 0.85)';
      ctx.fillRect(x, bodyTop, bodyWidth, bodyHeight);
    }

    // 4. Live Current Price Line (Gold pulse)
    if (quote) {
      const currentY = getY(quote.mid);
      ctx.strokeStyle = '#f0c674';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(0, currentY);
      ctx.lineTo(plotWidth, currentY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Current Price Badge on Right Axis
      ctx.fillStyle = '#f0c674';
      ctx.fillRect(plotWidth + 1, currentY - 9, priceScaleWidth - 2, 18);
      ctx.fillStyle = '#06141a';
      ctx.font = 'bold 10px "DM Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(quote.mid.toFixed(2), plotWidth + 6, currentY);
    }

    // 5. Crosshair on Hover
    if (crosshairPos && crosshairPos.x < plotWidth && crosshairPos.y < plotHeight) {
      const { x, y } = crosshairPos;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // Horizontal crosshair
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(plotWidth, y);
      ctx.stroke();

      // Vertical crosshair
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, plotHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      // Calculate price at crosshair y
      const hoverPrice = paddedMax - ((y - 10) / candlePlotHeight) * paddedRange;
      ctx.fillStyle = theme.surfaceRaised;
      ctx.strokeStyle = theme.borderBright;
      ctx.lineWidth = 1;
      ctx.fillRect(plotWidth + 1, y - 9, priceScaleWidth - 2, 18);
      ctx.strokeRect(plotWidth + 1, y - 9, priceScaleWidth - 2, 18);

      ctx.fillStyle = theme.text;
      ctx.font = '10px "DM Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(hoverPrice.toFixed(2), plotWidth + 6, y);
    }
  }, [candles, quote, timeframe, canvasDimensions, sma20, sma50, crosshairPos]);

  useEffect(() => {
    renderChart();
  }, [renderChart]);

  // Mouse handlers for crosshair & tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCrosshairPos({ x, y });

    const plotWidth = canvasDimensions.width - 65;
    const candleCount = candles.length;
    const candleWidth = (plotWidth - 20) / candleCount;
    const idx = Math.floor((x - 10) / candleWidth);
    if (idx >= 0 && idx < candleCount) {
      setHoverIndex(idx);
    } else {
      setHoverIndex(null);
    }
  };

  const handleMouseLeave = () => {
    setCrosshairPos(null);
    setHoverIndex(null);
  };

  const activeCandle = hoverIndex !== null && candles[hoverIndex] ? candles[hoverIndex] : candles[candles.length - 1];

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        background: '#06141a',
        borderRadius: theme.radius,
        border: `1px solid ${theme.border}`,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Top Chart Toolbar: Ticker, Timeframes, Legend, and Candle Inspector */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          padding: '10px 16px',
          background: 'rgba(10, 31, 40, 0.75)',
          borderBottom: `1px solid ${theme.border}`,
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '15px' }}>🥇</span>
            <span style={{ fontWeight: 800, fontSize: '14px', color: '#f0c674', letterSpacing: '0.02em' }}>
              XAU/USD
            </span>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(240, 198, 116, 0.15)',
                color: '#f0c674',
                fontWeight: 600,
              }}
            >
              SPOT GOLD
            </span>
          </div>

          {/* Timeframe Buttons */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.25)', padding: '2px', borderRadius: '6px' }}>
            {['1m', '5m', '15m', '1h'].map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: timeframe === tf ? 'rgba(105, 231, 185, 0.2)' : 'transparent',
                  color: timeframe === tf ? theme.accent : theme.textDim,
                  fontSize: '11px',
                  fontFamily: theme.fontMono,
                  fontWeight: timeframe === tf ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Indicator Legends */}
          <div style={{ display: 'flex', gap: '10px', fontSize: '10px', fontFamily: theme.fontMono }}>
            <span style={{ color: 'rgba(105, 231, 185, 0.9)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '2px', background: '#69e7b9', display: 'inline-block' }} />
              SMA 20
            </span>
            <span style={{ color: 'rgba(240, 198, 116, 0.9)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '2px', background: '#f0c674', display: 'inline-block' }} />
              SMA 50
            </span>
          </div>
        </div>

        {/* OHLCV Readout */}
        {activeCandle && (
          <div
            style={{
              display: 'flex',
              gap: '12px',
              fontSize: '11px',
              fontFamily: theme.fontMono,
              color: theme.textMuted,
            }}
          >
            <span>
              O: <strong style={{ color: theme.text }}>{activeCandle.open.toFixed(2)}</strong>
            </span>
            <span>
              H: <strong style={{ color: '#69e7b9' }}>{activeCandle.high.toFixed(2)}</strong>
            </span>
            <span>
              L: <strong style={{ color: '#ed9986' }}>{activeCandle.low.toFixed(2)}</strong>
            </span>
            <span>
              C:{' '}
              <strong
                style={{
                  color: activeCandle.close >= activeCandle.open ? '#69e7b9' : '#ed9986',
                }}
              >
                {activeCandle.close.toFixed(2)}
              </strong>
            </span>
            <span>
              Vol: <strong style={{ color: theme.textDim }}>{activeCandle.volume.toLocaleString()}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Main Canvas */}
      <div style={{ position: 'relative', width: '100%', height }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            display: 'block',
            width: '100%',
            height,
            cursor: 'crosshair',
          }}
        />
      </div>
    </div>
  );
}
