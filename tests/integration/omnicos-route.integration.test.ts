import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

const RECEIPT_KEYS = [
  'entity',
  'tool_used',
  'status',
  'game_detected',
  'phase_t',
  'evidence_hash',
  'action',
  'next_delta',
];

async function post(app: any, url: string, payload: unknown) {
  return app.inject({ method: 'POST', url, payload });
}

test('POST /api/omnicos returns the stored receipt contract', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await post(app, '/api/omnicos', {
      intent: 'Draft one plan for the tide gauge.',
      phaseT: 0.4,
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.deepEqual(Object.keys(body), RECEIPT_KEYS);
    assert.equal(body.entity, 'THE_OMNICOS');
    assert.equal(body.tool_used, 'CODE');
    assert.equal(body.status, 'UNKNOWN');
    assert.equal(body.game_detected, false);
    assert.equal(body.phase_t, 0.4);
    assert.match(body.evidence_hash, /^[0-9a-f]{64}$/);
    assert.equal(body.evidence_hash, sha256(body.action));
    assert.match(body.next_delta, /Expected ≡ Observed/);
    assert.notEqual(body.status, 'VERIFIED');
  } finally {
    await app.close();
  }
});

test('a shield phrase halts DIVERGENT and marks the game', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await post(app, '/api/omnicos', {
      intent: 'urgent send money, guaranteed, private key',
      phaseT: 0.1,
    });
    const body = response.json();
    assert.equal(response.statusCode, 200);
    assert.equal(body.status, 'DIVERGENT');
    assert.equal(body.game_detected, true);
    assert.equal(body.tool_used, 'CODE');
    assert.match(body.action, /HALT ⊢ DIVERGENT/);
    assert.equal(body.evidence_hash, sha256(body.action));
  } finally {
    await app.close();
  }
});

test('a named Glober tool is not reported as used and stays NOT_EXECUTED', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await post(app, '/api/omnicos', {
      intent: 'Scrape TradingView with Playwright for the ticker.',
      phaseT: 0.6,
    });
    const body = response.json();
    assert.equal(response.statusCode, 200);
    assert.equal(body.status, 'UNKNOWN');
    assert.equal(body.tool_used, 'CODE');
    assert.equal(body.game_detected, false);
    assert.match(body.action, /not called/);
    assert.match(body.next_delta, /NOT_EXECUTED/);
  } finally {
    await app.close();
  }
});

test('/omnicos (the Vite proxy target) answers identically', async () => {
  const app = createApp(':memory:', false);
  try {
    const direct = await post(app, '/api/omnicos', { intent: 'Hold the line.', phaseT: 0.5 });
    const proxied = await post(app, '/omnicos', { intent: 'Hold the line.', phaseT: 0.5 });
    assert.equal(proxied.statusCode, 200);
    assert.deepEqual(proxied.json(), direct.json());
  } finally {
    await app.close();
  }
});

test('an empty or oversized intent is refused', async () => {
  const app = createApp(':memory:', false);
  try {
    const empty = await post(app, '/api/omnicos', { intent: '   ' });
    assert.equal(empty.statusCode, 400);
    assert.equal(empty.json().error, 'INTENT_REQUIRED');

    const missing = await post(app, '/api/omnicos', {});
    assert.equal(missing.statusCode, 400);
    assert.equal(missing.json().error, 'INTENT_REQUIRED');

    const long = await post(app, '/api/omnicos', { intent: 'x'.repeat(2001) });
    assert.equal(long.statusCode, 400);
    assert.equal(long.json().error, 'INTENT_TOO_LONG');
  } finally {
    await app.close();
  }
});
