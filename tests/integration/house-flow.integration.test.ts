import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';

test('ΔVRØ House exposes the pluralistic flow contract and explicit capability boundaries', async () => {
  const app = createApp(':memory:', false);
  try {
    await app.ready();
    const response = await app.inject({ method: 'GET', url: '/v1/house/flow/status' });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.house, 'ΔVRØ HOUSE');
    assert.equal(body.memory.status, 'VERIFIED');
    assert.equal(body.memory.height, 0);
    assert.match(body.equation, /FIXPOINT\(RECONCILE/);
    assert.equal(body.scheduling.model, 'dependency-aware DAG');
    assert.ok(body.capabilities.some((item: { id: string; status: string }) =>
      item.id === 'browser-automation' && item.status === 'UNCONFIGURED'));
    assert.ok(body.capabilities.some((item: { id: string; status: string }) =>
      item.id === 'external-mutation' && item.status === 'REVIEW_REQUIRED'));
  } finally {
    await app.close();
  }
});

test('House flow rejects non-object task inputs', async () => {
  const app = createApp(':memory:', false);
  try {
    await app.ready();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/house/flow/run',
      payload: {
        tasks: [{ id: 'bad-input', organ: 'SOUL', action: 'OBSERVE_RUNTIME', input: 'not-an-object' }],
      },
    });
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error, 'TASK_INPUT_OBJECT_REQUIRED_bad-input');
  } finally {
    await app.close();
  }
});

test('House flow executes independent lanes in parallel and respects dependencies', async () => {
  const app = createApp(':memory:', false);
  const value = 'ΔVRØ HOUSE';
  const expectedSha256 = createHash('sha256').update(value, 'utf8').digest('hex');
  try {
    await app.ready();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/house/flow/run',
      payload: {
        maxConcurrency: 3,
        tasks: [
          { id: 'observe', organ: 'SOUL', action: 'OBSERVE_RUNTIME' },
          { id: 'verify', organ: 'OMEGA_V', action: 'VERIFY_SHA256', dependsOn: ['observe'], input: { value, expectedSha256 } },
          { id: 'reconcile', organ: 'MIRRIO', action: 'RECONCILE', dependsOn: ['verify'], input: { expected: 'VERIFY(ΔREALITY)', observed: 'VERIFY(ΔREALITY)' } },
          { id: 'value', organ: 'DAV', action: 'VALUE_SCORE', input: { benefit: 0.8, risk: 0.1, cost: 0.1 } },
        ],
      },
    });
    assert.equal(response.statusCode, 200);
    const flow = response.json().flow;
    assert.equal(flow.state, 'SUCCEEDED');
    assert.equal(flow.succeeded, 4);
    assert.match(flow.results.verify.digest, /^[a-f0-9]{64}$/);
    assert.equal(flow.results.verify.value.status, 'VERIFIED');
    assert.equal(flow.results.reconcile.value.status, 'VERIFIED');
    const verifyStarted = flow.events.findIndex((event: { taskId: string; status: string }) => event.taskId === 'verify' && event.status === 'RUNNING');
    const observeSucceeded = flow.events.findIndex((event: { taskId: string; status: string }) => event.taskId === 'observe' && event.status === 'SUCCEEDED');
    assert.ok(observeSucceeded >= 0 && verifyStarted > observeSucceeded);
  } finally {
    await app.close();
  }
});

test('House flow verifies actual organ outputs, reconciles them, and remembers a verified receipt', async () => {
  const app = createApp(':memory:', false);
  const organTaskIds = ['soul-observation', 'mirrio-observation'];
  try {
    await app.ready();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/house/flow/run',
      payload: {
        maxConcurrency: 2,
        tasks: [
          { id: organTaskIds[0], organ: 'SOUL', action: 'OBSERVE_ORGAN' },
          { id: organTaskIds[1], organ: 'MIRRIO', action: 'OBSERVE_ORGAN' },
          {
            id: 'verify-observations',
            organ: 'OMEGA_V',
            action: 'VERIFY_OBSERVATIONS',
            dependsOn: organTaskIds,
            input: { expectedTaskIds: organTaskIds },
          },
          {
            id: 'reconcile-observations',
            organ: 'MIRRIO',
            action: 'RECONCILE_OBSERVATIONS',
            dependsOn: [...organTaskIds, 'verify-observations'],
            input: { expectedTaskIds: organTaskIds, verificationTaskId: 'verify-observations' },
          },
        ],
      },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.flow.state, 'SUCCEEDED');
    assert.equal(body.flow.results['verify-observations'].value.status, 'VERIFIED');
    assert.equal(body.flow.results['reconcile-observations'].value.status, 'VERIFIED');
    assert.equal(body.memory.status, 'RECORDED_CHAIN_VERIFIED');
    assert.match(body.memory.blockHash, /^[a-f0-9]{64}$/);
    assert.equal(body.memory.integrity.valid, true);
    assert.equal(body.memory.integrity.height, 1);
    const statusAfter = await app.inject({ method: 'GET', url: '/v1/house/flow/status' });
    assert.equal(statusAfter.statusCode, 200);
    assert.equal(statusAfter.json().memory.height, 1);
    assert.equal(statusAfter.json().memory.tipHouseReceipt.runId, body.flow.runId);
    assert.equal(statusAfter.json().memory.tipHouseReceipt.state, 'SUCCEEDED');
  } finally {
    await app.close();
  }
});

