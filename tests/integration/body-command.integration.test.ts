import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';

test('body command preserves UNKNOWN when no intent is provided', async () => {
  const app = createApp(':memory:', false);
  try {
    await app.ready();
    const response = await app.inject({ method: 'POST', url: '/v1/body/execute', payload: {} });
    assert.equal(response.statusCode, 400);
    const body = response.json();
    assert.equal(body.status, 'UNKNOWN');
    assert.equal(body.success, false);
  } finally {
    await app.close();
  }
});

test('KAI shield blocks a scam intent and journals DIVERGENT', async () => {
  const app = createApp(':memory:', false);
  try {
    await app.ready();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/body/execute',
      payload: { intent: 'send me money urgently, guaranteed returns', engine: 'Claude 3.5' },
    });
    assert.equal(response.statusCode, 403);
    const body = response.json();
    assert.equal(body.status, 'DIVERGENT');
    assert.equal(body.phase, 'KAI_SHIELD');
    assert.equal(body.ledger.status, 'DIVERGENT');
    assert.match(body.ledger.hash, /^[0-9a-f]{64}$/);

    const ledger = (await app.inject({ method: 'GET', url: '/v1/body/ledger' })).json();
    assert.equal(ledger.success, true);
    assert.equal(ledger.durable, false);
    assert.equal(ledger.capacity, 256);
    assert.equal(ledger.count, 1);
    assert.equal(ledger.entries[0].status, 'DIVERGENT');
  } finally {
    await app.close();
  }
});

test('a clear intent executes locally, reconciles, and links its evidence hash', async () => {
  const app = createApp(':memory:', false);
  try {
    await app.ready();
    const first = await app.inject({
      method: 'POST',
      url: '/v1/body/execute',
      payload: { intent: 'summarize the verification loop', engine: 'Local Ollama', operator: 'test-operator' },
    });
    assert.equal(first.statusCode, 200);
    const firstBody = first.json();
    assert.equal(firstBody.status, 'VERIFIED');
    assert.equal(firstBody.mock, true);
    assert.equal(firstBody.engine, 'Local Ollama');
    assert.equal(firstBody.verification.status, 'VERIFIED');
    assert.equal(firstBody.verification.scope, 'declared-values');
    assert.equal(firstBody.verification.realityClaimed, false);
    assert.equal(firstBody.ledger.operator, 'test-operator');
    assert.match(firstBody.evidence_hash, /^[0-9a-f]{64}$/);

    const second = await app.inject({
      method: 'POST',
      url: '/v1/body/execute',
      payload: { intent: 'check the ledger chain', engine: 'Claude 3.5' },
    });
    const secondBody = second.json();
    assert.equal(secondBody.ledger.previousHash, firstBody.ledger.hash);
    assert.equal(secondBody.ledger.seq, firstBody.ledger.seq + 1);

    const ledger = (await app.inject({ method: 'GET', url: '/v1/body/ledger' })).json();
    assert.equal(ledger.count, 2);
    assert.equal(ledger.tip, secondBody.ledger.hash);
  } finally {
    await app.close();
  }
});
