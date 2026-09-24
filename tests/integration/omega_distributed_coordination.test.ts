import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../../apps/api/dist/index.js';
import { runCoordinationEvidenceProbe } from '../../packages/coordination/dist/index.js';

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

  it('exposes bounded coordination evidence through the durable API contract', async () => {
    const created = await first.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: { intent: 'public coordination evidence', requestedBy: 'api-test', workers: ['observer'], idempotencyKey: 'public-evidence-1' },
    });
    assert.equal(created.statusCode, 201);
    const commandId = created.json().command.commandId;
    const response = await first.inject({ method: 'POST', url: '/v1/omega/coordination/evidence', payload: { commandId } });
    assert.equal(response.statusCode, 200);
    const evidence = response.json().evidence;
    assert.equal(evidence.kind, 'coordination-evidence');
    assert.equal(evidence.evidence, 'runtime-observed');
    assert.equal(evidence.scope, 'multi-process-single-volume');
    assert.equal(evidence.verified, true);
    assert.equal(evidence.commandId, commandId);
    assert.equal(evidence.rejectedWorkers.length, 1);
    assert.ok(evidence.eventTypes.includes('worker.lease-acquired'));
    assert.ok(evidence.eventTypes.includes('worker.lease-rejected'));
    assert.ok(evidence.eventTypes.includes('worker.lease-released'));
  });

  it('refuses coordination evidence on an ephemeral store', async () => {
    const ephemeral = createApp(':memory:', false);
    await ephemeral.ready();
    try {
      const response = await ephemeral.inject({
        method: 'POST',
        url: '/v1/omega/coordination/evidence',
        payload: { commandId: 'ephemeral-command' },
      });
      assert.equal(response.statusCode, 503);
      assert.equal(response.json().error, 'COORDINATION_EVIDENCE_REQUIRES_DURABLE_STORE');
    } finally {
      await ephemeral.close();
    }
  });

  it('rejects malformed evidence command IDs before probing workers', async () => {
    const response = await first.inject({
      method: 'POST',
      url: '/v1/omega/coordination/evidence',
      payload: { commandId: ' invalid-command' },
    });
    assert.equal(response.statusCode, 409);
    assert.equal(response.json().error, 'coordination probe commandId is invalid');
  });

  it('rejects unknown evidence commands without creating probe events', async () => {
    const before = (await first.inject({ method: 'GET', url: '/v1/omega/events?commandId=unknown-evidence-command' })).json().events;
    const response = await first.inject({
      method: 'POST',
      url: '/v1/omega/coordination/evidence',
      payload: { commandId: 'unknown-evidence-command' },
    });
    const after = (await first.inject({ method: 'GET', url: '/v1/omega/events?commandId=unknown-evidence-command' })).json().events;
    assert.equal(response.statusCode, 404);
    assert.equal(response.json().error, 'OMEGA_COMMAND_NOT_FOUND');
    assert.deepEqual(after, before);
  });

  it('emits bounded multi-process evidence and replays the lease lifecycle after restart', async () => {
    const probeDirectory = mkdtempSync(join(tmpdir(), 'omega-probe-'));
    const probePath = join(probeDirectory, 'ledger.db');
    const probeFirst = createApp(probePath, false);
    const probeSecond = createApp(probePath, false);
    await probeFirst.ready();
    await probeSecond.ready();
    const created = await probeFirst.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: { intent: 'coordination evidence probe', requestedBy: 'probe', workers: ['observer'], idempotencyKey: 'probe-replay-1' },
    });
    assert.equal(created.statusCode, 201);
    const commandId = created.json().command.commandId;
    const client = (app: typeof probeFirst) => ({
      registerWorker: async (workerId: string, capabilities: string[]) => {
        const response = await app.inject({ method: 'POST', url: '/v1/omega/workers/register', payload: { workerId, capabilities } });
        assert.equal(response.statusCode, 200);
      },
      acquireLease: async (workerId: string, id: string) => {
        const response = await app.inject({ method: 'POST', url: `/v1/omega/workers/${workerId}/lease`, payload: { commandId: id, capability: 'PROBE', durationMs: 5000 } });
        return response.statusCode === 200 ? { leaseId: response.json().lease.leaseId } : {};
      },
      releaseLease: async (workerId: string, leaseId: string) => (await app.inject({ method: 'POST', url: `/v1/omega/workers/${workerId}/lease/${leaseId}/release` })).statusCode === 200,
      replayEvents: async (id: string) => (await app.inject({ method: 'GET', url: `/v1/omega/events?commandId=${id}` })).json().events,
    });
    const firstClient = client(probeFirst);
    const secondClient = client(probeSecond);
    let restarted: typeof probeFirst | undefined;
    try {
      const evidence = await runCoordinationEvidenceProbe({
        commandId,
        first: firstClient,
        second: secondClient,
        restart: async () => {
          await probeFirst.close();
          await probeSecond.close();
          restarted = createApp(probePath, false);
          await restarted.ready();
          return client(restarted);
        },
      });
      assert.equal(evidence.verified, true);
      assert.equal(evidence.scope, 'multi-process-single-volume');
      assert.ok(['probe-worker-a', 'probe-worker-b'].includes(evidence.leaseWinner!));
      assert.equal(evidence.rejectedWorkers.length, 1);
      assert.notEqual(evidence.rejectedWorkers[0], evidence.leaseWinner);
      assert.deepEqual(evidence.limitations, [
        'does not prove cross-host durability',
        'does not prove distributed consensus, leader election, or replica agreement',
        'does not prove global ordering, deployment health, or external coordinator control',
      ]);
      assert.ok(evidence.eventTypes.includes('worker.lease-acquired'));
      assert.ok(evidence.eventTypes.includes('worker.lease-rejected'));
      assert.ok(evidence.eventTypes.includes('worker.lease-released'));
    } finally {
      if (restarted) await restarted.close();
      if (!restarted) {
        await probeFirst.close();
        await probeSecond.close();
      }
      rmSync(probeDirectory, { recursive: true, force: true });
    }
  });

  it('fails closed when a client returns an empty lease identifier', async () => {
    const calls: string[] = [];
    const client = {
      registerWorker: async (workerId: string) => { calls.push(`register:${workerId}`); },
      acquireLease: async (workerId: string) => { calls.push(`acquire:${workerId}`); return { leaseId: '' }; },
      releaseLease: async () => true,
      replayEvents: async () => [],
    };
    await assert.rejects(
      runCoordinationEvidenceProbe({ commandId: 'empty-lease', first: client, second: client, restart: async () => client }),
      /exactly one lease winner/,
    );
    assert.deepEqual(calls, [
      'register:probe-worker-a',
      'register:probe-worker-b',
      'acquire:probe-worker-a',
      'acquire:probe-worker-b',
    ]);
  });

  it('rejects an invalid command before registering probe workers', async () => {
    const calls: string[] = [];
    const client = {
      registerWorker: async () => { calls.push('register'); },
      acquireLease: async () => ({ leaseId: 'lease-1' }),
      releaseLease: async () => true,
      replayEvents: async () => [],
    };
    await assert.rejects(
      runCoordinationEvidenceProbe({ commandId: ' bad-command', first: client, second: client, restart: async () => client }),
      /commandId is invalid/,
    );
    assert.deepEqual(calls, []);
  });
});
