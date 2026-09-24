import assert from 'node:assert/strict';
import { describe, it, afterEach } from 'node:test';
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
    const app = createApp(':memory:', false);
    const response = await app.inject({ method: 'GET', url: '/v1/market/snapshot' });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.equal(body.assets.length, 6);
    assert.equal(body.evidence.live, true);
    assert.equal(body.evidence.providerCount, 2);
    assert.match(body.signal, /leads relative momentum/);
    await app.close();
  });
});
