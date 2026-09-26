import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { MarketWatchlistStore, type AlertEvent } from './market-watchlist-store.js';

type MarketAsset = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  kind: 'equity' | 'crypto';
  source: 'finnhub' | 'coingecko' | 'fallback';
};

const fallbackAssets: MarketAsset[] = [
  { symbol: 'SPX', name: 'S&P 500', price: 5864.67, change: 32.14, changePercent: 0.55, kind: 'equity', source: 'fallback' },
  { symbol: 'NDX', name: 'Nasdaq 100', price: 20528.18, change: 118.42, changePercent: 0.58, kind: 'equity', source: 'fallback' },
  { symbol: 'BTC', name: 'Bitcoin', price: 63248.2, change: -428.1, changePercent: -0.67, kind: 'crypto', source: 'fallback' },
  { symbol: 'ETH', name: 'Ethereum', price: 2641.08, change: 18.44, changePercent: 0.7, kind: 'crypto', source: 'fallback' },
  { symbol: 'NVDA', name: 'NVIDIA', price: 141.54, change: 3.22, changePercent: 2.33, kind: 'equity', source: 'fallback' },
  { symbol: 'TSLA', name: 'Tesla', price: 248.98, change: -2.11, changePercent: -0.84, kind: 'equity', source: 'fallback' },
];

async function fetchJson(url: string): Promise<Record<string, any>> {
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`provider_${response.status}`);
  return response.json() as Promise<Record<string, any>>;
}

async function fetchFinnhub(symbol: string, name: string, key: string): Promise<MarketAsset> {
  const quote = await fetchJson(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${key}`);
  const price = Number(quote.c);
  if (!Number.isFinite(price)) throw new Error('invalid_quote');
  return { symbol, name, price, change: Number(quote.d), changePercent: Number(quote.dp), kind: 'equity', source: 'finnhub' };
}

async function fetchCrypto(id: string, symbol: string, name: string): Promise<MarketAsset> {
  const data = await fetchJson(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`);
  const row = data[id];
  const price = Number(row?.usd);
  const changePercent = Number(row?.usd_24h_change);
  if (!Number.isFinite(price)) throw new Error('invalid_crypto_quote');
  return { symbol, name, price, change: price * changePercent / 100, changePercent, kind: 'crypto', source: 'coingecko' };
}

async function getSnapshot(): Promise<{ assets: MarketAsset[]; live: boolean; providerCount: number; signal: string; observedAt: string }> {
  const finnhubKey = process.env.FINNHUB_API_KEY?.trim();
  const equityDefinitions = [['NVDA', 'NVIDIA'], ['TSLA', 'Tesla'], ['AAPL', 'Apple'], ['MSFT', 'Microsoft']] as const;
  const results = await Promise.allSettled([
    ...(finnhubKey ? equityDefinitions.map(([symbol, name]) => fetchFinnhub(symbol, name, finnhubKey)) : []),
    fetchCrypto('bitcoin', 'BTC', 'Bitcoin'),
    fetchCrypto('ethereum', 'ETH', 'Ethereum'),
  ]);
  const assets = results.filter((result): result is PromiseFulfilledResult<MarketAsset> => result.status === 'fulfilled').map(result => result.value);
  const live = assets.length >= 2;
  const normalized = live ? assets : fallbackAssets;
  const strongest = [...normalized].sort((a, b) => b.changePercent - a.changePercent)[0];
  return {
    assets: normalized,
    live,
    providerCount: new Set(normalized.map(asset => asset.source)).size,
    signal: strongest ? `${strongest.symbol} leads relative momentum at ${strongest.changePercent >= 0 ? '+' : ''}${strongest.changePercent.toFixed(2)}%` : 'No dominant signal',
    observedAt: new Date().toISOString(),
  };
}

