import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';
import { RememberEngine } from '../../packages/remember/dist/index.js';

const ollamaSuccess = async () => new Response(JSON.stringify({ response: 'A calm localized product description.' }), { status: 200 });
const ollamaDivergent = async () => new Response(JSON.stringify({ response: 'This miracle product can cure every problem.' }), { status: 200 });
const ollamaUnavailable = async () => {
  throw new Error('connection refused');
};

function makeApp(ollamaFetch: typeof fetch) {
  const directory = mkdtempSync(join(tmpdir(), 'omega-api-entity-sync-'));
  return {
    directory,
    app: createApp(join(directory, 'ledger.db'), false, {
      allowUnsignedCycle: true,
      ollamaFetch,
      ollamaBaseUrl: 'http://ollama.test:11434',
      ollamaModel: 'test-model',
    }),
  };
}

const payload = { product_id: 'oceanic-soap', target_market: 'JP', brand_dna_id: 'brand-core-01' };

test('entity sync executes bounded local Ollama generation and appends a verified receipt', async () => {
  const { directory, app } = makeApp(ollamaSuccess);
  let appClosed = false;
  try {
    await app.ready();
    const response = await app.inject({ method: 'POST', url: '/v1/entity/sync', payload });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.equal(body.status, 'VERIFIED');
    assert.equal(body.executed, true);
    assert.equal(body.ledgerMutation, true);
    assert.deepEqual(body.externalServicesCalled, ['http://ollama.test:11434/api/generate']);
    assert.equal(body.verification.status, 'VERIFIED');
    assert.match(body.receipt.hash, /^[a-f0-9]{64}$/);

    await app.close();
    appClosed = true;
    const receipts = new RememberEngine(join(directory, 'ledger.db'));
    assert.equal(receipts.verifyEntityReceiptChain().valid, true);
    assert.equal(receipts.getEntityReceipts().length, 1);
    receipts.close();
  } finally {
    if (!appClosed) await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('entity sync fails closed when local Ollama is unavailable and does not append a receipt', async () => {
  const { directory, app } = makeApp(ollamaUnavailable);
  try {
    await app.ready();
    const response = await app.inject({ method: 'POST', url: '/v1/entity/sync', payload });
    const body = response.json();
    assert.equal(response.statusCode, 503);
    assert.equal(body.status, 'UNKNOWN');
    assert.equal(body.error, 'OLLAMA_UNAVAILABLE');
    assert.equal(body.executed, false);
    assert.equal(body.ledgerMutation, false);
  } finally {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('entity sync rejects missing and invalid required fields before local execution', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    return ollamaSuccess();
  };
  const { directory, app } = makeApp(fetcher);
  try {
    await app.ready();
    const missing = await app.inject({ method: 'POST', url: '/v1/entity/sync', payload: { product_id: 'oceanic-soap' } });
    assert.equal(missing.statusCode, 400);
    assert.equal(missing.json().error, 'INVALID_REQUIRED_FIELD:target_market');

    const invalid = await app.inject({ method: 'POST', url: '/v1/entity/sync', payload: { ...payload, target_market: 'Japan' } });
    assert.equal(invalid.statusCode, 400);
    assert.equal(invalid.json().error, 'INVALID_TARGET_MARKET');
    assert.equal(calls, 0);
  } finally {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('entity sync returns 422 DIVERGENT and does not append when generated copy violates a brand rule', async () => {
  const { directory, app } = makeApp(ollamaDivergent);
  try {
    await app.ready();
    const response = await app.inject({ method: 'POST', url: '/v1/entity/sync', payload });
    const body = response.json();
    assert.equal(response.statusCode, 422);
    assert.equal(body.status, 'DIVERGENT');
    assert.equal(body.error, 'BRAND_RULE_VIOLATION');
    assert.equal(body.verification.bannedTerm, 'miracle');
    assert.equal(body.executed, true);
    assert.equal(body.ledgerMutation, false);
  } finally {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
