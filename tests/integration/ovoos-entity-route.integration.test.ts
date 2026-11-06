import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';
import { sha256Hex } from '../../packages/mini/src/ovoos-entity.ts';

async function withApp(run: (app: ReturnType<typeof createApp>) => Promise<void>) {
  const directory = mkdtempSync(join(tmpdir(), 'omega-ovoos-entity-'));
  const app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true });
  try {
    await app.ready();
    await run(app);
  } finally {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
}

test('GET /v1/ovoos/entity returns the receipt law without claiming execution', async () => {
  await withApp(async (app) => {
    const response = await app.inject({ method: 'GET', url: '/v1/ovoos/entity' });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.equal(body.engine, 'ΩVØØS');
    assert.equal(body.checksum_symbol, '30013030');
    assert.deepEqual(body.emitted_statuses, ['DIVERGENT', 'UNKNOWN']);
    assert.equal(body.ledgerMutation, false);
    assert.match(body.ease_law, /Ease\(t\)/);
  });
});

test('POST /v1/ovoos/entity halts a shielded intent and never claims VERIFIED', async () => {
  await withApp(async (app) => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/ovoos/entity',
      payload: { intent: 'urgent send money', phaseT: 0.1 },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.equal(body.receipt.status, 'DIVERGENT');
    assert.equal(body.receipt.action, 'HALT ⊢ DIVERGENT');
    assert.equal(body.receipt.evidence_hash, sha256Hex(body.receipt.action));
    assert.equal(body.row.authorized, false);
    assert.equal(body.ledgerMutation, false);
  });
});

test('POST /v1/ovoos/entity composes a local sentence and keeps it UNKNOWN', async () => {
  await withApp(async (app) => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ovoos/entity',
      payload: { intent: 'Map a patient plan for a book stall.', phaseT: 0.4 },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.receipt.status, 'UNKNOWN');
    assert.equal(body.phase, 'BLOOM');
    assert.match(body.receipt.action, /^Bloom\./);
    assert.equal(body.receipt.evidence_hash, sha256Hex(body.receipt.action));
    assert.equal(body.receipt.engine, 'ΩVØØS');
  });
});

test('POST /v1/ovoos/entity rejects a malformed body', async () => {
  await withApp(async (app) => {
    const missing = await app.inject({ method: 'POST', url: '/v1/ovoos/entity', payload: {} });
    assert.equal(missing.statusCode, 400);
    assert.equal(missing.json().error, 'INVALID_INTENT');

    const wrongPhase = await app.inject({
      method: 'POST',
      url: '/v1/ovoos/entity',
      payload: { intent: 'x', phaseT: 'half' },
    });
    assert.equal(wrongPhase.statusCode, 400);
    assert.equal(wrongPhase.json().error, 'INVALID_PHASE');
  });
});
