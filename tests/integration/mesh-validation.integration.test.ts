import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';

/*
 * GET /v1/mesh/validate returns bounded regional evidence plus local ledger
 * integrity. Migrated from apps/api/src/__tests__/mesh-validation.test.ts
 * (Jest, never run in this workspace) onto node:test.
 */

test('returns bounded regional evidence and local ledger integrity', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/mesh/validate?siliconYield=0.95&gridLoadMegawatts=1250&acceleratorInventory=600000',
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.deepEqual(body.validation.ledger, {
      intact: true,
      scope: 'local SQLite hash-chain recomputation',
    });
    assert.equal(body.validation.mesh.quorumReached, true);
    assert.equal(body.validation.receipt.status, 'VERIFIED');
    assert.equal(body.validation.receipt.observationId, body.telemetry.uuid);
    assert.match(body.validation.receipt.digest, /^[a-f0-9]{64}$/);
    assert.ok(
      String(body.evidenceBoundary).includes('not external consensus'),
      'the boundary must name what this is not'
    );
  } finally {
    await app.close();
  }
});

test('rejects missing or out-of-range telemetry without running convergence', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/mesh/validate?siliconYield=1.4&gridLoadMegawatts=1250',
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().success, false);
    assert.equal(response.json().error, 'INVALID_MESH_TELEMETRY');
  } finally {
    await app.close();
  }
});
