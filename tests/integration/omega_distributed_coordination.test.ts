import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../../apps/api/dist/index.js';

describe('Ω durable multi-process coordination', () => {
  const directory = mkdtempSync(join(tmpdir(), 'omega-distributed-'));
  const dbPath = join(directory, 'ledger.db');
  const first = createApp(dbPath, false);
  const second = createApp(dbPath, false);

  before(async () => { await first.ready(); await second.ready(); });
  after(async () => { await first.close(); await second.close(); rmSync(directory, { recursive: true, force: true }); });

  it('shares commands and events between independent API processes', async () => {
    const created = await first.inject({ method: 'POST', url: '/v1/omega/commands', payload: { intent: 'durable coordination check', requestedBy: 'process-a', workers: ['observer'], idempotencyKey: 'distributed-1' } });
    assert.equal(created.statusCode, 201);
    const commandId = created.json().command.commandId;
    const inspected = await second.inject({ method: 'GET', url: `/v1/omega/commands/${commandId}` });
    assert.equal(inspected.statusCode, 200);
    assert.equal(inspected.json().command.commandId, commandId);
    const events = await second.inject({ method: 'GET', url: `/v1/omega/events?commandId=${commandId}` });
    assert.equal(events.json().events.length, 1);
  });

  it('coordinates worker registration and exclusive leases across processes', async () => {
    const registered = await first.inject({ method: 'POST', url: '/v1/omega/workers/register', payload: { workerId: 'worker-process-a', capabilities: ['TEST'] } });
    assert.equal(registered.statusCode, 200);
    const lease = await second.inject({ method: 'POST', url: '/v1/omega/workers/worker-process-a/lease', payload: { commandId: 'command-lease-1', capability: 'TEST', durationMs: 5000 } });
    assert.equal(lease.statusCode, 200);
    const duplicate = await first.inject({ method: 'POST', url: '/v1/omega/workers/worker-process-a/lease', payload: { commandId: 'command-lease-1', capability: 'TEST', durationMs: 5000 } });
    assert.equal(duplicate.statusCode, 409);
    const released = await first.inject({ method: 'POST', url: `/v1/omega/workers/worker-process-a/lease/${lease.json().lease.leaseId}/release` });
    assert.equal(released.statusCode, 200);
  });
});