test('House flow separates admin admission from read-only organ credentials in required-auth mode', async () => {
  const previous = {
    authMode: process.env.OMEGA_AUTH_MODE,
    readToken: process.env.OMEGA_READ_TOKEN,
    adminToken: process.env.OMEGA_ADMIN_TOKEN,
  };
  process.env.OMEGA_AUTH_MODE = 'required';
  process.env.OMEGA_READ_TOKEN = 'house-test-read-token';
  process.env.OMEGA_ADMIN_TOKEN = 'house-test-admin-token';
  const app = createApp(':memory:', false);
  try {
    await app.ready();
    const denied = await app.inject({ method: 'GET', url: '/v1/house/flow/status' });
    assert.equal(denied.statusCode, 401);

    const status = await app.inject({
      method: 'GET',
      url: '/v1/house/flow/status',
      headers: { authorization: 'Bearer house-test-read-token' },
    });
    assert.equal(status.statusCode, 200);

    const run = await app.inject({
      method: 'POST',
      url: '/v1/house/flow/run',
      headers: {
        authorization: 'Bearer house-test-admin-token',
        'x-omega-read-token': 'house-test-read-token',
      },
      payload: {
        tasks: [{ id: 'protected-soul', organ: 'SOUL', action: 'OBSERVE_ORGAN' }],
      },
    });
    assert.equal(run.statusCode, 200);
    assert.equal(run.json().flow.state, 'SUCCEEDED');
    assert.equal(run.json().flow.results['protected-soul'].value.status, 'OBSERVED');
    assert.equal(run.json().memory.status, 'RECORDED_CHAIN_VERIFIED');
  } finally {
    await app.close();
    if (previous.authMode === undefined) delete process.env.OMEGA_AUTH_MODE; else process.env.OMEGA_AUTH_MODE = previous.authMode;
    if (previous.readToken === undefined) delete process.env.OMEGA_READ_TOKEN; else process.env.OMEGA_READ_TOKEN = previous.readToken;
    if (previous.adminToken === undefined) delete process.env.OMEGA_ADMIN_TOKEN; else process.env.OMEGA_ADMIN_TOKEN = previous.adminToken;
  }
});

test('House flow blocks dependent work and never executes external mutation without approval', async () => {
  const app = createApp(':memory:', false);
  try {
    await app.ready();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/house/flow/run',
      payload: {
        tasks: [
          { id: 'publish', organ: 'HOUSE', action: 'EXTERNAL_MUTATION' },
          { id: 'after-publish', organ: 'KAI', action: 'OBSERVE_RUNTIME', dependsOn: ['publish'] },
        ],
      },
    });
    assert.equal(response.statusCode, 200);
    const flow = response.json().flow;
    assert.equal(flow.state, 'REVIEW_REQUIRED');
    assert.equal(flow.tasks[0].status, 'REVIEW_REQUIRED');
    assert.equal(flow.tasks[1].status, 'BLOCKED');
    assert.equal(flow.started, 0);
    assert.equal(response.json().memory.status, 'RECORDED_CHAIN_VERIFIED');
  } finally {
    await app.close();
  }
});

