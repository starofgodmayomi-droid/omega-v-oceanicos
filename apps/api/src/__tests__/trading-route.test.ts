import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../index';
import { globalMarketEngine } from '../market-route';
import { globalTradingEngine } from '../trading-route';

describe('Trading Route - Sovereign XAU/USD Position & Risk Engine', () => {
  let directory: string;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), 'omega-api-trading-test-'));
    app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true });
    await app.ready();
    // Reset state before tests
    globalTradingEngine.resetPortfolio();
  });

  afterAll(async () => {
    globalMarketEngine.stop();
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('GET /v1/trading/portfolio returns initial paper balance and zero open positions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/trading/portfolio',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.portfolio.balance).toBe(100000);
    expect(body.portfolio.equity).toBe(100000);
    expect(body.portfolio.marginUsed).toBe(0);
    expect(body.portfolio.positions.length).toBe(0);
  });

  it('POST /v1/trading/order admits and executes valid market BUY order', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/trading/order',
      payload: {
        symbol: 'XAU/USD',
        side: 'BUY',
        quantity: 0.5, // 0.5 lots = 50 oz
        leverage: 20,
        stopLoss: 2680.0,
        takeProfit: 2750.0,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.order.status).toBe('EXECUTED');
    expect(body.order.verificationGate.passed).toBe(true);
    expect(body.order.verificationGate.gateState).toBe('ADMITTED');
    expect(body.position).toBeDefined();
    expect(body.position.symbol).toBe('XAU/USD');
    expect(body.position.side).toBe('BUY');
    expect(body.position.quantity).toBe(0.5);
    expect(body.position.status).toBe('OPEN');
    expect(body.portfolio.marginUsed).toBeGreaterThan(0);
  });

  it('POST /v1/trading/order rejects order exceeding maximum lot size (fail-closed)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/trading/order',
      payload: {
        symbol: 'XAU/USD',
        side: 'BUY',
        quantity: 5.0, // Exceeds 2.0 lots limit
      },
    });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.order.status).toBe('REJECTED');
    expect(body.order.verificationGate.passed).toBe(false);
    expect(body.order.rejectionReason).toContain('exceeds max limit of 2 lots');
  });

  it('GET /v1/trading/positions returns active open positions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/trading/positions?status=OPEN',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.positions.length).toBeGreaterThan(0);
    expect(body.positions[0].status).toBe('OPEN');
  });

  it('POST /v1/trading/positions/:id/close realizes P&L and frees margin', async () => {
    // Get existing position ID
    const listRes = await app.inject({
      method: 'GET',
      url: '/v1/trading/positions?status=OPEN',
    });
    const positions = JSON.parse(listRes.body).positions;
    const targetPos = positions[0];

    const closeRes = await app.inject({
      method: 'POST',
      url: `/v1/trading/positions/${targetPos.id}/close`,
    });

    expect(closeRes.statusCode).toBe(200);
    const closeBody = JSON.parse(closeRes.body);
    expect(closeBody.success).toBe(true);
    expect(closeBody.position.status).toBe('CLOSED');
    expect(typeof closeBody.position.realizedPnl).toBe('number');
    expect(closeBody.portfolio.marginUsed).toBe(0);
    expect(closeBody.portfolio.totalTrades).toBeGreaterThanOrEqual(1);
  });

  it('GET /v1/trading/risk returns real-time risk guardrail audit report', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/trading/risk',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.risk.status).toBe('NORMAL');
    expect(body.risk.maxDrawdownLimitPercent).toBe(5);
    expect(body.risk.sovereignGuardrailsEnabled).toBe(true);
    expect(body.risk.failClosedTriggered).toBe(false);
  });

  it('POST /v1/trading/reset resets portfolio back to 100k paper balance', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/trading/reset',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.portfolio.balance).toBe(100000);
    expect(body.portfolio.positions.length).toBe(0);
  });
});
