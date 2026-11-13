import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../../dist/index.js';

const trustedEvidence = (_request, command) => ({
  commandId: command.commandId,
  authority: 'server:command-admission-test',
  policy: 'command-admission-test.v1',
  authorityVerified: true,
  policySatisfied: true,
});

async function createCommand(app, idempotencyKey, workers = ['planner']) {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/omega/commands',
    payload: {
      intent: 'test bounded command admission',
      requestedBy: 'admission-test',
      workers,
      idempotencyKey,
    },
  });
  assert.equal(response.statusCode, 201);
  return response.json().command;
}

test('command admission ignores client evidence and fails closed on missing, failed, or malformed resolvers', async () => {
  const noResolver = createApp(':memory:', false);
  const throwingResolver = createApp(':memory:', false, {
    omegaCommandAdmissionEvidence: () => {
      throw new Error('resolver unavailable');
    },
  });
  const malformedResolver = createApp(':memory:', false, {
    omegaCommandAdmissionEvidence: () => ({
      commandId: 'different-command',
      authority: 'server:test',
      policy: 'test.v1',
      authorityVerified: true,
      policySatisfied: true,
    }),
  });

  try {
    const apps = [noResolver, throwingResolver, malformedResolver];
    for (const [index, app] of apps.entries()) {
      const command = await createCommand(app, `fail-closed-${index}`);
      const response = await app.inject({
        method: 'POST',
        url: `/v1/omega/commands/${command.commandId}/admit`,
        payload: {
          authority: 'client:claim',
          policy: 'client-policy',
          authorityVerified: true,
          policySatisfied: true,
        },
      });
      assert.equal(response.statusCode, 400);
      assert.equal(response.json().error, 'COMMAND_ADMISSION_EVIDENCE_NOT_ACCEPTED');

      const retry = await app.inject({
        method: 'POST',
        url: `/v1/omega/commands/${command.commandId}/admit`,
        payload: {},
      });
      assert.equal(retry.statusCode, index === 0 ? 403 : 503);
      const unchanged = await app.inject({
        method: 'GET',
        url: `/v1/omega/commands/${command.commandId}`,
      });
      assert.equal(unchanged.json().command.status, command.status);
      assert.equal(unchanged.json().command.change.authority, null);
    }
  } finally {
    await Promise.all([noResolver.close(), throwingResolver.close(), malformedResolver.close()]);
  }
});

test('trusted admission authorizes a low-risk command but leaves review-required workers in REVIEW', async () => {
  const app = createApp(':memory:', false, {
    omegaCommandAdmissionEvidence: trustedEvidence,
  });
  try {
    const lowRisk = await createCommand(app, 'low-risk-admit');
    const admitted = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${lowRisk.commandId}/admit`,
      payload: {},
    });
    assert.equal(admitted.statusCode, 200);
    assert.equal(admitted.json().admission, 'ALLOW');
    assert.equal(admitted.json().command.status, 'AUTHORIZED');

    const highRisk = await createCommand(app, 'high-risk-review', ['tester']);
    const reviewed = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${highRisk.commandId}/admit`,
      payload: {},
    });
    assert.equal(reviewed.statusCode, 200);
    assert.equal(reviewed.json().admission, 'ALLOW');
    assert.equal(reviewed.json().command.status, 'REVIEW');
    assert.equal(reviewed.json().command.change.authorized, false);

    const execution = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${highRisk.commandId}/execute`,
      payload: {},
    });
    assert.equal(execution.statusCode, 409);
    assert.equal(execution.json().error, 'OMEGA_EXECUTION_REQUIRES_AUTHORIZATION');
  } finally {
    await app.close();
  }
});
