import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';

test('One Body ecosystem status binds full-stack organs to bounded evidence', async () => {
  const app = createApp(':memory:', false);
  try {
    await app.ready();
    const response = await app.inject({ method: 'GET', url: '/v1/ecosystem/status' });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.oneBody.name, 'Ω∞v Oceanicos');
    assert.equal(body.oneBody.invariant, 'VERIFY(ΔREALITY)');
    assert.equal(body.oneBody.stage, 'FULL STACK → ECOSYSTEM');
    assert.equal(body.oneBody.evidenceStatus, 'SUPPORTED');
    assert.equal(body.oneBody.evidence, 'runtime-observed');
    assert.ok(body.oneBody.organs.some((organ: { name: string }) => organ.name === 'Reality Observation'));
    assert.ok(body.oneBody.organs.some((organ: { name: string }) => organ.name === 'API & Web Interface'));
    assert.ok(body.oneBody.organs.some((organ: { name: string }) => organ.name === 'External Connectors'));
    assert.equal(body.oneBody.evidenceBoundary.evidenceMode, 'LOCAL_SYNTHETIC_SIMULATION');
    assert.equal(body.oneBody.evidenceBoundary.scope, 'local-api-runtime');
    assert.equal(body.oneBody.evidenceBoundary.externalRealityStatus, 'UNKNOWN');
    assert.ok(body.oneBody.limitations.some((item: string) => item.includes('not live GitHub')));
  } finally {
    await app.close();
  }
});

test('whole-body snapshot scopes VERIFIED to local synthetic evidence and leaves external reality UNKNOWN', async () => {
  const app = createApp(':memory:', false);
  try {
    await app.ready();
    const response = await app.inject({ method: 'GET', url: '/v1/ecosystem/body' });
    assert.equal(response.statusCode, 200);
    const body = response.json();

    assert.equal(body.status, 'VERIFIED');
    assert.equal(body.evidenceBoundary.evidenceMode, 'LOCAL_SYNTHETIC_SIMULATION');
    assert.equal(body.evidenceBoundary.scope, 'local-api-runtime');
    assert.equal(body.evidenceBoundary.externalRealityStatus, 'UNKNOWN');
    assert.equal(body.layers.sensory.evidenceMode, 'GENERATED');
    assert.equal(body.layers.verification.evidenceMode, 'LOCAL_RULE_EVALUATION');
    assert.equal(body.layers.mesh.evidenceMode, 'SIMULATED');
    assert.equal(body.layers.mesh.scope, 'in-process-model');
    assert.ok(body.evidenceBoundary.limitations.some((item: string) => item.includes('simulated in process')));
  } finally {
    await app.close();
  }
});
