import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';

const allowEvidence = {
  authorityVerified: true,
  policySatisfied: true,
  authority: 'server:admission-resolver',
  policy: 'command-admission.v1',
} as const;

async function propose(app: ReturnType<typeof createApp>, idempotencyKey: string, workers: string[]) {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/omega/commands',
    payload: {
      intent: 'record one bounded command admission',
      requestedBy: 'integration-test',
      workers,
      idempotencyKey,
      context: { stateBefore: 'S0' },
    },
  });
  assert.equal(response.statusCode, 201, response.body);
  return response.json().command.commandId as string;
}

test('command admission ignores client claims and fail-closes without a resolver', async () => {
  const app = createApp(':memory:', false, { allowUnsignedCycle: true });
  await app.ready();
  try {
    const commandId = await propose(app, 'admit-no-resolver', ['planner']);
    const forged = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${commandId}/admit`,
      payload: {
        authority: 'client:forged',
        policy: 'client-policy',
        authorityVerified: true,
        policySatisfied: true,
      },
    });
    assert.equal(forged.statusCode, 400);
    assert.equal(forged.json().error, 'COMMAND_ADMISSION_EVIDENCE_NOT_ACCEPTED');

    const missing = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${commandId}/admit`,
      payload: { authority: 'client:forged', policy: 'client-policy' },
    });
    assert.equal(missing.statusCode, 403);
    assert.equal(missing.json().error, 'COMMAND_ADMISSION_EVIDENCE_UNAVAILABLE');
    const stored = await app.inject({ method: 'GET', url: `/v1/omega/commands/${commandId}` });
    assert.equal(stored.json().command.status, 'PROPOSED');
    assert.equal(stored.json().command.change.authorized, false);
  } finally {
    await app.close();
  }
});

test('a failed or malformed command admission resolver does not mutate the command', async () => {
  const throwing = createApp(':memory:', false, {
    allowUnsignedCycle: true,
    commandAdmissionEvidence: () => {
      throw new Error('resolver unavailable');
    },
  });
  const malformed = createApp(':memory:', false, {
    allowUnsignedCycle: true,
    commandAdmissionEvidence: () => ({ authorityVerified: true }) as never,
  });
  const denying = createApp(':memory:', false, {
    allowUnsignedCycle: true,
    commandAdmissionEvidence: () => ({
      authorityVerified: false,
      policySatisfied: true,
      authority: 'server:admission-resolver',
      policy: 'command-admission.v1',
    }),
  });
  await throwing.ready();
  await malformed.ready();
  await denying.ready();
  try {
    for (const [app, key, error] of [
      [throwing, 'admit-throws', 'COMMAND_ADMISSION_EVIDENCE_UNAVAILABLE'],
      [malformed, 'admit-malformed', 'COMMAND_ADMISSION_EVIDENCE_UNAVAILABLE'],
      [denying, 'admit-denied', 'COMMAND_ADMISSION_DENIED'],
    ] as const) {
      const commandId = await propose(app, key, ['planner']);
      const response = await app.inject({
        method: 'POST',
        url: `/v1/omega/commands/${commandId}/admit`,
        payload: {},
      });
      assert.equal(response.statusCode, 403);
      assert.equal(response.json().error, error);
      const stored = await app.inject({ method: 'GET', url: `/v1/omega/commands/${commandId}` });
      assert.equal(stored.json().command.status, 'PROPOSED');
      assert.notEqual(stored.json().command.change.authority, 'server:admission-resolver');
    }
  } finally {
    await throwing.close();
    await malformed.close();
    await denying.close();
  }
});

