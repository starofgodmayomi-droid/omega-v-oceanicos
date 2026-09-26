import { useEffect, useMemo, useState } from 'react';
import { theme } from './oceanicosTheme';
import { apiRequest } from './apiClient';

type Asset = { symbol: string; name: string; price: number; changePercent: number; kind: string; source: string };
type Snapshot = { success: boolean; evidence: { live: boolean; assetCount: number; providerCount: number }; assets: Asset[]; signal: string; observedAt: string };
type WatchItem = { symbol: string; thresholdPercent: number; createdAt: string };
type Alert = { symbol: string; severity: 'critical' | 'watch'; thresholdPercent: number; changePercent: number; price: number; source: string };

const fallback: Snapshot = { success: true, evidence: { live: false, assetCount: 0, providerCount: 0 }, assets: [], signal: 'Awaiting market observation', observedAt: '' };
const buttonStyle = { border: `1px solid ${theme.border}`, borderRadius: theme.radiusPill, background: 'transparent', color: theme.textMuted, padding: '7px 10px', cursor: 'pointer', fontFamily: theme.fontSans, fontSize: '11px' } as const;

export function MarketCommandCenter() {
  const [snapshot, setSnapshot] = useState<Snapshot>(fallback);
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [symbol, setSymbol] = useState('');
  const [threshold, setThreshold] = useState('2');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [nextSnapshot, watchlistResponse, alertsResponse] = await Promise.all([
        apiRequest<Snapshot>('/v1/market/snapshot'),
        apiRequest<{ items?: WatchItem[] }>('/v1/market/watchlist'),
        apiRequest<{ alerts?: Alert[] }>('/v1/market/alerts'),
      ]);
      setSnapshot(nextSnapshot);
      setWatchlist(watchlistResponse.items ?? []);
      setAlerts(alertsResponse.alerts ?? []);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'market observation unavailable');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 30_000); return () => window.clearInterval(timer); }, []);
  const radar = useMemo(() => [...snapshot.assets].sort((a, b) => b.changePercent - a.changePercent).slice(0, 3), [snapshot.assets]);
  const addWatch = async () => {
    if (!symbol.trim()) return;
    try {
      await apiRequest('/v1/market/watchlist', { method: 'POST', body: JSON.stringify({ symbol, thresholdPercent: Number(threshold) }) });
      setSymbol('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add watch item');
    }
  };
  const removeWatch = async (item: WatchItem) => {
    try {
      await apiRequest(`/v1/market/watchlist/${encodeURIComponent(item.symbol)}`, { method: 'DELETE' });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not remove ${item.symbol}`);
    }
  };

  return <section style={{ marginTop: '28px', padding: '20px', borderRadius: theme.radius, border: `1px solid ${theme.borderBright}`, background: theme.surfaceDeep, fontFamily: theme.fontSans }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div><div style={{ color: theme.accent, fontSize: '11px', fontWeight: 800, letterSpacing: '.18em' }}>◈ MARKET INTELLIGENCE</div><h2 style={{ color: theme.text, fontSize: '22px', margin: '8px 0 4px' }}>Observe the signal. Verify the source.</h2><div style={{ color: theme.textMuted, fontSize: '12px' }}>{snapshot.signal}</div></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: snapshot.evidence.live ? theme.verified : theme.warning, fontSize: '11px', fontWeight: 700, letterSpacing: '.08em' }}><span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'currentColor' }} /> {snapshot.evidence.live ? 'LIVE VERIFIED FEED' : 'FALLBACK OBSERVATION'}</div>
    </div>
    {error && <div style={{ marginTop: '14px', color: theme.warning, fontSize: '12px' }}>Observation degraded: {error}</div>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginTop: '18px' }}>{snapshot.assets.map(asset => <div key={asset.symbol} style={{ padding: '12px', borderRadius: theme.radiusSmall, border: `1px solid ${theme.border}`, background: theme.surface }}><div style={{ display: 'flex', justifyContent: 'space-between', color: theme.text, fontWeight: 700, fontSize: '13px' }}><span>{asset.symbol}</span><span style={{ color: asset.changePercent >= 0 ? theme.verified : theme.divergent }}>{asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%</span></div><div style={{ color: theme.textMuted, fontSize: '11px', marginTop: '6px' }}>{asset.name} · ${asset.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div></div>)}</div>
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}><span style={{ color: theme.textDim, fontSize: '11px', paddingTop: '8px' }}>RADAR</span>{radar.map(asset => <span key={asset.symbol} style={{ color: theme.accentWarm, fontSize: '11px', paddingTop: '8px' }}>{asset.symbol} {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%</span>)}</div>
    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${theme.border}` }}><div style={{ color: theme.text, fontWeight: 700, fontSize: '13px' }}>Watchlist & thresholds</div><div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginTop: '10px' }}>{watchlist.map(item => <span key={item.symbol} style={{ display: 'inline-flex', gap: '7px', alignItems: 'center', border: `1px solid ${theme.border}`, borderRadius: theme.radiusPill, padding: '5px 8px', color: theme.textMuted, fontSize: '11px' }}>{item.symbol} ±{item.thresholdPercent}% <button aria-label={`Remove ${item.symbol}`} onClick={() => void removeWatch(item)} style={{ ...buttonStyle, border: 0, padding: 0, color: theme.divergent }}>×</button></span>)}</div><div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginTop: '10px' }}><input value={symbol} onChange={event => setSymbol(event.target.value.toUpperCase())} onKeyDown={event => { if (event.key === 'Enter') void addWatch(); }} placeholder="SYMBOL" maxLength={12} style={{ ...buttonStyle, width: '90px', color: theme.text }} /><input value={threshold} onChange={event => setThreshold(event.target.value)} inputMode="decimal" aria-label="Alert threshold percent" style={{ ...buttonStyle, width: '76px', color: theme.text }} /><button onClick={() => void addWatch()} style={{ ...buttonStyle, borderColor: theme.borderBright, color: theme.accent }}>+ Add watch</button></div></div>
    <div style={{ marginTop: '18px' }}><div style={{ display: 'flex', justifyContent: 'space-between', color: theme.text, fontWeight: 700, fontSize: '13px' }}><span>Alerts</span><span style={{ color: alerts.length ? theme.warning : theme.textDim, fontSize: '11px' }}>{alerts.length ? `${alerts.length} active` : 'No threshold crossings'}</span></div>{alerts.length > 0 && <div style={{ display: 'grid', gap: '6px', marginTop: '9px' }}>{alerts.map(alert => <div key={alert.symbol} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '9px 10px', borderRadius: theme.radiusSmall, background: `${alert.severity === 'critical' ? theme.divergent : theme.warning}12`, color: alert.severity === 'critical' ? theme.divergent : theme.warning, fontSize: '11px' }}><span>{alert.symbol} crossed ±{alert.thresholdPercent}%</span><span>{alert.changePercent >= 0 ? '+' : ''}{alert.changePercent.toFixed(2)}% · {alert.severity.toUpperCase()}</span></div>)}</div>}</div>
    {loading && <div style={{ color: theme.textDim, fontSize: '11px', marginTop: '14px' }}>Refreshing observation…</div>}
  </section>;
}