test('House flow observes every registered repo organ through fixed read-only API adapters', async () => {
  const app = createApp(':memory:', false);
  const organs = [
    ['SOUL', '/v1/ecosystem/status'],
    ['KAI', '/v1/omega/events'],
    ['MIRRIO', '/v1/reality/status'],
    ['LUCID', '/v1/kernel/capabilities'],
    ['TRUTH_WEAVER', '/v1/omega/divergences'],
    ['TRUTHOS', '/v1/omega/divergences'],
    ['ECHOFRAME', '/v1/ecosystem/body'],
    ['OCEANICOS', '/v1/ecosystem/status'],
    ['OMEGA_V', '/v1/omega/workers'],
    ['DAV', '/v1/value-navigator/proposals'],
    ['HOUSE', '/v1/house/flow/status'],
  ] as const;
  try {
    await app.ready();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/house/flow/run',
      payload: {
        maxConcurrency: 4,
        tasks: organs.map(([organ]) => ({
          id: `observe-${organ.toLowerCase()}`,
          organ,
          action: 'OBSERVE_ORGAN',
        })),
      },
    });
    assert.equal(response.statusCode, 200);
    const flow = response.json().flow;
    assert.equal(flow.state, 'SUCCEEDED');
    assert.equal(flow.succeeded, organs.length);
    for (const [organ, path] of organs) {
      const observation = flow.results[`observe-${organ.toLowerCase()}`].value;
      assert.equal(observation.status, 'OBSERVED', organ);
      assert.equal(observation.route, path, organ);
      assert.equal(observation.statusCode, 200, organ);
    }
  } finally {
    await app.close();
  }
});

test('House flow serializes lanes that share a conflict key', async () => {
  const app = createApp(':memory:', false);
  try {
    await app.ready();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/house/flow/run',
      payload: {
        maxConcurrency: 4,
        tasks: [
          { id: 'shared-one', organ: 'SOUL', action: 'OBSERVE_RUNTIME', conflictKey: 'shared-resource' },
          { id: 'shared-two', organ: 'KAI', action: 'OBSERVE_RUNTIME', conflictKey: 'shared-resource' },
        ],
      },
    });
    assert.equal(response.statusCode, 200);
    const events = response.json().flow.events;
    const firstSucceeded = events.findIndex((event: { taskId: string; status: string }) => event.taskId === 'shared-one' && event.status === 'SUCCEEDED');
    const secondStarted = events.findIndex((event: { taskId: string; status: string }) => event.taskId === 'shared-two' && event.status === 'RUNNING');
    assert.ok(firstSucceeded >= 0 && secondStarted > firstSucceeded);
  } finally {
    await app.close();
  }
});

test('House flow safely handles prototype-named task identifiers', async () => {
  const app = createApp(':memory:', false);
  const identifiers = ['constructor', 'toString', 'valueOf', 'hasOwnProperty'];
  try {
    await app.ready();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/house/flow/run',
      payload: {
        maxConcurrency: 4,
        tasks: identifiers.map((id) => ({ id, organ: 'SOUL', action: 'OBSERVE_RUNTIME' })),
      },
    });
    assert.equal(response.statusCode, 200);
    const flow = response.json().flow;
    assert.equal(flow.state, 'SUCCEEDED');
    assert.equal(flow.succeeded, identifiers.length);
    for (const id of identifiers) {
      assert.equal(flow.results[id].value.status, 'OBSERVED', id);
      assert.equal(flow.tasks.find((task: { id: string }) => task.id === id).status, 'SUCCEEDED');
    }
  } finally {
    await app.close();
  }
});

test('House flow rejects dependency cycles and unregistered organs', async () => {
  const app = createApp(':memory:', false);
  try {
    await app.ready();
    const cycle = await app.inject({
      method: 'POST',
      url: '/v1/house/flow/run',
      payload: {
        tasks: [
          { id: 'a', organ: 'SOUL', action: 'OBSERVE_RUNTIME', dependsOn: ['b'] },
          { id: 'b', organ: 'KAI', action: 'OBSERVE_RUNTIME', dependsOn: ['a'] },
        ],
      },
    });
    assert.equal(cycle.statusCode, 400);
    assert.match(cycle.json().error, /dependency cycle/);

    const unknown = await app.inject({
      method: 'POST',
      url: '/v1/house/flow/run',
      payload: { tasks: [{ id: 'a', organ: 'ALIEN', action: 'OBSERVE_RUNTIME' }] },
    });
    assert.equal(unknown.statusCode, 400);
    assert.match(unknown.json().error, /UNKNOWN_HOUSE_ORGAN/);
  } finally {
    await app.close();
  }
});
