import { theme, statusColor, humanStatus } from './oceanicosTheme';

/*
 * ObservationStreamPanel — what the system has observed.
 *
 * The deep section for live telemetry: the current ledger tip, the yield
 * timeline, and the rolling block history. These are the observations the
 * system has made of reality — the raw evidence underneath the ambient
 * "Reality · Verified" indicator on the surface.
 */

interface ObservationStreamPanelProps {
  tip: any;
  history: any[];
  minerActive: boolean;
  minerStats: { totalMined: number; lastBlockTime: string };
}

export function ObservationStreamPanel({
  tip,
  history,
  minerActive,
  minerStats,
}: ObservationStreamPanelProps) {
  return (
    <div
      style={{
        padding: '20px 22px',
        fontFamily: theme.fontSans,
      }}
    >
      {/* Tip + gauges */}
      {tip ? (
        <div
          style={{
            padding: '16px',
            background: theme.surfaceDeep,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radiusSmall,
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 600, color: theme.textMuted }}>
              Ledger tip
            </span>
            <span
              style={{
                padding: '2px 10px',
                borderRadius: theme.radiusPill,
                fontSize: '11px',
                fontWeight: 700,
                color: statusColor(tip.evidence.status),
                background: `${statusColor(tip.evidence.status)}15`,
                border: `1px solid ${statusColor(tip.evidence.status)}44`,
              }}
            >
              {humanStatus(tip.evidence.status)}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: theme.textDim, fontFamily: theme.fontMono, marginBottom: '12px' }}>
            Block #{tip.index} · {tip.nonce} cycles · {tip.hash.substring(0, 32)}…
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <Gauge label="Silicon yield" value={`${Math.round(tip.observation.siliconYield * 100)}%`} color={theme.accent} />
            <Gauge label="Grid load" value={`${tip.observation.gridLoadMegawatts} MW`} color="#38bdf8" />
            <Gauge label="Accelerators" value={`${(tip.observation.acceleratorInventory / 1000).toFixed(0)}k`} color={theme.accentWarm} />
          </div>
        </div>
      ) : (
        <div style={{ color: theme.textDim, fontSize: '12px', marginBottom: '16px' }}>
          Awaiting initial observation…
        </div>
      )}

      {/* Telemetry chart */}
      {history.length > 0 && (
        <div
          style={{
            padding: '16px',
            background: theme.surfaceDeep,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radiusSmall,
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: theme.textMuted }}>
              Yield timeline · {history.length} epochs
            </span>
            <div style={{ display: 'flex', gap: '12px', fontSize: '10px' }}>
              <span style={{ color: theme.accent }}>● Silicon yield</span>
              <span style={{ color: '#38bdf8' }}>● Grid load</span>
            </div>
          </div>
          <div style={{ position: 'relative', width: '100%', height: '80px' }}>
            <svg
              viewBox="0 0 600 80"
              preserveAspectRatio="none"
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="yieldGradFrontier" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.accent} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={theme.accent} stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="0" y1="15" x2="600" y2="15" stroke={theme.borderSubtle} strokeDasharray="3 3" />
              <line x1="0" y1="40" x2="600" y2="40" stroke={theme.borderSubtle} strokeDasharray="3 3" />
              <line x1="0" y1="70" x2="600" y2="70" stroke={theme.borderSubtle} strokeDasharray="3 3" />
              {(() => {
                const blocks = [...history].reverse();
                if (blocks.length === 1) {
                  const yYield = 70 - ((blocks[0].observation?.siliconYield || 0.9) - 0.8) * 300;
                  return <circle cx="300" cy={Math.max(15, Math.min(70, yYield))} r="4" fill={theme.accent} />;
                }
                const step = 600 / (blocks.length - 1);
                const yieldPts = blocks.map((b, i) => {
                  const x = i * step;
                  const ratio = Math.max(0, Math.min(1, ((b.observation?.siliconYield || 0.9) - 0.8) / 0.2));
                  return { x, y: 70 - ratio * 55 };
                });
                const gridPts = blocks.map((b, i) => {
                  const x = i * step;
                  const ratio = Math.max(0, Math.min(1, ((b.observation?.gridLoadMegawatts || 1000) - 500) / 1500));
                  return { x, y: 70 - ratio * 50 };
                });
                const yieldPath = yieldPts.reduce((a, p, i) => `${a} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');
                const yieldArea = `${yieldPath} L 600 75 L 0 75 Z`;
                const gridPath = gridPts.reduce((a, p, i) => `${a} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');
                return (
                  <g>
                    <path d={yieldArea} fill="url(#yieldGradFrontier)" />
                    <path d={gridPath} fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 2" />
                    <path d={yieldPath} fill="none" stroke={theme.accent} strokeWidth="2" />
                    {yieldPts.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={theme.accent} />
                    ))}
                  </g>
                );
              })()}
            </svg>
          </div>
        </div>
      )}

      {/* Block history */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600, color: theme.textMuted }}>
            Observation history
          </span>
          {minerActive && (
            <span style={{ fontSize: '11px', color: theme.warning, fontWeight: 600 }}>
              Auto-mining · {minerStats.totalMined} total
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {history.map((block) => {
            const c = statusColor(block.evidence.status);
            return (
              <div
                key={block.hash}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '7px 12px',
                  background: theme.surfaceDeep,
                  borderLeft: `3px solid ${c}`,
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: theme.fontMono,
                }}
              >
                <div style={{ color: theme.textDim }}>
                  <strong style={{ color: theme.accent, marginRight: '8px' }}>#{block.index}</strong>
                  {block.hash.substring(0, 20)}…
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ color: theme.accentDim }}>
                    {Math.round(block.observation.siliconYield * 100)}%
                  </span>
                  <span style={{ color: '#38bdf8' }}>{block.observation.gridLoadMegawatts}MW</span>
                  <span style={{ color: c, fontWeight: 700 }}>
                    {humanStatus(block.evidence.status)}
                  </span>
                  <span style={{ color: theme.textDim }}>
                    {new Date(block.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Gauge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        padding: '8px',
        background: theme.surface,
        borderRadius: '6px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '9px', color: theme.textDim, marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '15px', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
