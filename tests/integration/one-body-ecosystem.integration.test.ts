import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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

test('Body roles keep KAI and OMEGA UNKNOWN until a cycle is reconciled against the ledger', async () => {
  const app = createApp(':memory:', false, { allowUnsignedCycle: true });
  try {
    await app.ready();

    const before = (await app.inject({ method: 'GET', url: '/v1/body' })).json();
    assert.equal(before.roles.kai.recorded, 0);
    assert.equal(before.roles.kai.latest, null);
    assert.equal(before.roles.omega.judgment.status, 'UNKNOWN');

    const cycle = await app.inject({ method: 'POST', url: '/v1/cycle', payload: {} });
    assert.equal(cycle.statusCode, 200);

    const after = (await app.inject({ method: 'GET', url: '/v1/body' })).json();
    assert.equal(after.roles.kai.recorded, 1);
    assert.equal(after.roles.kai.latest.status, 'VERIFIED');
    assert.equal(after.roles.omega.judgment.status, 'VERIFIED');
    assert.match(after.roles.omega.judgment.evidence, /is the durable ledger tip/);
  } finally {
    await app.close();
  }
});

test('KAI recalls its continuity from the durable ledger after a restart', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'omega-kai-'));
  const dbPath = path.join(dir, 'ledger.db');
  try {
    const first = createApp(dbPath, false, { allowUnsignedCycle: true });
    await first.ready();
    assert.equal((await first.inject({ method: 'POST', url: '/v1/cycle', payload: {} })).statusCode, 200);
    await first.close();

    const second = createApp(dbPath, false, { allowUnsignedCycle: true });
    try {
      await second.ready();
      const roles = (await second.inject({ method: 'GET', url: '/v1/body' })).json().roles;
      assert.equal(roles.kai.recorded, 1);
      assert.equal(roles.kai.latest.source, 'remember.replay');
      assert.equal(roles.omega.judgment.status, 'VERIFIED');
    } finally {
      await second.close();
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