test('trusted resolver evidence authorizes only a non-review command and ignores body strings', async () => {
  let calls = 0;
  const app = createApp(':memory:', false, {
    allowUnsignedCycle: true,
    commandAdmissionEvidence: () => {
      calls += 1;
      return allowEvidence;
    },
  });
  await app.ready();
  try {
    const commandId = await propose(app, 'admit-trusted-proposed', ['planner']);
    const forged = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${commandId}/admit`,
      payload: { authorityVerified: true, policySatisfied: true },
    });
    assert.equal(forged.statusCode, 400);
    assert.equal(calls, 0);

    const admitted = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${commandId}/admit`,
      payload: { authority: 'client:forged', policy: 'client-policy' },
    });
    assert.equal(admitted.statusCode, 200, admitted.body);
    assert.equal(calls, 1);
    assert.equal(admitted.json().command.status, 'AUTHORIZED');
    assert.equal(admitted.json().command.change.authorized, true);
    assert.equal(admitted.json().command.change.authority, 'server:admission-resolver');
    assert.equal(admitted.json().command.change.policy, 'command-admission.v1');
    assert.equal(admitted.json().command.result, undefined);
  } finally {
    await app.close();
  }
});

test('trusted resolver evidence preserves REVIEW until allowlisted operator approval', async () => {
  const previousAllowlist = process.env.OMEGA_ADMIN_OPERATOR_ALLOWLIST;
  const previousRequire = process.env.OMEGA_ADMIN_REQUIRE_ALLOWLIST;
  process.env.OMEGA_ADMIN_OPERATOR_ALLOWLIST = 'dashboard-operator';
  process.env.OMEGA_ADMIN_REQUIRE_ALLOWLIST = 'on';
  const app = createApp(':memory:', false, {
    allowUnsignedCycle: true,
    commandAdmissionEvidence: () => allowEvidence,
  });
  await app.ready();
  try {
    const commandId = await propose(app, 'admit-review-preserved', ['planner', 'tester']);
    const created = await app.inject({ method: 'GET', url: `/v1/omega/commands/${commandId}` });
    assert.equal(created.json().command.status, 'REVIEW');

    const admitted = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${commandId}/admit`,
      payload: { authority: 'client:forged', policy: 'client-policy' },
    });
    assert.equal(admitted.statusCode, 200, admitted.body);
    assert.equal(admitted.json().command.status, 'REVIEW');
    assert.equal(admitted.json().command.change.authorized, false);
    assert.equal(admitted.json().command.change.decision, 'REVIEW');
    assert.equal(admitted.json().command.change.authority, 'server:admission-resolver');
    assert.match(admitted.json().nextAction, /did not authorize/);

    const provenance = await app.inject({ method: 'GET', url: `/v1/omega/commands/${commandId}/provenance` });
    const events = provenance.json().provenance.events as Array<{ type?: string }>;
    assert.equal(events.some((event) => event.type === 'command.admission-review-preserved'), true);
    assert.equal(events.some((event) => event.type === 'command.admitted'), false);

    const spoofed = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${commandId}/approve`,
      payload: { operator: 'dashboard-operator', policy: 'human-review' },
    });
    assert.equal(spoofed.statusCode, 403);
    assert.equal(spoofed.json().error, 'ADMIN_OPERATOR_NOT_ALLOWED');
    const stillReview = await app.inject({ method: 'GET', url: `/v1/omega/commands/${commandId}` });
    assert.equal(stillReview.json().command.status, 'REVIEW');

    const approved = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${commandId}/approve`,
      headers: { 'x-omega-operator-id': 'dashboard-operator' },
      payload: { operator: 'body-spoofed-operator', policy: 'human-review' },
    });
    assert.equal(approved.statusCode, 200, approved.body);
    assert.equal(approved.json().command.status, 'AUTHORIZED');
    assert.equal(approved.json().command.change.authority, 'human:dashboard-operator');
    assert.equal(approved.json().command.change.authorized, true);
  } finally {
    if (previousAllowlist === undefined) delete process.env.OMEGA_ADMIN_OPERATOR_ALLOWLIST;
    else process.env.OMEGA_ADMIN_OPERATOR_ALLOWLIST = previousAllowlist;
    if (previousRequire === undefined) delete process.env.OMEGA_ADMIN_REQUIRE_ALLOWLIST;
    else process.env.OMEGA_ADMIN_REQUIRE_ALLOWLIST = previousRequire;
    await app.close();
  }
});
