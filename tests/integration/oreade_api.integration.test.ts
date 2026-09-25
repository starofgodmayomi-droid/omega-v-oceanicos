import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';

test('API translates ƆREADE intent into a bounded read-only Drop', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'omega-oreade-api-'));
  const app = createApp(join(dir, 'test.db'), false, { allowUnsignedCycle: true });
  await app.ready();

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/omega/oreade/drop',
      payload: {
        symbolicIntent: 'activate a community wisdom reflection',
        requestedBy: 'telegram:8632545391',
        targetScope: ['oracle:reflection'],
        idempotencyKey: 'reflection-integration-001',
        stopCondition: 'stop after one generated reflection',
        expectedObservation: 'one response labeled symbolic is returned',
      },
    });
    const body = response.json();

    assert.equal(response.statusCode, 201);
    assert.equal(body.success, true);
    assert.equal(body.drop.kind, 'EXECUTION');
    assert.equal(body.drop.authority, 'MUST_BE_SUPPLIED_BY_RUNTIME');
    assert.equal(body.drop.admission, 'NOT_GRANTED_BY_TRANSLATION');
    assert.equal(body.readOnly, true);
    assert.match(body.nextAction, /supply attributable authority/);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('API rejects an unbounded ƆREADE target scope', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'omega-oreade-api-invalid-'));
  const app = createApp(join(dir, 'test.db'), false, { allowUnsignedCycle: true });
  await app.ready();

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/omega/oreade/drop',
      payload: {
        symbolicIntent: 'offer guidance',
        requestedBy: 'operator:test',
        targetScope: [],
        idempotencyKey: 'invalid-integration-001',
        stopCondition: 'stop',
        expectedObservation: 'one answer',
      },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().success, false);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
