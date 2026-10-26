import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../index';
import { globalMarketEngine } from '../market-route';

describe('Market Route - XAU/USD Sovereign Engine', () => {
  let directory: string;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), 'omega-api-market-test-'));
    app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true });
    await app.ready();
  });

  afterAll(async () => {
    globalMarketEngine.stop();
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('GET /v1/market/quote returns live gold quote with sovereign proof hash', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/market/quote',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.quote.symbol).toBe('XAU/USD');
    expect(typeof body.quote.bid).toBe('number');
    expect(typeof body.quote.ask).toBe('number');
    expect(body.quote.ask).toBeGreaterThan(body.quote.bid);
    expect(body.quote.sovereignProofHash).toBeDefined();
    expect(body.quote.sovereignProofHash.length).toBe(64); // SHA-256
  });

  it('GET /v1/market/xauusd alias returns valid quote', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/market/xauusd',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.quote.symbol).toBe('XAU/USD');
  });

  it('GET /v1/market/history returns OHLCV candles', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/market/history?timeframe=15m&limit=50',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.symbol).toBe('XAU/USD');
    expect(body.timeframe).toBe('15m');
    expect(Array.isArray(body.candles)).toBe(true);
    expect(body.candles.length).toBe(50);

    const firstCandle = body.candles[0];
    expect(typeof firstCandle.open).toBe('number');
    expect(typeof firstCandle.high).toBe('number');
    expect(typeof firstCandle.low).toBe('number');
    expect(typeof firstCandle.close).toBe('number');
    expect(firstCandle.high).toBeGreaterThanOrEqual(firstCandle.low);
  });

  it('GET /v1/market/indicators returns technical analysis indicators', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/market/indicators',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.indicators.rsi).toBeDefined();
    expect(body.indicators.rsi).toBeGreaterThanOrEqual(0);
    expect(body.indicators.rsi).toBeLessThanOrEqual(100);
    expect(body.indicators.sma20).toBeDefined();
    expect(body.indicators.macd).toBeDefined();
    expect(body.indicators.bollinger).toBeDefined();
  });

  it('GET /v1/market/signals returns sovereign AI trading signals', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/market/signals',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.signals)).toBe(true);
    expect(body.signals.length).toBeGreaterThan(0);

    const sig = body.signals[0];
    expect(['BUY', 'SELL', 'HOLD', 'STRONG_BUY', 'STRONG_SELL']).toContain(sig.direction);
    expect(sig.confidence).toBeGreaterThanOrEqual(0);
    expect(sig.confidence).toBeLessThanOrEqual(1);
    expect(sig.provenance.sovereignIdentity).toBeDefined();
  });

  it('GET /v1/market/status returns session and liquidity metadata', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/market/status',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.symbol).toBe('XAU/USD');
    expect(Array.isArray(body.activeSessions)).toBe(true);
    expect(body.sovereignAttestation).toBe('VERIFIED_GOLD_FEED_V1111');
  });

  it('POST /v1/market/tick advances market and produces new quote', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/market/tick',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.quote.symbol).toBe('XAU/USD');
    expect(typeof body.quote.mid).toBe('number');
  });
});
