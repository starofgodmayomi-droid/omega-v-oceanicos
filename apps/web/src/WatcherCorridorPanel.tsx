import React, { useState, useEffect, useRef } from 'react';
import { theme } from './oceanicosTheme';

interface WatcherTelemetry {
  watcherId: string;
  status: string;
  factsCount: number;
  currentTokens: string[];
  activeDepth: string;
  marketLiquidity: {
    primaryAsset: string;
    price: number;
    change: number;
    changePercent: number;
    orderBlocks: {
      bullish: Array<{ level: string; range: [number, number]; status: string }>;
      bearish: Array<{ level: string; range: [number, number]; status: string }>;
    };
    watchlist: Array<{ symbol: string; last: number; chg: number; chgPct: number }>;
    keyFacts: string;
  };
}

const MONOLITH_PHRASES_LEFT = [
  '3 day trip to tokyo',
  'tell my boss i quit',
  'how to get over someone',
  'fall asleep faster',
  'how many calories in a cookie',
  'is it okay to cry at work',
  'how to fix a squeaky door',
  'apologize with flowers',
  'way to get a stain out',
  'bad to sleep on stomach',
  'what does mean in text',
  'how long does headache last',
  'grocery list for dinner',
  'start a business at 30',
  'my lease is up next month',
];

const MONOLITH_PHRASES_RIGHT = [
  'how much water should i drink',
  'should i say something',
  'how to stop overthinking',
  'birthday message for coworker',
  'is 30 too late to switch careers',
  'how to fall asleep on plane',
  'how to say no politely',
  'is it normal to feel tired',
  'this song is stuck in my head',
  'flights to tokyo december',
  'dog barking at night',
  'coffee makes me anxious',
  'best way to learn japanese',
  'thank you email after interview',
  'cancel dinner plans politely',
];

