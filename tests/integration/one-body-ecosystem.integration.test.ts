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
    assert.ok(body.oneBody.limitations.some((item: string) => item.includes('not live GitHub')));
  } finally {
    await app.close();
  }
});
