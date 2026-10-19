import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../apps/api/dist/index.js';

describe('Ω∞v command API vertical slice', () => {
  const app = createApp(':memory:', false);
  const requiredReadToken = 'integration-read-token';
  const requiredAdminToken = 'integration-admin-token';
  let requiredAuthApp: ReturnType<typeof createApp>;
  before(async () => { await app.ready(); });
  before(async () => {
    const previousMode = process.env.OMEGA_AUTH_MODE;
    const previousReadToken = process.env.OMEGA_READ_TOKEN;
    const previousAdminToken = process.env.OMEGA_ADMIN_TOKEN;
    process.env.OMEGA_AUTH_MODE = 'required';
    process.env.OMEGA_READ_TOKEN = requiredReadToken;
    process.env.OMEGA_ADMIN_TOKEN = requiredAdminToken;
    try {
      requiredAuthApp = createApp(':memory:', false);
    } finally {
      if (previousMode === undefined) delete process.env.OMEGA_AUTH_MODE;
      else process.env.OMEGA_AUTH_MODE = previousMode;
      if (previousReadToken === undefined) delete process.env.OMEGA_READ_TOKEN;
      else process.env.OMEGA_READ_TOKEN = previousReadToken;
      if (previousAdminToken === undefined) delete process.env.OMEGA_ADMIN_TOKEN;
      else process.env.OMEGA_ADMIN_TOKEN = previousAdminToken;
    }
    await requiredAuthApp.ready();
  });
  after(async () => {
    await requiredAuthApp.close();
    await app.close();
  });

  it('creates a redacted proposal without executing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: { intent: 'run the bounded test plan', requestedBy: 'dashboard-user', workers: ['planner', 'tester'], idempotencyKey: 'api-slice-1', context: { stateBefore: 'S0' } },
    });
    assert.equal(response.statusCode, 201);
    const body = response.json();
    assert.equal(body.command.status, 'REVIEW');
    assert.equal(body.command.redacted, true);
    assert.equal(body.command.dryRun, true);
    assert.equal(body.command.change.authorized, false);
  });

  it('enforces read and admin bearer tokens at the Ω route boundary', async () => {
    const publicHealth = await requiredAuthApp.inject({ method: 'GET', url: '/health' });
    assert.equal(publicHealth.statusCode, 200);

    const deniedRead = await requiredAuthApp.inject({ method: 'GET', url: '/v1/omega/commands' });
    assert.equal(deniedRead.statusCode, 401);
    assert.equal(deniedRead.json().error, 'READ_ACCESS_REQUIRED');

    const allowedRead = await requiredAuthApp.inject({
      method: 'GET',
      url: '/v1/omega/commands',
      headers: { authorization: `Bearer ${requiredReadToken}` },
    });
    assert.equal(allowedRead.statusCode, 200);

    const deniedWrite = await requiredAuthApp.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: { intent: 'protected command', requestedBy: 'integration-user', workers: ['planner'], idempotencyKey: 'required-auth-1' },
    });
    assert.equal(deniedWrite.statusCode, 401);
    assert.equal(deniedWrite.json().error, 'ADMIN_ACCESS_REQUIRED');

    const readCannotWrite = await requiredAuthApp.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      headers: { authorization: `Bearer ${requiredReadToken}` },
      payload: { intent: 'protected command', requestedBy: 'integration-user', workers: ['planner'], idempotencyKey: 'required-auth-2' },
    });
    assert.equal(readCannotWrite.statusCode, 401);
    assert.equal(readCannotWrite.json().error, 'ADMIN_ACCESS_REQUIRED');

    const allowedWrite = await requiredAuthApp.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      headers: { authorization: `Bearer ${requiredAdminToken}` },
      payload: { intent: 'protected command', requestedBy: 'integration-user', workers: ['planner'], idempotencyKey: 'required-auth-3' },
    });
    assert.equal(allowedWrite.statusCode, 201);
  });

  it('requires explicit approval before executing a review-gated command', async () => {
    const denied = await app.inject({ method: 'POST', url: '/v1/omega/commands/omega-api-slice-1/execute' });
    assert.equal(denied.statusCode, 409);
    assert.equal(denied.json().error, 'OMEGA_EXECUTION_REQUIRES_AUTHORIZATION');

    const approved = await app.inject({ method: 'POST', url: '/v1/omega/commands/omega-api-slice-1/approve', payload: { operator: 'integration-operator' } });
    assert.equal(approved.statusCode, 200);
    assert.equal(approved.json().command.status, 'AUTHORIZED');
    assert.equal(approved.json().command.change.authority, 'human:integration-operator');
  });

  it('executes only after approval and distinguishes verified reality', async () => {
    const executed = await app.inject({ method: 'POST', url: '/v1/omega/commands/omega-api-slice-1/execute' });
    assert.equal(executed.statusCode, 200);
    assert.equal(executed.json().command.status, 'EXECUTED');
    assert.match(executed.json().execution.attestationId, /^attestation-[a-f0-9]{64}$/);

    const observed = await app.inject({ method: 'POST', url: '/v1/omega/commands/omega-api-slice-1/observe', payload: { observedState: 'bounded-local-action-complete' } });
    assert.equal(observed.statusCode, 200);
    assert.equal(observed.json().command.status, 'VERIFIED');
    assert.equal(observed.json().reality.classification, 'VERIFIED');

    const events = await app.inject({ method: 'GET', url: '/v1/omega/events?commandId=omega-api-slice-1' });
    assert.equal(events.statusCode, 200);
    assert.equal(events.json().redacted, true);
    assert.ok(events.json().events.some((event: { type: string }) => event.type === 'command.executed'));
  });

  it('binds execution to an admitted worker lease and releases the lease', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: { intent: 'lease-bound execution', requestedBy: 'integration-user', workers: ['planner', 'tester'], idempotencyKey: 'lease-execution-current-1' },
    });
    assert.equal(created.statusCode, 201);
    const approved = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands/omega-lease-execution-current-1/approve',
      payload: { operator: 'integration-operator' },
    });
    assert.equal(approved.statusCode, 200);
    assert.equal(approved.json().command.status, 'AUTHORIZED');

    const unregistered = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands/omega-lease-execution-current-1/lease-execute',
      payload: { workerId: 'planner', capability: 'EXECUTE' },
    });
    assert.equal(unregistered.statusCode, 409);
    assert.equal(unregistered.json().error, 'OMEGA_WORKER_LEASE_UNAVAILABLE');

    const registered = await app.inject({
      method: 'POST',
      url: '/v1/omega/workers/register',
      payload: { workerId: 'planner', capabilities: ['EXECUTE'] },
    });
    assert.equal(registered.statusCode, 200);

    const executed = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands/omega-lease-execution-current-1/lease-execute',
      payload: { workerId: 'planner', capability: 'EXECUTE' },
    });
    assert.equal(executed.statusCode, 200);
    assert.equal(executed.json().command.status, 'EXECUTED');
    assert.equal(executed.json().lease.workerId, 'planner');
    assert.equal(executed.json().lease.released, true);
  });

  it('rejects unknown workers and duplicate mutations are idempotent', async () => {
    const invalid = await app.inject({ method: 'POST', url: '/v1/omega/commands', payload: { intent: 'bad worker', requestedBy: 'dashboard-user', workers: ['arbitrary-shell'], idempotencyKey: 'api-slice-invalid' } });
    assert.equal(invalid.statusCode, 400);
    const duplicate = await app.inject({ method: 'POST', url: '/v1/omega/commands', payload: { intent: 'run the bounded test plan', requestedBy: 'dashboard-user', workers: ['planner', 'tester'], idempotencyKey: 'api-slice-1' } });
    assert.equal(duplicate.statusCode, 201);
    assert.equal(duplicate.json().command.commandId, 'omega-api-slice-1');
  });

  it('rate-limits repeated command-store reads', async () => {
    let response;
    for (let attempt = 0; attempt < 61; attempt += 1) {
      response = await app.inject({ method: 'GET', url: '/v1/omega/commands' });
    }
    assert.equal(response?.statusCode, 429);
    assert.equal(response?.headers['retry-after'], '60');
  });

  it('rejects client-asserted admission flags and fails closed without trusted resolver (#487, #486)', async () => {
    // 1. Create a fresh proposal in app (which has no omegaCommandAdmissionEvidence resolver)
    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: {
        intent: 'unadmitted test command',
        requestedBy: 'dashboard-user',
        workers: ['planner', 'tester'],
        idempotencyKey: 'unadmitted-slice-1',
      },
    });
    assert.equal(createRes.statusCode, 201);
    const cmdId = createRes.json().command.commandId;

    // 2. Attempt to admit with client-provided authorityVerified: true and policySatisfied: true
    const response = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${cmdId}/admit`,
      payload: {
        authority: 'client-asserted-admin',
        policy: 'client-asserted-policy',
        authorityVerified: true,
        policySatisfied: true,
      },
    });
    // Must fail closed with 503 unavailable because no server-side resolver was provided
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().error, 'OMEGA_ADMISSION_EVIDENCE_UNAVAILABLE');
  });

  it('admits commands using server-side resolver and enforces REVIEW protection', async () => {
    const resolverApp = createApp(':memory:', false, {
      omegaCommandAdmissionEvidence: (_request, command) => ({
        authority: 'server:security-gate',
        policy: 'policy:bounded-execution',
        authorityVerified: true,
        policySatisfied: true,
      }),
    });
    await resolverApp.ready();
    try {
      // 1. Create a command with workers that require review (e.g. tester)
      const createRes = await resolverApp.inject({
        method: 'POST',
        url: '/v1/omega/commands',
        payload: {
          intent: 'server-resolved admission test',
          requestedBy: 'resolver-user',
          workers: ['planner', 'tester'],
          idempotencyKey: 'resolver-test-1',
        },
      });
      assert.equal(createRes.statusCode, 201);
      const cmdId = createRes.json().command.commandId;
      assert.equal(createRes.json().command.status, 'REVIEW');

      // 2. Admit command with server-side resolver:
      // Even though resolver yields ALLOW, a command already in REVIEW cannot bypass explicit operator approval.
      const admitRes = await resolverApp.inject({
        method: 'POST',
        url: `/v1/omega/commands/${cmdId}/admit`,
        payload: {
          // Client assertions here must be completely ignored
          authority: 'spoofed-authority',
          authorityVerified: false,
          policySatisfied: false,
        },
      });
      assert.equal(admitRes.statusCode, 200);
      const admittedBody = admitRes.json();
      assert.equal(admittedBody.success, true);
      assert.equal(admittedBody.status, 'REVIEW');
      assert.equal(admittedBody.command.change.authority, 'server:security-gate');
      assert.equal(admittedBody.command.change.policy, 'policy:bounded-execution');

      // 3. Human approval is required to transition from REVIEW to AUTHORIZED
      const approveRes = await resolverApp.inject({
        method: 'POST',
        url: `/v1/omega/commands/${cmdId}/approve`,
        payload: { operator: 'security-officer' },
      });
      assert.equal(approveRes.statusCode, 200);
      assert.equal(approveRes.json().command.status, 'AUTHORIZED');
    } finally {
      await resolverApp.close();
    }
  });

  it('enforces operator allowlist when OMEGA_ADMIN_REQUIRE_ALLOWLIST is on', async () => {
    const prevAllowlist = process.env.OMEGA_ADMIN_OPERATOR_ALLOWLIST;
    const prevRequire = process.env.OMEGA_ADMIN_REQUIRE_ALLOWLIST;
    process.env.OMEGA_ADMIN_OPERATOR_ALLOWLIST = 'steward-alice,steward-bob';
    process.env.OMEGA_ADMIN_REQUIRE_ALLOWLIST = 'on';

    const authApp = createApp(':memory:', false);
    await authApp.ready();
    try {
      await authApp.inject({
        method: 'POST',
        url: '/v1/omega/commands',
        payload: {
          intent: 'operator authorization test',
          requestedBy: 'test-user',
          workers: ['planner', 'tester'],
          idempotencyKey: 'op-auth-test-1',
        },
      });

      // Attempt approval with unauthorized operator header
      const unauthorizedRes = await authApp.inject({
        method: 'POST',
        url: '/v1/omega/commands/omega-op-auth-test-1/approve',
        headers: { 'x-omega-operator-id': 'eve' },
        payload: { operator: 'eve' },
      });
      assert.equal(unauthorizedRes.statusCode, 403);
      assert.equal(unauthorizedRes.json().error, 'ADMIN_OPERATOR_NOT_ALLOWED');

      // Attempt approval with authorized operator header
      const authorizedRes = await authApp.inject({
        method: 'POST',
        url: '/v1/omega/commands/omega-op-auth-test-1/approve',
        headers: { 'x-omega-operator-id': 'steward-alice' },
        payload: { operator: 'steward-alice' },
      });
      assert.equal(authorizedRes.statusCode, 200);
      assert.equal(authorizedRes.json().command.status, 'AUTHORIZED');
    } finally {
      if (prevAllowlist === undefined) delete process.env.OMEGA_ADMIN_OPERATOR_ALLOWLIST;
      else process.env.OMEGA_ADMIN_OPERATOR_ALLOWLIST = prevAllowlist;
      if (prevRequire === undefined) delete process.env.OMEGA_ADMIN_REQUIRE_ALLOWLIST;
      else process.env.OMEGA_ADMIN_REQUIRE_ALLOWLIST = prevRequire;
      await authApp.close();
    }
  });
});
