import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../apps/api/dist/index.js';

describe('Ω∞v command API vertical slice', () => {
  const app = createApp(':memory:', false);
  before(async () => { await app.ready(); });
  after(async () => { await app.close(); });

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

  it('keeps reality status evidence-bound', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/reality/status' });
    assert.equal(response.statusCode, 200);
    const vector = response.json().statusVector as Array<{ field: string; value: string; evidence: string }>;
    const tested = vector.find((field) => field.field === 'tested');
    const verified = vector.find((field) => field.field === 'verified');
    const attested = vector.find((field) => field.field === 'attested');
    assert.equal(tested?.value, 'UNKNOWN');
    assert.equal(verified?.value, 'UNKNOWN');
    assert.equal(attested?.value, 'UNKNOWN');
    assert.match(verified?.evidence ?? '', /reality verification|reconciliation/i);
    assert.match(attested?.evidence ?? '', /attestation receipt|signature capability/i);
  });
});
