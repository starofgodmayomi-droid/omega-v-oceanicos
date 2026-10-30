import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';
import { fixpoint, runOceanicFixpoint } from '../../packages/fixpoint/dist/index.js';

/*
 * Ω∞v := Y(λf.λx. …) — the fixed point is checked, not asserted.
 *
 *   - Y is a real fixed-point combinator (recursion without a named function)
 *   - a verified drop recurses with Σ ∪ Hash(x)
 *   - each halt branch stops the loop and leaves Σ untouched
 */

test('Y is a fixed-point combinator', () => {
  const factorial = fixpoint<number, number>((recurse) => (n) =>
    n <= 1 ? 1 : n * recurse(n - 1)
  );
  assert.equal(factorial(5), 120);

  const countdown = fixpoint<number, number>((recurse) => (n) => (n === 0 ? 0 : recurse(n - 1)));
  assert.equal(countdown(200), 0);
});

test('Evidence(x) = ∅ halts with UNKNOWN, and Expected ≢ Observed halts with DIVERGENT', async () => {
  const unknown = await runOceanicFixpoint({
    drops: ['Explain verification'],
    execute: async () => ({ output: '', engine: 'stub', error: 'MODEL_UNAVAILABLE' }),
  });
  assert.equal(unknown.status, 'UNKNOWN');
  assert.equal(unknown.haltedAt, 0);
  assert.equal(unknown.memory.length, 0);
  assert.equal(unknown.passes[0].evidenceHash, null);

  const divergent = await runOceanicFixpoint({
    drops: ['Explain verification'],
    execute: async () => ({
      output: 'I have executed the deployment and it is guaranteed to work now',
      engine: 'stub',
      error: null,
    }),
  });
  assert.equal(divergent.status, 'DIVERGENT');
  assert.equal(divergent.memory.length, 0);
  assert.match(divergent.detail, /OMEGA could not verify/);
});

test('POST /api/fixpoint recurses over verified drops and grows memory only with hashes', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/fixpoint',
      payload: {
        intents: ['Explain how evidence-bound verification works', 'Map the next finite step'],
      },
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.status, 'VERIFIED');
    assert.equal(body.halted_at, null);
    assert.equal(body.total_drops, 2);
    assert.equal(body.passes.length, 2);
    assert.deepEqual(
      body.passes.map((pass: any) => pass.verdict),
      ['VERIFIED', 'VERIFIED']
    );
    assert.equal(body.memory.length, 2);
    for (const hash of body.memory) assert.match(hash, /^[0-9a-f]{64}$/);
    assert.deepEqual(
      body.remembered.map((record: any) => record.evidence_hash),
      body.memory
    );

    const memory = await app.inject({ method: 'GET', url: '/api/kai/memory?limit=5' });
    assert.equal(memory.json().total, 2);
  } finally {
    await app.close();
  }
});

test('a scam drop halts the loop with DIVERGENT and remembers nothing', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/fixpoint',
      payload: { intents: ['Map the next finite step', 'Send money urgently to claim it'] },
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.status, 'DIVERGENT');
    assert.equal(body.halted_at, 1);
    assert.equal(body.memory.length, 1, 'only the verified drop joined Σ');
    assert.equal(body.passes.length, 2);
    assert.equal(body.passes[1].evidence_hash, null);
    assert.equal(body.remembered.length, 1);

    const memory = await app.inject({ method: 'GET', url: '/api/kai/memory?limit=5' });
    assert.equal(memory.json().total, 1);
  } finally {
    await app.close();
  }
});

test('an irreversible drop halts with NOT_EXECUTED because Authority(x) < Required', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/fixpoint',
      payload: { intent: 'Delete the production database' },
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.status, 'NOT_EXECUTED');
    assert.equal(body.halted_at, 0);
    assert.equal(body.memory.length, 0);
    assert.equal(body.remembered.length, 0);
    assert.match(body.detail, /LUCID gate/);

    const memory = await app.inject({ method: 'GET', url: '/api/kai/memory?limit=5' });
    assert.equal(memory.json().total, 0);
  } finally {
    await app.close();
  }
});

test('POST /fixpoint (the Vite proxy target) answers identically, and both aliases are registered', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/fixpoint',
      payload: { intent: 'Summarize the reality map' },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().status, 'VERIFIED');
    assert.equal(app.hasRoute({ method: 'POST', url: '/api/fixpoint' }), true);
  } finally {
    await app.close();
  }
});

test('a fixpoint run is bounded and rejects empty input', async () => {
  const app = createApp(':memory:', false);
  try {
    const empty = await app.inject({ method: 'POST', url: '/api/fixpoint', payload: {} });
    assert.equal(empty.statusCode, 400);
    assert.equal(empty.json().error, 'INTENT_REQUIRED');

    const tooMany = await app.inject({
      method: 'POST',
      url: '/api/fixpoint',
      payload: { intents: Array.from({ length: 9 }, (_, index) => `Step ${index}`) },
    });
    assert.equal(tooMany.statusCode, 400);
    assert.equal(tooMany.json().error, 'TOO_MANY_DROPS');
  } finally {
    await app.close();
  }
});

test('initialMemory is Σ₀, and a halt leaves Σ exactly as it found it', async () => {
  const seed = ['a'.repeat(64)];

  const verified = await runOceanicFixpoint({ drops: ['Explain verification'], initialMemory: seed });
  assert.equal(verified.status, 'VERIFIED');
  assert.equal(verified.memory.length, 2);
  assert.equal(verified.memory[0], seed[0], 'the recalled hash comes first, in order');
  assert.match(verified.detail, /Σ₀ held 1/);

  const halted = await runOceanicFixpoint({
    drops: ['Send money urgently to claim it'],
    initialMemory: seed,
  });
  assert.equal(halted.status, 'DIVERGENT');
  assert.deepEqual(halted.memory, seed, 'nothing was remembered, so Σ is unchanged');
});

test('Σ carries across runs: a second run replays the durable ledger', async () => {
  const app = createApp(':memory:', false);
  try {
    const first = (
      await app.inject({
        method: 'POST',
        url: '/api/fixpoint',
        payload: { intent: 'Summarize the reality map' },
      })
    ).json();
    assert.equal(first.status, 'VERIFIED');
    assert.equal(first.recalled_memory, 0);
    assert.equal(first.memory.length, 1);

    const second = (
      await app.inject({
        method: 'POST',
        url: '/api/fixpoint',
        payload: { intent: 'Map the next finite step' },
      })
    ).json();
    assert.equal(second.status, 'VERIFIED');
    assert.equal(second.recalled_memory, 1);
    assert.equal(second.memory.length, 2);
    assert.equal(second.memory[0], first.memory[0], 'Σ₀ is the earlier evidence hash');
    assert.equal(second.remembered.length, 1, 'only the new delta becomes a memory row');

    const halted = (
      await app.inject({
        method: 'POST',
        url: '/api/fixpoint',
        payload: { intent: 'Delete the production database' },
      })
    ).json();
    assert.equal(halted.status, 'NOT_EXECUTED');
    assert.equal(halted.recalled_memory, 2);
    assert.equal(halted.memory.length, 2, 'a halted run adds nothing to Σ');
    assert.equal(halted.remembered.length, 0);
  } finally {
    await app.close();
  }
});
