import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';

test('durable revocations survive restart for an independent API instance', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'omega-revocation-persistence-'));
  const original = {
    nodeEnv: process.env.NODE_ENV,
    persistence: process.env.OMEGA_PERSISTENCE,
    runtimePath: process.env.OMEGA_RUNTIME_STORE_PATH,
    eventPath: process.env.OMEGA_EVENT_LOG_PATH,
  };
  process.env.NODE_ENV = 'test';
  process.env.OMEGA_PERSISTENCE = 'on';
  process.env.OMEGA_RUNTIME_STORE_PATH = join(directory, 'runtime.json');
  process.env.OMEGA_EVENT_LOG_PATH = join(directory, 'events.jsonl');
  try {
    const first = createApp(join(directory, 'first.db'), false);
    await first.ready();
    const revoked = await first.inject({
      method: 'POST',
      url: '/attest/revoke',
      payload: { attestationId: 'att-durable-1', reason: 'durable consistency regression', revokedBy: 'operator-1' },
    });
    assert.equal(revoked.statusCode, 201);
    await first.close();

    const second = createApp(join(directory, 'second.db'), false);
    await second.ready();
    try {
      const response = await second.inject({ method: 'GET', url: '/attest/revocations' });
      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.json().data, [
        {
          id: response.json().data[0].id,
          attestationId: 'att-durable-1',
          reason: 'durable consistency regression',
          revokedBy: 'operator-1',
          revokedAt: response.json().data[0].revokedAt,
        },
      ]);
      const duplicate = await second.inject({
        method: 'POST',
        url: '/attest/revoke',
        payload: { attestationId: 'att-durable-1', reason: 'duplicate after restart' },
      });
      assert.equal(duplicate.statusCode, 409);
    } finally {
      await second.close();
    }
  } finally {
    if (original.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = original.nodeEnv;
    if (original.persistence === undefined) delete process.env.OMEGA_PERSISTENCE;
    else process.env.OMEGA_PERSISTENCE = original.persistence;
    if (original.runtimePath === undefined) delete process.env.OMEGA_RUNTIME_STORE_PATH;
    else process.env.OMEGA_RUNTIME_STORE_PATH = original.runtimePath;
    if (original.eventPath === undefined) delete process.env.OMEGA_EVENT_LOG_PATH;
    else process.env.OMEGA_EVENT_LOG_PATH = original.eventPath;
    rmSync(directory, { recursive: true, force: true });
  }
});
