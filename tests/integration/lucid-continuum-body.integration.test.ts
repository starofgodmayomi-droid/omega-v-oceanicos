import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';

test('ecosystem body exposes a bounded LucidContinuum XYZW snapshot', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({ method: 'GET', url: '/v1/ecosystem/body' });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.equal(body.lucidContinuum.version, 'lucid-continuum.xyzw.v1');
    assert.equal(body.lucidContinuum.mode, 'OBSERVED_RUNTIME_SNAPSHOT');
    assert.deepEqual(body.lucidContinuum.coordinate, {
      x: 'OBSERVE_VERIFY_REMEMBER',
      y: 'VERIFIED',
      z: ['L2_PROTOCOLS_SOFTWARE', 'REPOSITORY_RUNTIME'],
      w: 'LOCAL_PROVENANCE_CONTINUITY',
    });
    assert.deepEqual(body.lucidContinuum.evidence.sources, [
      'observer-runtime',
      'verification-engine',
      'memory-ledger',
      'mesh-convergence',
    ]);
    assert.match(body.lucidContinuum.evidence.limitation, /not neural measurement/);
  } finally {
    await app.close();
  }
});
