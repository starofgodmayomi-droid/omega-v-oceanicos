import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';

/**
 * Ported from the retired jest suite `apps/api/src/__tests__/retired/mesh-validation.test.ts`,
 * which asserted GET /v1/mesh/validate through the pre-Fastify entry point. The route
 * still exists, so its contract keeps its own evidence on the runnable `node --test` runner.
 */
test('GET /v1/mesh/validate returns bounded regional evidence and local ledger integrity', async () => {
  const app = createApp(':memory:', false);

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/mesh/validate?siliconYield=0.95&gridLoadMegawatts=1250&acceleratorInventory=600000',
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.deepEqual(body.validation.ledger, {
      intact: true,
      scope: 'local SQLite hash-chain recomputation',
    });
    assert.equal(body.validation.mesh.quorumReached, true);
    assert.equal(body.validation.receipt.status, 'VERIFIED');
    assert.equal(body.validation.receipt.observationId, body.telemetry.uuid);
    assert.match(body.validation.receipt.digest, /^[a-f0-9]{64}$/);
    assert.match(body.evidenceBoundary, /not external consensus/);
  } finally {
    await app.close();
  }
});

test('GET /v1/mesh/validate rejects missing or out-of-range telemetry without running convergence', async () => {
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
