import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';

test('mood Codex endpoint returns a finite non-executing plan', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'omega-mood-codex-'));
  const app = createApp(join(dir, 'test.db'), false, { allowUnsignedCycle: true });
  await app.ready();
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/mood/codex',
      payload: {
        intent: 'improve the next bounded interaction',
        status: 'USER_STATED',
        uncertainty: 0,
        language: 'en-NG-pidgin',
        signals: [{ signal: 'keep the guidance calm', status: 'USER_STATED', source: 'conversation' }],
      },
    });
    const body = response.json();
    assert.equal(response.statusCode, 201);
    assert.equal(body.codex.decision, 'PROPOSE');
    assert.equal(body.codex.steps.length, 5);
    assert.equal(body.codex.authority, 'UNCHANGED');
    assert.equal(body.codex.execution, 'NOT_EXECUTED');
    assert.match(body.nextAction, /no repository mutation or execution/);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('mood Codex endpoint denies unsafe intent', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'omega-mood-codex-deny-'));
  const app = createApp(join(dir, 'test.db'), false, { allowUnsignedCycle: true });
  await app.ready();
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/mood/codex',
      payload: { intent: 'deploy to production now', status: 'USER_STATED', uncertainty: 0 },
    });
    assert.equal(response.statusCode, 201);
    assert.equal(response.json().codex.decision, 'DENY');
    assert.equal(response.json().codex.execution, 'NOT_EXECUTED');
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('mood Codex proposal enters the ledger as PROPOSED and never executes', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'omega-mood-codex-proposal-'));
  const app = createApp(join(dir, 'test.db'), false, { allowUnsignedCycle: true });
  await app.ready();
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/mood/codex/proposal',
      payload: {
        intent: 'improve the next bounded interaction',
        requestedBy: 'human:dashboard-operator',
        status: 'USER_STATED',
        uncertainty: 0,
        signals: [{ signal: 'keep the guidance calm', status: 'USER_STATED', source: 'conversation' }],
      },
    });
    const body = response.json();
    assert.equal(response.statusCode, 201);
    assert.equal(body.codex.decision, 'PROPOSE');
    assert.equal(body.command.status, 'PROPOSED');
    assert.equal(body.command.dryRun, true);
    assert.deepEqual(body.command.workers, ['planner']);
    assert.equal(body.executed, false);
    assert.match(body.nextAction, /review and explicitly admit/);

    const claimed = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${body.command.commandId}/admit`,
      payload: {
        authority: 'human:dashboard-operator',
        policy: 'mood-codex-boundary.v1',
        authorityVerified: true,
        policySatisfied: true,
      },
    });
    assert.equal(claimed.statusCode, 400);
    assert.equal(claimed.json().error, 'COMMAND_ADMISSION_EVIDENCE_NOT_ACCEPTED');
    assert.equal((await app.inject({ method: 'GET', url: `/v1/omega/commands/${body.command.commandId}` })).json().command.status, 'PROPOSED');

    const missingEvidence = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${body.command.commandId}/admit`,
      payload: { authority: 'human:dashboard-operator', policy: 'mood-codex-boundary.v1' },
    });
    assert.equal(missingEvidence.statusCode, 403);
    assert.equal(missingEvidence.json().error, 'COMMAND_ADMISSION_EVIDENCE_UNAVAILABLE');
    const stillPending = await app.inject({ method: 'GET', url: `/v1/omega/commands/${body.command.commandId}` });
    assert.equal(stillPending.json().command.status, 'PROPOSED');
    // The untrusted admission attempt must not create a denial or approval
    // record, nor silently change the stored command's admission decision.
    assert.deepEqual(stillPending.json().command.change, body.command.change);
    const provenance = await app.inject({
      method: 'GET',
      url: `/v1/omega/commands/${body.command.commandId}/provenance`,
    });
    assert.equal(provenance.statusCode, 200);
    assert.equal(
      provenance.json().provenance.events.some((event: { type: string }) =>
        event.type === 'command.admitted' || event.type === 'command.approved'),
      false,
    );

    const admitted = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${body.command.commandId}/approve`,
      payload: {
        operator: 'dashboard-operator',
        policy: 'mood-codex-boundary.v1',
      },
    });
    assert.equal(admitted.statusCode, 200);
    assert.equal(admitted.json().command.status, 'AUTHORIZED');
    assert.equal(admitted.json().command.result, undefined);
    assert.match(admitted.json().nextAction, /execute the authorized bounded action/);

    const executed = await app.inject({ method: 'POST', url: `/v1/omega/commands/${body.command.commandId}/execute`, payload: {} });
    assert.equal(executed.statusCode, 200);
    assert.equal(executed.json().command.status, 'EXECUTED');
    assert.equal(executed.json().command.result.reality, undefined);

    const observed = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${body.command.commandId}/observe`,
      payload: { observedState: 'bounded-local-action-complete' },
    });
    assert.equal(observed.statusCode, 200);
    assert.equal(observed.json().command.status, 'VERIFIED');
    assert.equal(observed.json().command.result.reality.classification, 'VERIFIED');
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('authenticated command approval requires a server-side operator allowlist', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'omega-approval-allowlist-'));
  const names = [
    'OMEGA_AUTH_MODE',
    'OMEGA_READ_TOKEN',
    'OMEGA_ADMIN_TOKEN',
    'OMEGA_ADMIN_OPERATOR_ALLOWLIST',
    'OMEGA_ADMIN_REQUIRE_ALLOWLIST',
    'OMEGA_PERSISTENCE',
    'NODE_ENV',
  ] as const;
  const previous = new Map(names.map((name) => [name, process.env[name]]));
  process.env.OMEGA_AUTH_MODE = 'required';
  process.env.OMEGA_READ_TOKEN = 'read-token-for-test';
  process.env.OMEGA_ADMIN_TOKEN = 'admin-token-for-test';
  process.env.OMEGA_ADMIN_OPERATOR_ALLOWLIST = 'trusted-operator';
  // Even an explicit "off" cannot disable the allowlist in authenticated mode.
  process.env.OMEGA_ADMIN_REQUIRE_ALLOWLIST = 'off';
  process.env.OMEGA_PERSISTENCE = 'off';
  process.env.NODE_ENV = 'test';
  const app = createApp(join(dir, 'test.db'), false, { allowUnsignedCycle: true });
  await app.ready();
  try {
    const proposal = await app.inject({
      method: 'POST',
      url: '/v1/mood/codex/proposal',
      headers: { authorization: 'Bearer admin-token-for-test' },
      payload: {
        intent: 'improve the next bounded interaction',
        requestedBy: 'human:dashboard-operator',
        status: 'USER_STATED',
        uncertainty: 0,
      },
    });
    assert.equal(proposal.statusCode, 201);
    const commandId = proposal.json().command.commandId;

    const spoofed = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${commandId}/approve`,
      headers: {
        authorization: 'Bearer admin-token-for-test',
        'x-omega-operator-id': 'attacker',
      },
      payload: { operator: 'trusted-operator', policy: 'human-review' },
    });
    assert.equal(spoofed.statusCode, 403);
    assert.equal(spoofed.json().error, 'ADMIN_OPERATOR_NOT_ALLOWED');

    const unchanged = await app.inject({
      method: 'GET',
      url: `/v1/omega/commands/${commandId}`,
      headers: { authorization: 'Bearer read-token-for-test' },
    });
    assert.equal(unchanged.statusCode, 200);
    assert.equal(unchanged.json().command.status, 'PROPOSED');
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
    for (const name of names) {
      const value = previous.get(name);
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
