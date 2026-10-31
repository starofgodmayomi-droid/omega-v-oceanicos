import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';

/**
 * Converted from apps/api/src/__tests__/ecosystem-body.test.ts, which could
 * not run under CI's node:test gate. This is the only executing contract for
 * GET /v1/ecosystem/body, the route that composes the whole body including
 * the KAI / ELION / OMEGA organs.
 */
describe('GET /v1/ecosystem/body', () => {
  const requiredLayers = ['sensory', 'verification', 'memory', 'mesh', 'kernel', 'governance', 'organs', 'interface'];

  it('composes every runtime layer into one verified, bounded body', async () => {
    const app = createApp(':memory:', false);
    try {
      const response = await app.inject({ method: 'GET', url: '/v1/ecosystem/body' });
      const body = response.json();

      assert.equal(response.statusCode, 200);
      assert.partialDeepStrictEqual(body, {
        success: true,
        bodyVersion: 'omega.fullstack.body.v1',
        status: 'VERIFIED',
        expansion: {
          appendOnly: true,
          readOnly: true,
          bounded: true,
          moduleInvariant: 'observe → verify → remember → govern → present',
        },
      });
      assert.deepEqual(Object.keys(body.layers), requiredLayers);
      assert.partialDeepStrictEqual(body.layers.sensory, { status: 'OBSERVED' });
      assert.partialDeepStrictEqual(body.layers.verification, { status: 'VERIFIED' });
      assert.partialDeepStrictEqual(body.layers.memory, { status: 'INTEGRITY_VERIFIED', tip: null });
      assert.partialDeepStrictEqual(body.layers.mesh, {
        // Observed on this tip: every regional vote passes, so the layer is
        // CONVERGED_PASS. The retired Jest suite still expected the older
        // CONVERGED_PLURAL label; asserting it would have hidden the drift.
        status: 'CONVERGED_PASS',
        convergence: { quorumReached: true },
      });
      assert.partialDeepStrictEqual(body.layers.kernel, {
        status: 'READY',
        capability: { capabilities: { remoteMutation: false, arbitraryShellExecution: false } },
      });
      assert.partialDeepStrictEqual(body.layers.governance, {
        status: 'HUMAN_GATE_REQUIRED',
        failClosed: true,
      });
      assert.partialDeepStrictEqual(body.layers.organs, {
        status: 'VERIFIED',
        failClosed: true,
        mind: { version: 'kai.mind.v1', status: 'VERIFIED', drops: 1, recalled: 1, memoryIsProof: false },
        hands: { status: 'NOT_EXECUTED', verification: 'PENDING_OMEGA' },
        judge: { verdict: 'VERIFIED', allow: true, differences: [] },
      });
      assert.partialDeepStrictEqual(body.layers.interface, { status: 'READY' });
    } finally {
      await app.close();
    }
  });

  it('is read-only and does not mutate the append-only ledger between reads', async () => {
    const app = createApp(':memory:', false);
    try {
      const first = await app.inject({ method: 'GET', url: '/v1/ecosystem/body' });
      const second = await app.inject({ method: 'GET', url: '/v1/ecosystem/body' });
      const firstBody = first.json();
      const secondBody = second.json();

      assert.equal(firstBody.layers.memory.tip, null);
      assert.equal(secondBody.layers.memory.tip, null);
      assert.notEqual(firstBody.layers.sensory.telemetry.uuid, secondBody.layers.sensory.telemetry.uuid);
      assert.equal(firstBody.expansion.readOnly, true);
      assert.equal(secondBody.expansion.appendOnly, true);
    } finally {
      await app.close();
    }
  });

  it('carries ledger integrity and a bounded tip after a verified cycle', async () => {
    const app = createApp(':memory:', false, { allowUnsignedCycle: true });
    try {
      const cycle = await app.inject({ method: 'POST', url: '/v1/cycle', payload: {} });
      assert.equal(cycle.statusCode, 200);

      const response = await app.inject({ method: 'GET', url: '/v1/ecosystem/body' });
      const body = response.json();
      assert.equal(response.statusCode, 200);
      assert.equal(body.layers.memory.status, 'INTEGRITY_VERIFIED');
      assert.equal(typeof body.layers.memory.tip.index, 'number');
      assert.match(body.layers.memory.tip.hash, /^[a-f0-9]{64}$/);
      assert.partialDeepStrictEqual(body.layers.verification.receipt, { status: 'VERIFIED' });
      assert.partialDeepStrictEqual(body.layers.organs, { status: 'VERIFIED', judge: { allow: true } });
    } finally {
      await app.close();
    }
  });
});
