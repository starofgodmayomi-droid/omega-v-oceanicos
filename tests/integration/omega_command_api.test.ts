import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../apps/api/dist/index.js';

describe('Ω∞v command API vertical slice', () => {
  const app = createApp(':memory:', false);
  const requiredReadToken = 'integration-read-token';
  const requiredAdminToken = 'integration-admin-token';
  const bearerHeader = (token: string) => ({ authorization: ['Bearer', token].join(' ') });
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
    const commandId = allowedWrite.json().command.commandId;
    const forgedAdmission = {
      authority: 'human:claimed-operator',
      authorityVerified: true,
      policy: 'runtime-evidence-bound:v1',
      policySatisfied: true,
    };
    const anonymousAdmission = await requiredAuthApp.inject({
      method: 'POST',
      url: `/v1/omega/commands/${commandId}/admit`,
      payload: forgedAdmission,
    });
    assert.equal(anonymousAdmission.statusCode, 401);
    assert.equal(anonymousAdmission.json().error, 'ADMIN_ACCESS_REQUIRED');

    const readTokenAdmission = await requiredAuthApp.inject({
      method: 'POST',
      url: `/v1/omega/commands/${commandId}/admit`,
      headers: bearerHeader(requiredReadToken),
      payload: forgedAdmission,
    });
    assert.equal(readTokenAdmission.statusCode, 401);
    assert.equal(readTokenAdmission.json().error, 'ADMIN_ACCESS_REQUIRED');

    const admitted = await requiredAuthApp.inject({
      method: 'POST',
      url: `/v1/omega/commands/${commandId}/admit`,
      headers: bearerHeader(requiredAdminToken),
      payload: { ...forgedAdmission, authorityVerified: false, policySatisfied: false },
    });
    assert.equal(admitted.statusCode, 200);
    assert.equal(admitted.json().command.status, 'AUTHORIZED');
    assert.equal(admitted.json().command.change.authority, 'admin-bearer');
    const admissionEvents = await requiredAuthApp.inject({
      method: 'GET',
      url: `/v1/omega/events?commandId=${commandId}`,
      headers: bearerHeader(requiredReadToken),
    });
    assert.equal(admissionEvents.statusCode, 200);
    assert.ok(admissionEvents.json().events.some((event: { type: string; principal?: string }) =>
      event.type === 'command.admitted' && event.principal === 'admin-bearer'));

    const unsupportedPolicyCommand = await requiredAuthApp.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      headers: bearerHeader(requiredAdminToken),
      payload: {
        intent: 'policy boundary check',
        requestedBy: 'integration-user',
        workers: ['planner'],
        idempotencyKey: 'required-auth-4',
      },
    });
    assert.equal(unsupportedPolicyCommand.statusCode, 201);
    const unsupportedPolicyAdmission = await requiredAuthApp.inject({
      method: 'POST',
      url: `/v1/omega/commands/${unsupportedPolicyCommand.json().command.commandId}/admit`,
      headers: bearerHeader(requiredAdminToken),
      payload: {
        authority: 'human:claimed-operator',
        authorityVerified: true,
        policy: 'caller-invented-policy',
        policySatisfied: true,
      },
    });
    assert.equal(unsupportedPolicyAdmission.statusCode, 200);
    assert.equal(unsupportedPolicyAdmission.json().command.status, 'DENIED');
    assert.equal(unsupportedPolicyAdmission.json().command.change.authority, 'admin-bearer');
  });

  it('requires explicit approval before executing a review-gated command', async () => {
    const denied = await app.inject({ method: 'POST', url: '/v1/omega/commands/omega-api-slice-1/execute' });
    assert.equal(denied.statusCode, 409);
    assert.equal(denied.json().error, 'OMEGA_EXECUTION_REQUIRES_AUTHORIZATION');

    const missingOperator = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands/omega-api-slice-1/approve',
      payload: { policy: 'human-review' },
    });
    assert.equal(missingOperator.statusCode, 400);
    assert.equal(missingOperator.json().error, 'OMEGA_OPERATOR_REQUIRED');

    const approved = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands/omega-api-slice-1/approve',
      payload: {
        authority: 'human:forged-operator',
        authorityVerified: true,
        operator: 'integration-operator',
        policy: 'human-review',
        policySatisfied: true,
      },
    });
    assert.equal(approved.statusCode, 200);
    assert.equal(approved.json().command.status, 'AUTHORIZED');
    assert.equal(approved.json().command.change.authority, 'local-development');
    const approvalEvents = await app.inject({
      method: 'GET',
      url: '/v1/omega/events?commandId=omega-api-slice-1',
    });
    const approvalEvent = approvalEvents.json().events.find((event: { type: string }) => event.type === 'command.approved');
    assert.equal(approvalEvent.principal, 'local-development');
    assert.equal(approvalEvent.operatorClaim, 'integration-operator');
    assert.equal(approvalEvent.operatorClaimSource, 'request-body-self-reported');
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

  it('rejects unknown workers and duplicate mutations are idempotent', async () => {
    const invalid = await app.inject({ method: 'POST', url: '/v1/omega/commands', payload: { intent: 'bad worker', requestedBy: 'dashboard-user', workers: ['arbitrary-shell'], idempotencyKey: 'api-slice-invalid' } });
    assert.equal(invalid.statusCode, 400);
    const duplicate = await app.inject({ method: 'POST', url: '/v1/omega/commands', payload: { intent: 'run the bounded test plan', requestedBy: 'dashboard-user', workers: ['planner', 'tester'], idempotencyKey: 'api-slice-1', context: { stateBefore: 'S0' } } });
    assert.equal(duplicate.statusCode, 200);
    assert.equal(duplicate.json().command.commandId, 'omega-api-slice-1');
    const conflict = await app.inject({ method: 'POST', url: '/v1/omega/commands', payload: { intent: 'a different bounded test plan', requestedBy: 'dashboard-user', workers: ['planner', 'tester'], idempotencyKey: 'api-slice-1' } });
    assert.equal(conflict.statusCode, 409);
    assert.equal(conflict.json().error, 'OMEGA_IDEMPOTENCY_CONFLICT');
  });

  it('exposes only repository-observed safety boundary evidence', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: {
        intent: 'inspect safety boundary',
        requestedBy: 'integration-user',
        workers: ['planner'],
        idempotencyKey: 'safety-boundary-1',
      },
    });
    assert.equal(created.statusCode, 201);

    const boundary = await app.inject({
      method: 'GET',
      url: '/v1/omega/commands/omega-safety-boundary-1/safety-boundary',
    });
    assert.equal(boundary.statusCode, 200);
    const body = boundary.json();
    assert.equal(body.success, true);
    assert.equal(body.boundary.capability.status, 'UNKNOWN');
    assert.equal(body.boundary.policy.status, 'UNKNOWN');
    assert.equal(body.boundary.authority.status, 'UNKNOWN');
    assert.equal(body.boundary.lease.status, 'NOT_EXECUTED');
    assert.equal(body.boundary.execution.status, 'NOT_EXECUTED');
    assert.equal(body.boundary.observation.status, 'UNKNOWN');
    assert.equal(body.boundary.revocation.status, 'NOT_EXECUTED');
    assert.equal(body.boundary.reconciliation.status, 'NOT_EXECUTED');
  });

  it('rate-limits repeated command-store reads', async () => {
    let response;
    for (let attempt = 0; attempt < 61; attempt += 1) {
      response = await app.inject({ method: 'GET', url: '/v1/omega/commands' });
    }
    assert.equal(response?.statusCode, 429);
    assert.equal(response?.headers['retry-after'], '60');
  });
});
