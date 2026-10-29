/**
 * POST /v1/omega/continuum — the Reality////Ω∞v verdict the dashboard reads.
 *
 * The endpoint judges the drops the caller supplies. It does not execute,
 * observe, or persist anything, so every assertion below is about the
 * operator's guards and its memory law over those supplied fields.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';

const authorized = { authority: 1, requiredAuthority: 1 };

async function withApp(run: (app: Awaited<ReturnType<typeof buildApp>>) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'omega-continuum-api-'));
  const app = buildApp(dir);
  await app.ready();
  try {
    await run(app);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

function buildApp(dir: string) {
  return createApp(join(dir, 'test.db'), false, { allowUnsignedCycle: true });
}

test('reports VERIFIED and remembers every matched Δ', async () => {
  await withApp(async (app) => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/omega/continuum',
      payload: {
        drops: [
          { delta: 'S1', expected: 'tip=1', observed: 'tip=1', evidence: ['ev:1'], ...authorized },
          { delta: 'S2', expected: 'tip=2', observed: 'tip=2', evidence: ['ev:2'], ...authorized },
        ],
      },
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.success, true);
    assert.equal(body.status, 'VERIFIED');
    assert.equal(body.halted, false);
    assert.deepEqual(body.memory, ['S1', 'S2']);
    assert.deepEqual(body.steps.map((step: { admitted: boolean }) => step.admitted), [true, true]);
    assert.equal(body.contract.name, 'reality.continuum.v1');
    assert.match(body.scope, /no execution, observation, or persistence/);
  });
});

test('halts DIVERGENT on a scam drop and remembers only the verified Δ before it', async () => {
  await withApp(async (app) => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/omega/continuum',
      payload: {
        drops: [
          { delta: 'S1', expected: 1, observed: 1, evidence: ['ev:1'], ...authorized },
          { delta: 'scam', expected: 'paid', observed: 'paid', evidence: ['ev:scam'], scam: true, ...authorized },
          { delta: 'never-reached', expected: 2, observed: 2, evidence: ['ev:2'], ...authorized },
        ],
      },
    });
    const body = response.json();

    assert.equal(body.status, 'DIVERGENT');
    assert.equal(body.halted, true);
    assert.deepEqual(body.memory, ['S1']);
    assert.equal(body.steps.length, 2, 'the third drop is never evaluated');
    assert.equal(body.steps[1].delta, 'scam');
    assert.match(body.steps[1].evidence, /SCAM/);
  });
});

test('keeps an expected/observed conflict in the receipt instead of admitting it', async () => {
  await withApp(async (app) => {
    const body = (await app.inject({
      method: 'POST',
      url: '/v1/omega/continuum',
      payload: { drops: [{ delta: 'S1', expected: 'tip=1', observed: 'tip=7', evidence: ['ev:1'], ...authorized }] },
    })).json();

    assert.equal(body.status, 'DIVERGENT');
    assert.deepEqual(body.memory, []);
    assert.equal(body.steps[0].expected, 'tip=1');
    assert.equal(body.steps[0].observed, 'tip=7');
    assert.match(body.steps[0].evidence, /Expected ≠ Observed/);
  });
});

test('halts UNKNOWN without evidence and NOT_EXECUTED without authority', async () => {
  await withApp(async (app) => {
    const unknown = (await app.inject({
      method: 'POST',
      url: '/v1/omega/continuum',
      payload: { drops: [{ delta: 'S1', expected: 1, observed: 1, evidence: [], ...authorized }] },
    })).json();
    assert.equal(unknown.status, 'UNKNOWN');
    assert.deepEqual(unknown.memory, []);

    const unauthorized = (await app.inject({
      method: 'POST',
      url: '/v1/omega/continuum',
      payload: { drops: [{ delta: 'S1', expected: 1, observed: 1, evidence: ['ev:1'], authority: 0, requiredAuthority: 1 }] },
    })).json();
    assert.equal(unauthorized.status, 'NOT_EXECUTED');
    assert.deepEqual(unauthorized.memory, []);
  });
});

test('carries supplied memory as a union and does not re-admit an existing Δ', async () => {
  await withApp(async (app) => {
    const body = (await app.inject({
      method: 'POST',
      url: '/v1/omega/continuum',
      payload: {
        memory: ['S1'],
        drops: [
          { delta: 'S1', expected: 1, observed: 1, evidence: ['ev:1'], ...authorized },
          { delta: 'S2', expected: 2, observed: 2, evidence: ['ev:2'], ...authorized },
        ],
      },
    })).json();

    assert.deepEqual(body.memory, ['S1', 'S2']);
    assert.deepEqual(body.steps.map((step: { admitted: boolean }) => step.admitted), [false, true]);
  });
});

test('rejects a malformed drop set without evaluating anything', async () => {
  await withApp(async (app) => {
    const missing = await app.inject({ method: 'POST', url: '/v1/omega/continuum', payload: { drops: [] } });
    assert.equal(missing.statusCode, 400);
    assert.equal(missing.json().error, 'CONTINUUM_DROPS_REQUIRED');

    const badEvidence = await app.inject({
      method: 'POST',
      url: '/v1/omega/continuum',
      payload: { drops: [{ delta: 'S1', expected: 1, observed: 1, evidence: 'ev:1', ...authorized }] },
    });
    assert.equal(badEvidence.statusCode, 400);
    assert.equal(badEvidence.json().error, 'CONTINUUM_DROP_INVALID');

    const badAuthority = await app.inject({
      method: 'POST',
      url: '/v1/omega/continuum',
      payload: { drops: [{ delta: 'S1', expected: 1, observed: 1, evidence: ['ev:1'], authority: 'high', requiredAuthority: 1 }] },
    });
    assert.equal(badAuthority.statusCode, 400);
    assert.equal(badAuthority.json().error, 'CONTINUUM_DROP_INVALID');

    const badMemory = await app.inject({
      method: 'POST',
      url: '/v1/omega/continuum',
      payload: { memory: [1], drops: [{ delta: 'S1', expected: 1, observed: 1, evidence: ['ev:1'], ...authorized }] },
    });
    assert.equal(badMemory.statusCode, 400);
    assert.equal(badMemory.json().error, 'CONTINUUM_MEMORY_INVALID');
  });
});
