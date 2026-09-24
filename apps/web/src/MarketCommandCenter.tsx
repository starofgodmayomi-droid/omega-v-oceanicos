import { useEffect, useMemo, useState } from 'react';
import { theme } from './oceanicosTheme';

type Asset = { symbol: string; name: string; price: number; changePercent: number; kind: string; source: string };
type Snapshot = { success: boolean; evidence: { live: boolean; assetCount: number; providerCount: number }; assets: Asset[]; signal: string; observedAt: string };

const fallback: Snapshot = { success: true, evidence: { live: false, assetCount: 0, providerCount: 0 }, assets: [], signal: 'Awaiting market observation', observedAt: '' };

export function MarketCommandCenter() {
  const [snapshot, setSnapshot] = useState<Snapshot>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/v1/market/snapshot');
      if (!response.ok) throw new Error(`market snapshot unavailable (${response.status})`);
      setSnapshot(await response.json() as Snapshot);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'market snapshot unavailable');
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 30_000); return () => window.clearInterval(timer); }, []);
  const radar = useMemo(() => [...snapshot.assets].sort((a, b) => b.changePercent - a.changePercent).slice(0, 3), [snapshot.assets]);
  return <section style={{ marginTop: '28px', padding: '20px', borderRadius: theme.radius, border: `1px solid ${theme.borderBright}`, background: theme.surfaceDeep, fontFamily: theme.fontSans }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div><div style={{ color: theme.accent, fontSize: '11px', fontWeight: 800, letterSpacing: '.18em' }}>◈ MARKET INTELLIGENCE</div><h2 style={{ color: theme.text, fontSize: '22px', margin: '8px 0 4px' }}>Observe the signal. Verify the source.</h2><div style={{ color: theme.textMuted, fontSize: '12px' }}>{snapshot.signal}</div></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: snapshot.evidence.live ? theme.verified : theme.warning, fontSize: '11px', fontWeight: 700, letterSpacing: '.08em' }}><span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'currentColor' }} /> {snapshot.evidence.live ? 'LIVE VERIFIED FEED' : 'FALLBACK OBSERVATION'}</div>
    </div>
    {error && <div style={{ marginTop: '14px', color: theme.warning, fontSize: '12px' }}>Observation degraded: {error}</div>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginTop: '18px' }}>{snapshot.assets.map(asset => <div key={asset.symbol} style={{ padding: '12px', borderRadius: theme.radiusSmall, border: `1px solid ${theme.border}`, background: theme.surface }}><div style={{ display: 'flex', justifyContent: 'space-between', color: theme.text, fontWeight: 700, fontSize: '13px' }}><span>{asset.symbol}</span><span style={{ color: asset.changePercent >= 0 ? theme.verified : theme.divergent }}>{asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%</span></div><div style={{ color: theme.textMuted, fontSize: '11px', marginTop: '6px' }}>{asset.name} · ${asset.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div></div>)}</div>
    {loading && <div style={{ color: theme.textDim, fontSize: '11px', marginTop: '14px' }}>Refreshing observation…</div>}
    {!loading && radar.length > 0 && <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}><span style={{ color: theme.textDim, fontSize: '11px' }}>RADAR</span>{radar.map(asset => <span key={asset.symbol} style={{ color: theme.accentWarm, fontSize: '11px' }}>{asset.symbol} {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%</span>)}</div>}
  </section>;
}
