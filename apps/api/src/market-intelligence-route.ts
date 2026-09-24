import type { FastifyInstance } from 'fastify';

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

export function registerMarketIntelligenceRoute(fastify: FastifyInstance): void {
  fastify.get('/v1/market/snapshot', async () => {
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
      success: true,
      observation: 'market_snapshot',
      evidence: { providerCount: new Set(normalized.map(asset => asset.source)).size, live, assetCount: normalized.length },
      assets: normalized,
      signal: strongest ? `${strongest.symbol} leads relative momentum at ${strongest.changePercent >= 0 ? '+' : ''}${strongest.changePercent.toFixed(2)}%` : 'No dominant signal',
      observedAt: new Date().toISOString(),
    };
  });
}