export function registerMarketIntelligenceRoute(fastify: FastifyInstance, dbPath = ':memory:'): void {
  const store = new MarketWatchlistStore(dbPath);
  fastify.addHook('onClose', async () => store.close());

  const evaluateAlerts = (snapshot: Awaited<ReturnType<typeof getSnapshot>>): Array<Omit<AlertEvent, 'id'>> => {
    const bySymbol = new Map(snapshot.assets.map(asset => [asset.symbol, asset]));
    return store.list().flatMap(item => {
      const asset = bySymbol.get(item.symbol);
      if (!asset || Math.abs(asset.changePercent) < item.thresholdPercent) return [];
      const severity = Math.abs(asset.changePercent) >= item.thresholdPercent * 2 ? 'critical' : 'watch';
      return [{ ...item, direction: asset.changePercent >= 0 ? 'up' as const : 'down' as const, severity, changePercent: asset.changePercent, price: asset.price, source: asset.source, observedAt: snapshot.observedAt }];
    });
  };

  fastify.get('/v1/market/snapshot', async () => {
    const snapshot = await getSnapshot();
    return { success: true, observation: 'market_snapshot', evidence: { providerCount: snapshot.providerCount, live: snapshot.live, assetCount: snapshot.assets.length }, assets: snapshot.assets, signal: snapshot.signal, observedAt: snapshot.observedAt };
  });

  fastify.get('/v1/market/watchlist', async () => ({ success: true, items: store.list() }));

  fastify.post('/v1/market/watchlist', async (request: any, reply) => {
    const symbol = String(request.body?.symbol ?? '').trim().toUpperCase();
    const thresholdPercent = Number(request.body?.thresholdPercent ?? 2);
    if (!/^[A-Z0-9.\-]{1,12}$/.test(symbol) || !Number.isFinite(thresholdPercent) || thresholdPercent <= 0 || thresholdPercent > 100) return reply.status(400).send({ success: false, error: 'INVALID_WATCH_ITEM', message: 'symbol and thresholdPercent are required' });
    const item = store.upsert(symbol, Number(thresholdPercent.toFixed(2)));
    return reply.status(201).send({ success: true, item });
  });

  fastify.delete('/v1/market/watchlist/:symbol', async (request: any, reply) => {
    const symbol = String(request.params.symbol ?? '').trim().toUpperCase();
    if (!store.remove(symbol)) return reply.status(404).send({ success: false, error: 'WATCH_ITEM_NOT_FOUND' });
    return { success: true, removed: symbol };
  });

  fastify.get('/v1/market/alerts', async () => {
    const snapshot = await getSnapshot();
    const alerts = evaluateAlerts(snapshot);
    return { success: true, alerts, observedAt: snapshot.observedAt, evidence: { live: snapshot.live, providerCount: snapshot.providerCount } };
  });

  fastify.post('/v1/market/scan', async () => {
    const startedAt = new Date().toISOString();
    const scanId = `market-scan-${randomUUID()}`;
    const snapshot = await getSnapshot();
    const candidates = evaluateAlerts(snapshot);
    const recorded = candidates.flatMap(candidate => {
      const event = store.recordAlertIfEligible(candidate);
      return event ? [event] : [];
    });
    const completedAt = new Date().toISOString();
    const scanRun = store.recordScanRun({ scanId, status: 'completed', startedAt, completedAt, live: snapshot.live, providerCount: snapshot.providerCount, assetCount: snapshot.assets.length, candidateCount: candidates.length, recordedCount: recorded.length, suppressedCount: candidates.length - recorded.length });
    return {
      success: true,
      scanId,
      scanRun,
      recordedAlerts: recorded,
      activeAlerts: candidates,
      suppressedCount: candidates.length - recorded.length,
      observedAt: snapshot.observedAt,
      evidence: { live: snapshot.live, providerCount: snapshot.providerCount, assetCount: snapshot.assets.length },
    };
  });

  fastify.get('/v1/market/alerts/history', async (request: any) => ({ success: true, events: store.history(Number(request.query?.limit ?? 50)) }));
  fastify.get('/v1/market/scans/history', async (request: any) => ({ success: true, runs: store.scanHistory(Number(request.query?.limit ?? 25)) }));
}
