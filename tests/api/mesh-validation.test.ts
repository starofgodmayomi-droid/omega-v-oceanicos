import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';

/**
 * Converted from apps/api/src/__tests__/mesh-validation.test.ts. That suite
 * could not run in CI (no Jest runner for apps/api), so the mesh validation
 * boundary had no executing coverage.
 */
describe('GET /v1/mesh/validate', () => {
  it('returns bounded regional evidence and local ledger integrity', async () => {
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
      assert.partialDeepStrictEqual(body.validation.receipt, {
        status: 'VERIFIED',
        observationId: body.telemetry.uuid,
      });
      assert.match(body.validation.receipt.digest, /^[a-f0-9]{64}$/);
      assert.ok(body.evidenceBoundary.includes('not external consensus'));
    } finally {
      await app.close();
    }
  });

  it('rejects missing or out-of-range telemetry without running convergence', async () => {
    const app = createApp(':memory:', false);
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/mesh/validate?siliconYield=1.4&gridLoadMegawatts=1250',
      });

      assert.equal(response.statusCode, 400);
      assert.partialDeepStrictEqual(response.json(), {
        success: false,
        error: 'INVALID_MESH_TELEMETRY',
      });
    } finally {
      await app.close();
    }
  });
});
