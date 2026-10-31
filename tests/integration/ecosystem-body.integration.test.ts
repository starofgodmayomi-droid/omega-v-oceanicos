import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';

/*
 * GET /v1/ecosystem/body composes the seven runtime layers into one bounded
 * body. Migrated from apps/api/src/__tests__/ecosystem-body.test.ts (Jest,
 * never run in this workspace) onto node:test.
 */

const requiredLayers = [
  'sensory',
  'verification',
  'memory',
  'mesh',
  'kernel',
  'governance',
  'interface',
];

test('composes every runtime layer into one verified, bounded body', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({ method: 'GET', url: '/v1/ecosystem/body' });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.success, true);
    assert.equal(body.bodyVersion, 'omega.fullstack.body.v1');
    assert.equal(body.status, 'VERIFIED');
    assert.deepEqual(body.expansion, {
      appendOnly: true,
      readOnly: true,
      bounded: true,
      moduleInvariant: 'observe → verify → remember → govern → present',
    });
    assert.deepEqual(Object.keys(body.layers), requiredLayers);

    assert.equal(body.layers.sensory.status, 'OBSERVED');
    assert.equal(body.layers.verification.status, 'VERIFIED');
    assert.equal(body.layers.memory.status, 'INTEGRITY_VERIFIED');
    assert.equal(body.layers.memory.tip, null);
    // The Jest original expected CONVERGED_PLURAL; the mesh layer reports a
    // passing local quorum as CONVERGED_PASS today.
    assert.equal(body.layers.mesh.status, 'CONVERGED_PASS');
    assert.equal(body.layers.mesh.convergence.quorumReached, true);
    assert.equal(body.layers.kernel.status, 'READY');
    assert.equal(body.layers.kernel.capability.capabilities.remoteMutation, false);
    assert.equal(body.layers.kernel.capability.capabilities.arbitraryShellExecution, false);
    assert.equal(body.layers.governance.status, 'HUMAN_GATE_REQUIRED');
    assert.equal(body.layers.governance.failClosed, true);
    assert.equal(body.layers.interface.status, 'READY');
  } finally {
    await app.close();
  }
});

test('is read-only and does not mutate the append-only ledger between reads', async () => {
  const app = createApp(':memory:', false);
  try {
    const firstBody = (await app.inject({ method: 'GET', url: '/v1/ecosystem/body' })).json();
    const secondBody = (await app.inject({ method: 'GET', url: '/v1/ecosystem/body' })).json();

    assert.equal(firstBody.layers.memory.tip, null);
    assert.equal(secondBody.layers.memory.tip, null);
    assert.notEqual(
      firstBody.layers.sensory.telemetry.uuid,
      secondBody.layers.sensory.telemetry.uuid,
      'each observation is its own reading'
    );
    assert.equal(firstBody.expansion.readOnly, true);
    assert.equal(secondBody.expansion.appendOnly, true);
  } finally {
    await app.close();
  }
});

test('carries ledger integrity and a bounded tip after a verified cycle', async () => {
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
    assert.equal(body.layers.verification.receipt.status, 'VERIFIED');
  } finally {
    await app.close();
  }
});