export function WatcherCorridorPanel() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [telemetry, setTelemetry] = useState<WatcherTelemetry | null>(null);
  const [activeTab, setActiveTab] = useState<'corridor' | 'orderblocks'>('corridor');
  const [selectedAsset, setSelectedAsset] = useState<string>('BTCUSD');
  const [factsCount, setFactsCount] = useState<number>(37534);
  const [currentTokens, setCurrentTokens] = useState<string[]>(['get', 'invite', 'way', 'white', "i'm"]);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch('/v1/watcher');
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setTelemetry(json.data);
            setFactsCount(json.data.factsCount);
            setCurrentTokens(json.data.currentTokens);
          }
        }
      } catch {
        // offline fallback
      }
    };
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, []);

  // Smooth facts counter increment
  useEffect(() => {
    const counterInterval = setInterval(() => {
      setFactsCount((prev) => prev + 1);
    }, 1400);
    return () => clearInterval(counterInterval);
  }, []);

  // Canvas animation for WATCHER; 01 Semantic Corridor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let t = 0;

    const resize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight || 560;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      t += 0.025;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2 - 20;

      // Deep void background
      ctx.fillStyle = '#05070c';
      ctx.fillRect(0, 0, w, h);

      // Perspective floor grid lines
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
      ctx.lineWidth = 1;
      const vanishingY = cy + 40;
      for (let x = -w * 0.4; x <= w * 1.4; x += w / 12) {
        ctx.beginPath();
        ctx.moveTo(cx, vanishingY);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Horizontal floor rungs moving forward
      const floorSpeed = (t * 28) % 36;
      for (let y = vanishingY + 10; y < h; y += 22) {
        const adjustedY = y + floorSpeed;
        if (adjustedY < h) {
          const alpha = Math.min(1, (adjustedY - vanishingY) / 180) * 0.18;
          ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(0, adjustedY);
          ctx.lineTo(w, adjustedY);
          ctx.stroke();
        }
      }

      // Monolith Walls (Left & Right)
      const wallSlopeX = w * 0.36;
      ctx.fillStyle = 'rgba(7, 13, 24, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;

      // Left monolith polygon
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(wallSlopeX, cy - 120);
      ctx.lineTo(wallSlopeX, cy + 140);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right monolith polygon
      ctx.beginPath();
      ctx.moveTo(w, 0);
      ctx.lineTo(w - wallSlopeX, cy - 120);
      ctx.lineTo(w - wallSlopeX, cy + 140);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Text stream inside monoliths
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(226, 232, 240, 0.45)';
      const leftSpacing = 16;
      const phraseScroll = Math.floor(t * 1.2);

      // Left texts
      for (let i = 0; i < 14; i++) {
        const pIndex = (i + phraseScroll) % MONOLITH_PHRASES_LEFT.length;
        const phrase = MONOLITH_PHRASES_LEFT[pIndex];
        const yPos = cy - 80 + i * leftSpacing;
        const xPos = 24 + i * 4.5;
        ctx.fillText(phrase, xPos, yPos);

        // Highlight selected semantic box
        if (i === 4 || i === 9) {
          ctx.strokeStyle = i === 4 ? '#00e5ff' : '#ff4757';
          ctx.lineWidth = 1;
          ctx.strokeRect(xPos - 4, yPos - 11, ctx.measureText(phrase).width + 8, 14);
        }
      }

      // Right texts
      for (let i = 0; i < 14; i++) {
        const pIndex = (i + phraseScroll) % MONOLITH_PHRASES_RIGHT.length;
        const phrase = MONOLITH_PHRASES_RIGHT[pIndex];
        const yPos = cy - 80 + i * leftSpacing;
        const xPos = w - 240 - i * 4.5;
        ctx.fillText(phrase, xPos, yPos);

        if (i === 3 || i === 8) {
          ctx.strokeStyle = i === 3 ? '#a78bfa' : '#2ed573';
          ctx.lineWidth = 1;
          ctx.strokeRect(xPos - 4, yPos - 11, ctx.measureText(phrase).width + 8, 14);
        }
      }

      // WATCHER; 01 Robot Entity
      const bobY = Math.sin(t * 2) * 5;
      const spiderX = cx;
      const spiderY = cy + bobY;

      // Articulated legs latching onto monolith nodes
      const legAnchorsLeft = [
        { x: wallSlopeX - 25, y: cy - 65, color: '#00e5ff' },
        { x: wallSlopeX - 18, y: cy + 5, color: '#ff4757' },
        { x: wallSlopeX - 30, y: cy + 70, color: '#a78bfa' },
      ];
      const legAnchorsRight = [
        { x: w - wallSlopeX + 25, y: cy - 65, color: '#00e5ff' },
        { x: w - wallSlopeX + 18, y: cy + 5, color: '#ff4757' },
        { x: w - wallSlopeX + 30, y: cy + 70, color: '#2ed573' },
      ];

      // Draw Left Legs
      legAnchorsLeft.forEach((anchor, idx) => {
        const jointX = cx - 55 - idx * 12 + Math.sin(t * 2 + idx) * 4;
        const jointY = spiderY - 10 + idx * 20 + Math.cos(t * 2 + idx) * 3;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(spiderX - 30, spiderY - 5 + idx * 10);
        ctx.lineTo(jointX, jointY);
        ctx.lineTo(anchor.x, anchor.y);
        ctx.stroke();

        // Joint dot
        ctx.fillStyle = '#ff3366';
        ctx.beginPath();
        ctx.arc(jointX, jointY, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Foot clamp
        ctx.strokeStyle = anchor.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(anchor.x - 5, anchor.y - 5, 10, 10);
      });

      // Draw Right Legs
      legAnchorsRight.forEach((anchor, idx) => {
        const jointX = cx + 55 + idx * 12 + Math.sin(t * 2 + idx) * 4;
        const jointY = spiderY - 10 + idx * 20 + Math.cos(t * 2 + idx) * 3;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(spiderX + 30, spiderY - 5 + idx * 10);
        ctx.lineTo(jointX, jointY);
        ctx.lineTo(anchor.x, anchor.y);
        ctx.stroke();

        ctx.fillStyle = '#ff3366';
        ctx.beginPath();
        ctx.arc(jointX, jointY, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = anchor.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(anchor.x - 5, anchor.y - 5, 10, 10);
      });

      // Spider Central Chassis (Hexagonal Faceted Hull)
      const hexRadius = 38;
      ctx.fillStyle = '#080d18';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const hx = spiderX + Math.cos(angle) * hexRadius * 1.35;
        const hy = spiderY + Math.sin(angle) * hexRadius * 0.85;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner chassis rim
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const hx = spiderX + Math.cos(angle) * hexRadius * 1.15;
        const hy = spiderY + Math.sin(angle) * hexRadius * 0.72;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();

      // Glowing Crimson Eye
      const eyeLookX = spiderX + Math.sin(t * 1.5) * 8;
      const eyeLookY = spiderY + Math.cos(t * 1.8) * 3;
      const eyeRadius = 14 + Math.sin(t * 3) * 1.5;

      // Glow halo
      const grad = ctx.createRadialGradient(eyeLookX, eyeLookY, 2, eyeLookX, eyeLookY, eyeRadius * 2);
      grad.addColorStop(0, '#ff1744');
      grad.addColorStop(0.5, 'rgba(255, 23, 68, 0.4)');
      grad.addColorStop(1, 'rgba(255, 23, 68, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(eyeLookX, eyeLookY, eyeRadius * 2, 0, Math.PI * 2);
      ctx.fill();

      // Solid Eye Core
      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.arc(eyeLookX, eyeLookY, eyeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Pupil highlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eyeLookX - 3, eyeLookY - 3, 3, 0, Math.PI * 2);
      ctx.fill();

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const market = telemetry?.marketLiquidity || {
    primaryAsset: 'BTCUSD',
    price: 75400.0,
    change: -571.0,
    changePercent: -0.75,
    orderBlocks: {
      bullish: [
        { level: 'Bullish OB', range: [75200, 75400], status: 'MITIGATED_ENTRY' },
        { level: 'Bullish OB', range: [74800, 75000], status: 'UNTESTED_DEMAND' },
      ],
      bearish: [
        { level: 'Bearish OB', range: [76102, 76200], status: 'REJECTED_SUPPLY' },
        { level: 'Bearish OB', range: [75852, 75900], status: 'OVERHEAD_LIQUIDITY' },
      ],
    },
    watchlist: [
      { symbol: 'BTCUSD', last: 75400.0, chg: -571.0, chgPct: -0.75 },
      { symbol: 'XAGUSD', last: 51.5365, chg: -0.253, chgPct: -0.49 },
      { symbol: 'USDJPY', last: 158.36, chg: 0.658, chgPct: 0.42 },
      { symbol: 'GBPJPY', last: 211.571, chg: -0.535, chgPct: -0.25 },
      { symbol: 'XAUUSD', last: 4035.9, chg: -51.46, chgPct: -1.26 },
    ],
    keyFacts: "Bitcoin ETFs' year-to-date net outflows totaled about $510 million after Thursday's trading.",
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: theme.text }}>
      {/* Top Controller Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 18px',
          background: theme.surfaceRaised,
          border: `1px solid ${theme.border}`,
          borderRadius: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.4rem' }}>🕷️</span>
          <div>
            <div style={{ fontWeight: 700, letterSpacing: '0.08em', color: theme.accent, fontSize: '0.95rem' }}>
              WATCHER; 01 // KAI SEMANTIC PROBE & ORDER BLOCK ENGINE
            </div>
            <div style={{ fontSize: '0.75rem', color: theme.textMuted }}>
              Autonomous Robotic Observer in Semantic Corridor · Real-Time Institutional Liquidity
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('corridor')}
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 700,
              borderRadius: '6px',
              border: activeTab === 'corridor' ? `1px solid ${theme.accent}` : `1px solid ${theme.border}`,
              background: activeTab === 'corridor' ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
              color: activeTab === 'corridor' ? theme.accent : theme.textMuted,
              cursor: 'pointer',
            }}
          >
            👁️ SEMANTIC CORRIDOR
          </button>
          <button
            onClick={() => setActiveTab('orderblocks')}
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 700,
              borderRadius: '6px',
              border: activeTab === 'orderblocks' ? '1px solid #f59e0b' : `1px solid ${theme.border}`,
              background: activeTab === 'orderblocks' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              color: activeTab === 'orderblocks' ? '#f59e0b' : theme.textMuted,
              cursor: 'pointer',
            }}
          >
            📊 SOVEREIGN ORDER BLOCKS (BTCUSD)
          </button>
        </div>
      </div>

      {activeTab === 'corridor' ? (
        /* Canvas View of WATCHER; 01 */
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '560px',
            background: '#05070c',
            border: `1px solid ${theme.border}`,
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

          {/* Watermark badge top right */}
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '20px',
              fontSize: '0.72rem',
              letterSpacing: '0.12em',
              color: 'rgba(255, 255, 255, 0.65)',
              fontFamily: 'monospace',
              pointerEvents: 'none',
            }}
          >
            @EVERYTHING.BENDS
          </div>

          {/* Bottom HUD Bar */}
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              padding: '8px 24px',
              background: 'rgba(5, 10, 20, 0.88)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: '6px',
              backdropFilter: 'blur(8px)',
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            {/* Active Token Stream */}
            <div style={{ display: 'flex', gap: '6px', fontSize: '0.78rem' }}>
              {currentTokens.map((tok, i) => (
                <span
                  key={i}
                  style={{
                    padding: '2px 6px',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '4px',
                    color: i === 0 ? '#00e5ff' : '#e2e8f0',
                  }}
                >
                  {tok}
                </span>
              ))}
            </div>

            <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.2)' }} />

            {/* WATCHER identifier */}
            <div style={{ fontSize: '0.78rem', color: theme.accent, fontWeight: 700 }}>
              WATCHER; 01
            </div>

            <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.2)' }} />

            {/* FACTS Counter */}
            <div style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 600 }}>
              FACTS <span style={{ color: '#2ed573' }}>{factsCount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Order Block & Institutional Liquidity Terminal */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px' }}>
          {/* Main Chart Area */}
          <div
            style={{
              background: '#0b101b',
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Header info matching TradingView screenshot */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#f59e0b' }}>
                  {market.primaryAsset}
                </span>
                <span style={{ fontSize: '0.8rem', color: theme.textMuted }}>• 1m • BITSTAMP</span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                  }}
                >
                  Auto S/R 18 7 Zone 0
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>
                  ${market.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span style={{ fontSize: '0.82rem', color: '#ef4444' }}>
                  {market.change} ({market.changePercent}%)
                </span>
              </div>
            </div>

            {/* Simulated Order Block Chart Surface */}
            <div
              style={{
                height: '380px',
                background: '#070a12',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                position: 'relative',
                overflow: 'hidden',
                padding: '16px',
              }}
            >
              {/* Bearish Order Block Banners */}
              <div
                style={{
                  position: 'absolute',
                  top: '40px',
                  right: '40px',
                  width: '320px',
                  padding: '6px 12px',
                  background: 'rgba(239, 68, 68, 0.18)',
                  borderLeft: '4px solid #ef4444',
                  borderRadius: '0 4px 4px 0',
                  fontSize: '0.78rem',
                  color: '#fca5a5',
                }}
              >
                <div style={{ fontWeight: 700 }}>Bearish OB ($76,102 — $76,200)</div>
                <div style={{ fontSize: '0.7rem', color: theme.textMuted }}>Rejected Institutional Supply Zone</div>
              </div>

              <div
                style={{
                  position: 'absolute',
                  top: '110px',
                  right: '70px',
                  width: '260px',
                  padding: '6px 12px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  borderLeft: '4px solid #ef4444',
                  borderRadius: '0 4px 4px 0',
                  fontSize: '0.78rem',
                  color: '#fca5a5',
                }}
              >
                <div style={{ fontWeight: 700 }}>Bearish OB ($75,852 — $75,900)</div>
                <div style={{ fontSize: '0.7rem', color: theme.textMuted }}>Overhead Liquidity Pool</div>
              </div>

              {/* Current Price Line */}
              <div
                style={{
                  position: 'absolute',
                  top: '230px',
                  left: 0,
                  right: 0,
                  borderTop: '1.5px dashed #22c55e',
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0 12px',
                }}
              >
                <span style={{ fontSize: '0.7rem', color: '#22c55e', background: '#070a12', padding: '0 4px' }}>
                  MITIGATION LINE: 75,400.00
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', background: '#22c55e', padding: '2px 6px', borderRadius: '3px' }}>
                  75,400 USD
                </span>
              </div>

              {/* Bullish Order Block Zone */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '40px',
                  right: '100px',
                  width: '280px',
                  padding: '8px 12px',
                  background: 'rgba(34, 197, 94, 0.16)',
                  borderLeft: '4px solid #22c55e',
                  borderRadius: '0 4px 4px 0',
                  fontSize: '0.78rem',
                  color: '#86efac',
                }}
              >
                <div style={{ fontWeight: 700 }}>Bullish OB ($75,200 — $75,400)</div>
                <div style={{ fontSize: '0.7rem', color: theme.textMuted }}>Active Institutional Demand Mitigation</div>
              </div>

              {/* Background Candles Schematic */}
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                  opacity: 0.35,
                  pointerEvents: 'none',
                }}
              >
                {[75600, 75520, 75780, 75900, 76150, 76080, 75850, 75650, 75400].map((val, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '1px', height: '40px', background: val > 75700 ? '#ef4444' : '#22c55e' }} />
                    <div
                      style={{
                        width: '8px',
                        height: '24px',
                        background: val > 75700 ? '#ef4444' : '#22c55e',
                        borderRadius: '1px',
                      }}
                    />
                    <div style={{ width: '1px', height: '30px', background: val > 75700 ? '#ef4444' : '#22c55e' }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Key Facts Box matching user screenshot */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '12px 16px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
                ✦ Key facts & Institutional Flow:
              </div>
              <div style={{ color: theme.textMuted }}>{market.keyFacts}</div>
            </div>
          </div>

          {/* Right Watchlist Panel matching user screenshot */}
          <div
            style={{
              background: '#0b101b',
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: theme.accent, letterSpacing: '0.05em' }}>
              RED LIST WATCHLIST
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {market.watchlist.map((item) => (
                <div
                  key={item.symbol}
                  onClick={() => setSelectedAsset(item.symbol)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: selectedAsset === item.symbol ? 'rgba(0, 229, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: selectedAsset === item.symbol ? '1px solid #00e5ff' : '1px solid transparent',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{item.symbol}</div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{item.last.toLocaleString()}</div>
                    <div style={{ fontSize: '0.72rem', color: item.chg < 0 ? '#ef4444' : '#22c55e' }}>
                      {item.chg > 0 ? `+${item.chg}` : item.chg} ({item.chgPct}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '12px' }}>
              <div style={{ fontSize: '0.72rem', color: theme.textMuted }}>
                WATCHER; 01 is continuously streaming order book depth, liquidity blocks, and institutional flow across crypto and forex pairs.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

