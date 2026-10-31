import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';

/**
 * Consolidates the two route contracts that only ever lived in the retired
 * Jest-era `apps/api/src/__tests__` files: `/v1/mesh/validate` and
 * `/v1/kernel/capabilities`. They were the only endpoints asserted there
 * that the canonical node suite did not already cover — the rest of that
 * directory exercised an Express, pre-`/v1` surface (and helpers such as
 * `parseAuditQuery`) that no longer exists in `apps/api/src`.
 */

test('GET /v1/kernel/capabilities exposes the bounded kernel contract as read-only evidence', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({ method: 'GET', url: '/v1/kernel/capabilities' });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.success, true);
    assert.equal(body.capability.contract, 'oceanicos-kernel.v1');
    assert.equal(body.capability.execution, 'local-simulation-only');
    assert.equal(body.capability.capabilities.remoteMutation, false);
    assert.equal(body.capability.capabilities.arbitraryShellExecution, false);
    assert.equal(typeof body.evaluatedAt, 'string');
  } finally {
    await app.close();
  }
});

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
    assert.ok(String(body.evidenceBoundary).includes('not external consensus'));
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
