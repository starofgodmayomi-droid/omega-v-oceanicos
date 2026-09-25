import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const worker = fileURLToPath(new URL('../../scripts/oceanicos-worker.mjs', import.meta.url));

function runWorker(environment: Record<string, string>) {
  return spawnSync(process.execPath, [worker], {
    cwd: process.cwd(),
    env: { ...process.env, ...environment },
    encoding: 'utf8',
  });
}

test('bounded worker rejects configuration outside its finite envelope', async (t) => {
  await t.test('rejects more than 32 cycles', () => {
    const result = runWorker({ OMEGA_WORKER_CYCLES: '33' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /OMEGA_WORKER_CYCLES must be an integer between 1 and 32/);
  });

  await t.test('rejects intervals longer than one hour', () => {
    const result = runWorker({ OMEGA_WORKER_INTERVAL_MS: '3600001' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /OMEGA_WORKER_INTERVAL_MS must be an integer between 0 and 3600000/);
  });

  await t.test('accepts the zero-interval boundary for a finite inspection', () => {
    const result = runWorker({ OMEGA_WORKER_CYCLES: '1', OMEGA_WORKER_INTERVAL_MS: '0' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /CYCLE 1: VERIFIED/);
  });
});
