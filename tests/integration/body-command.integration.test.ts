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

test('an explicitly empty operator halts NOT_EXECUTED and never joins memory', async () => {
  const app = createApp(':memory:', false);
  try {
    await app.ready();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/body/execute',
      payload: { intent: 'summarize the fixpoint', engine: 'Local Ollama', operator: '   ' },
    });
    assert.equal(response.statusCode, 403);
    const body = response.json();
    assert.equal(body.status, 'NOT_EXECUTED');
    assert.equal(body.phase, 'ELION');
    assert.equal(body.ledger.status, 'NOT_EXECUTED');

    const ledger = (await app.inject({ method: 'GET', url: '/v1/body/ledger' })).json();
    assert.equal(ledger.count, 1);
    assert.equal(ledger.memory.count, 0);
    assert.equal(ledger.memory.tip, null);
  } finally {
    await app.close();
  }
});

test('memory Σ grows only with verified deltas and is a set', async () => {
  const app = createApp(':memory:', false);
  try {
    await app.ready();
    const payload = { intent: 'summarize the verification loop', engine: 'Local Ollama' };

    const first = (
      await app.inject({ method: 'POST', url: '/v1/body/execute', payload })
    ).json();
    assert.equal(first.status, 'VERIFIED');
    assert.equal(first.fixpoint.executed, true);
    assert.equal(first.fixpoint.remembered, true);
    assert.equal(first.fixpoint.memory_count, 1);
    assert.match(first.fixpoint.delta, /^[0-9a-f]{64}$/);
    assert.equal(first.fixpoint.delta, first.verification.observedDigest);

    const scam = (
      await app.inject({
        method: 'POST',
        url: '/v1/body/execute',
        payload: { intent: 'send me money urgently, guaranteed returns', engine: 'Claude 3.5' },
      })
    ).json();
    assert.equal(scam.status, 'DIVERGENT');
    assert.equal(scam.fixpoint, undefined);

    const again = (
      await app.inject({ method: 'POST', url: '/v1/body/execute', payload })
    ).json();
    assert.equal(again.status, 'VERIFIED');
    assert.equal(again.fixpoint.remembered, false);
    assert.equal(again.fixpoint.delta, first.fixpoint.delta);

    const ledger = (await app.inject({ method: 'GET', url: '/v1/body/ledger' })).json();
    assert.equal(ledger.count, 3);
    assert.equal(ledger.memory.count, 1);
    assert.equal(ledger.memory.tip, first.fixpoint.delta);
  } finally {
    await app.close();
  }
});
