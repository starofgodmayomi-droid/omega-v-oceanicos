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

test('API persists a planner-only proposal without authorizing or executing it', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'omega-oreade-proposal-'));
  const app = createApp(join(dir, 'test.db'), false, { allowUnsignedCycle: true });
  await app.ready();

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/omega/oreade/proposal',
      payload: {
        symbolicIntent: 'prepare a bounded community reflection plan',
        requestedBy: 'operator:test',
        targetScope: ['oracle:reflection'],
        idempotencyKey: 'proposal-integration-001',
        stopCondition: 'stop after one proposal is stored',
        expectedObservation: 'one PROPOSED command is persisted',
      },
    });
    const body = response.json();

    assert.equal(response.statusCode, 201);
    assert.equal(body.success, true);
    assert.equal(body.command.status, 'PROPOSED');
    assert.deepEqual(body.command.workers, ['planner']);
    assert.equal(body.command.dryRun, true);
    assert.equal(body.command.change.authority, null);
    assert.equal(body.executed, false);
    assert.match(body.nextAction, /review and explicitly admit/);

    const admitted = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${body.command.commandId}/admit`,
      payload: {
        authority: 'human:dashboard-operator',
        policy: 'oreade-symbolic-boundary.v1',
        authorityVerified: true,
        policySatisfied: true,
      },
    });
    assert.equal(admitted.statusCode, 200);
    assert.equal(admitted.json().command.status, 'AUTHORIZED');
    assert.equal(admitted.json().command.result, undefined);
    assert.match(admitted.json().nextAction, /execute the authorized bounded action/);

    const detail = await app.inject({ method: 'GET', url: `/v1/omega/commands/${body.command.commandId}` });
    assert.equal(detail.statusCode, 200);
    assert.equal(detail.json().command.status, 'AUTHORIZED');

    const replay = await app.inject({
      method: 'POST',
      url: '/v1/omega/oreade/proposal',
      payload: {
        symbolicIntent: 'prepare a bounded community reflection plan',
        requestedBy: 'operator:test',
        targetScope: ['oracle:reflection'],
        idempotencyKey: 'proposal-integration-001',
        stopCondition: 'stop after one proposal is stored',
        expectedObservation: 'one PROPOSED command is persisted',
      },
    });
    assert.equal(replay.statusCode, 200);
    assert.equal(replay.json().command.commandId, body.command.commandId);
    assert.equal(replay.json().command.status, 'AUTHORIZED');
    assert.equal(replay.json().drop.dropId, body.drop.dropId);
    assert.equal(replay.json().drop.createdAt, body.drop.createdAt);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('API rejects reuse of a proposal idempotency key for a different request without changing the original', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'omega-oreade-idempotency-conflict-'));
  const app = createApp(join(dir, 'test.db'), false, { allowUnsignedCycle: true });
  await app.ready();

  try {
    const original = await app.inject({
      method: 'POST',
      url: '/v1/omega/oreade/proposal',
      payload: {
        symbolicIntent: 'prepare the first bounded community reflection plan',
        requestedBy: 'operator:test',
        targetScope: ['oracle:reflection'],
        idempotencyKey: 'proposal-conflict-integration-001',
        stopCondition: 'stop after one proposal is stored',
        expectedObservation: 'one PROPOSED command is persisted',
      },
    });
    const originalBody = original.json();
    assert.equal(original.statusCode, 201);

    const conflict = await app.inject({
      method: 'POST',
      url: '/v1/omega/oreade/proposal',
      payload: {
        symbolicIntent: 'prepare a different bounded reflection plan',
        requestedBy: 'operator:test',
        targetScope: ['oracle:reflection'],
        idempotencyKey: 'proposal-conflict-integration-001',
        stopCondition: 'stop after one proposal is stored',
        expectedObservation: 'one PROPOSED command is persisted',
      },
    });
    assert.equal(conflict.statusCode, 409);
    assert.equal(conflict.json().error, 'OMEGA_IDEMPOTENCY_CONFLICT');

    const detail = await app.inject({ method: 'GET', url: `/v1/omega/commands/${originalBody.command.commandId}` });
    assert.equal(detail.statusCode, 200);
    assert.equal(detail.json().command.intent, 'prepare the first bounded community reflection plan');
    assert.equal(detail.json().command.status, 'PROPOSED');
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('generic command API rejects conflicting idempotency-key reuse', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'omega-command-idempotency-conflict-'));
  const app = createApp(join(dir, 'test.db'), false, { allowUnsignedCycle: true });
  await app.ready();

  try {
    const original = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: {
        intent: 'inspect the bounded runtime',
        requestedBy: 'operator:test',
        workers: ['planner'],
        idempotencyKey: 'generic-conflict-integration-001',
        context: { target: 'runtime' },
      },
    });
    assert.equal(original.statusCode, 201);

    const originalBody = original.json();
    const replay = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: {
        intent: 'inspect the bounded runtime',
        requestedBy: 'operator:test',
        workers: ['planner'],
        idempotencyKey: 'generic-conflict-integration-001',
        context: { target: 'runtime' },
      },
    });
    assert.equal(replay.statusCode, 200);
    assert.equal(replay.json().command.commandId, originalBody.command.commandId);

    const conflict = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: {
        intent: 'inspect a different bounded runtime',
        requestedBy: 'operator:test',
        workers: ['planner'],
        idempotencyKey: 'generic-conflict-integration-001',
        context: { target: 'runtime' },
      },
    });
    assert.equal(conflict.statusCode, 409);
    assert.equal(conflict.json().error, 'OMEGA_IDEMPOTENCY_CONFLICT');
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('separate API instances converge on one durable OREAD command for an idempotency key', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'omega-oreade-idempotency-multi-instance-'));
  const dbPath = join(dir, 'test.db');
  const firstApp = createApp(dbPath, false, { allowUnsignedCycle: true });
  const secondApp = createApp(dbPath, false, { allowUnsignedCycle: true });
  await Promise.all([firstApp.ready(), secondApp.ready()]);

  try {
    const payload = {
      symbolicIntent: 'prepare one bounded multi-instance reflection',
      requestedBy: 'operator:test',
      targetScope: ['oracle:reflection'],
      idempotencyKey: 'proposal-multi-instance-integration-001',
      stopCondition: 'stop after one proposal is stored',
      expectedObservation: 'one durable PROPOSED command is returned',
    };
    const [first, second] = await Promise.all([
      firstApp.inject({ method: 'POST', url: '/v1/omega/oreade/proposal', payload }),
      secondApp.inject({ method: 'POST', url: '/v1/omega/oreade/proposal', payload }),
    ]);
    assert.deepEqual([first.statusCode, second.statusCode].sort((left, right) => left - right), [200, 201]);
    assert.equal(first.json().command.commandId, second.json().command.commandId);

    const detail = await firstApp.inject({ method: 'GET', url: `/v1/omega/commands/${first.json().command.commandId}/provenance` });
    assert.equal(detail.statusCode, 200);
    assert.equal(detail.json().provenance.events.filter((event: { type: string }) => event.type === 'command.proposed').length, 1);
  } finally {
    await Promise.all([firstApp.close(), secondApp.close()]);
    rmSync(dir, { recursive: true, force: true });
  }
});
