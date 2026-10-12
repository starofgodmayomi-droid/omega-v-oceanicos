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
    assert.equal(replay.json().executed, false);
    assert.match(replay.json().nextAction, /execution remains a separate bounded transition/);

    const conflict = await app.inject({
      method: 'POST',
      url: '/v1/omega/oreade/proposal',
      payload: {
        symbolicIntent: 'prepare a different bounded community reflection plan',
        requestedBy: 'operator:test',
        targetScope: ['oracle:reflection'],
        idempotencyKey: 'proposal-integration-001',
        stopCondition: 'stop after one proposal is stored',
        expectedObservation: 'one PROPOSED command is persisted',
      },
    });
    assert.equal(conflict.statusCode, 409);
    assert.equal(conflict.json().error, 'OMEGA_IDEMPOTENCY_CONFLICT');
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('ƆREADE telemetry returns privacy-bounded aggregates without appending records', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'omega-oreade-telemetry-'));
  const app = createApp(join(dir, 'test.db'), false, { allowUnsignedCycle: true });
  await app.ready();

  try {
    const buildProposal = await app.inject({
      method: 'POST',
      url: '/v1/omega/oreade/proposal',
      payload: {
        symbolicIntent: 'telemetry-private-intent-alpha',
        requestedBy: 'person:telemetry-private-alpha',
        targetScope: ['oracle:reflection'],
        idempotencyKey: 'telemetry-proposal-build-001',
        stopCondition: 'stop after one stored proposal',
        expectedObservation: 'one PROPOSED record exists',
        mode: 'BUILD',
      },
    });
    const worldviewProposal = await app.inject({
      method: 'POST',
      url: '/v1/omega/oreade/proposal',
      payload: {
        symbolicIntent: 'telemetry-private-intent-worldview',
        requestedBy: 'person:telemetry-private-worldview',
        targetScope: ['reflection:only'],
        idempotencyKey: 'telemetry-proposal-worldview-001',
        stopCondition: 'stop after one stored proposal',
        expectedObservation: 'one PROPOSED record exists',
        mode: 'WORLDVIEW',
      },
    });
    const translatedDrop = await app.inject({
      method: 'POST',
      url: '/v1/omega/oreade/drop',
      payload: {
        symbolicIntent: 'telemetry-private-unpersisted-drop',
        requestedBy: 'person:telemetry-private-drop',
        targetScope: ['reflection:only'],
        idempotencyKey: 'telemetry-drop-only-001',
        stopCondition: 'stop after translation',
        expectedObservation: 'a read-only Drop is returned',
      },
    });
    assert.equal(buildProposal.statusCode, 201);
    assert.equal(worldviewProposal.statusCode, 201);
    assert.equal(translatedDrop.statusCode, 201);

    const eventsBefore = (await app.inject({ method: 'GET', url: '/v1/omega/events' })).json().events;
    const response = await app.inject({ method: 'GET', url: '/v1/omega/oreade/telemetry' });
    const body = response.json();
    assert.equal(response.statusCode, 200);
    assert.equal(body.success, true);
    assert.equal(body.readOnly, true);
    assert.equal(body.telemetry.markedProposalCount, 2);
    assert.equal(body.telemetry.byStatus.PROPOSED, 2);
    assert.deepEqual(body.telemetry.byMode, { BUILD: 1, WORLDVIEW: 1 });
    assert.deepEqual(body.telemetry.privacy, {
      aggregateOnly: true,
      includesIntent: false,
      includesRequesterIdentity: false,
      includesCommandIdentifiers: false,
      writesAdditionalRecords: false,
    });
    assert.match(body.telemetry.observedAt, /^\d{4}-\d{2}-\d{2}T/);
    const serialized = JSON.stringify(body);
    for (const privateValue of [
      'telemetry-private-intent-alpha',
      'person:telemetry-private-alpha',
      buildProposal.json().command.commandId,
      'telemetry-private-unpersisted-drop',
    ]) assert.equal(serialized.includes(privateValue), false);

    for (let requestNumber = 1; requestNumber < 30; requestNumber += 1) {
      const repeated = await app.inject({ method: 'GET', url: '/v1/omega/oreade/telemetry' });
      assert.equal(repeated.statusCode, 200);
    }
    const rateLimited = await app.inject({ method: 'GET', url: '/v1/omega/oreade/telemetry' });
    assert.equal(rateLimited.statusCode, 429);

    const eventsAfter = (await app.inject({ method: 'GET', url: '/v1/omega/events' })).json().events;
    assert.deepEqual(eventsAfter, eventsBefore);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
