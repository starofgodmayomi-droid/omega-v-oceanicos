import assert from 'node:assert/strict';
import { describe, it, afterEach } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../../apps/api/dist/index.js';

describe('market intelligence evidence route', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = originalFetch; });

  it('normalizes provider observations and reports evidence metadata', async () => {
    process.env.OMEGA_AUTH_MODE = 'local';
    process.env.OMEGA_PERSISTENCE = 'off';
    process.env.FINNHUB_API_KEY = 'test-key';
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('finnhub')) return new Response(JSON.stringify({ c: 100, d: 2, dp: 2 }), { status: 200 });
      const id = url.includes('bitcoin') ? 'bitcoin' : 'ethereum';
      return new Response(JSON.stringify({ [id]: { usd: id === 'bitcoin' ? 60000 : 3000, usd_24h_change: id === 'bitcoin' ? 1.5 : -1 } }), { status: 200 });
    }) as typeof fetch;
    const directory = mkdtempSync(join(tmpdir(), 'omega-market-'));
    const databasePath = join(directory, 'market.db');
    const app = createApp(databasePath, false);
    const response = await app.inject({ method: 'GET', url: '/v1/market/snapshot' });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.equal(body.assets.length, 6);
    assert.equal(body.evidence.live, true);
    assert.equal(body.evidence.providerCount, 2);
    assert.match(body.signal, /leads relative momentum/);
    const addWatch = await app.inject({ method: 'POST', url: '/v1/market/watchlist', payload: { symbol: 'ETH', thresholdPercent: 0.5 } });
    assert.equal(addWatch.statusCode, 201);
    const alerts = await app.inject({ method: 'GET', url: '/v1/market/alerts' });
    assert.equal(alerts.statusCode, 200);
    assert.equal(alerts.json().alerts.some((alert: { symbol: string }) => alert.symbol === 'ETH'), true);
    const history = await app.inject({ method: 'GET', url: '/v1/market/alerts/history' });
    assert.equal(history.statusCode, 200);
    assert.equal(history.json().events.length > 0, true);
    const removeWatch = await app.inject({ method: 'DELETE', url: '/v1/market/watchlist/ETH' });
    assert.equal(removeWatch.statusCode, 200);
    await app.close();
    const restarted = createApp(databasePath, false);
    const persisted = await restarted.inject({ method: 'GET', url: '/v1/market/watchlist' });
    assert.equal(persisted.json().items.some((item: { symbol: string }) => item.symbol === 'NVDA'), true);
    assert.equal(persisted.json().items.some((item: { symbol: string }) => item.symbol === 'ETH'), false);
    await restarted.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
