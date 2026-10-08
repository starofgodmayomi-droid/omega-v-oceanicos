import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../apps/api/dist/index.js';

/**
 * Ω∞v Canonical Store — Full Lifecycle Integration Test
 *
 * Exercises the durable canonical OmegaCommandStore path through:
 * propose → admit → approve → execute → observe → verify-reality → provenance → compress
 *
 * This proves the canonical store (omega.ts) is correctly wired into the
 * extended routes (omega/routes.ts) and handles the complete lifecycle.
 */
describe('Ω∞v canonical store lifecycle', () => {
  const app = createApp(':memory:', false);
  let commandId: string;

  before(async () => { await app.ready(); });
  after(async () => { await app.close(); });

  it('proposes a command through the canonical store path', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: {
        intent: 'verify canonical lifecycle',
        requestedBy: 'canonical-integration-test',
        workers: ['planner', 'tester'],
        idempotencyKey: 'canonical-lifecycle-1',
        context: { layer: 'L4:engineering' },
      },
    });
    assert.equal(response.statusCode, 201);
    const body = response.json();
    assert.equal(body.success, true);
    assert.equal(body.command.status, 'REVIEW');
    assert.equal(body.command.intent, 'verify canonical lifecycle');
    assert.equal(body.command.requestedBy, 'canonical-integration-test');
    assert.equal(body.command.dryRun, true);
    assert.equal(body.command.redacted, true);
    commandId = body.command.commandId;
    assert.ok(commandId, 'commandId must be present');
  });

  it('idempotency returns the same command for duplicate keys', async () => {
    const dup = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: {
        intent: 'verify canonical lifecycle',
        requestedBy: 'canonical-integration-test',
        workers: ['planner', 'tester'],
        idempotencyKey: 'canonical-lifecycle-1',
      },
    });
    assert.equal(dup.statusCode, 201);
    assert.equal(dup.json().command.commandId, commandId);
  });

  it('lists commands from the canonical store', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/omega/commands' });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.ok(body.commands.some((c: any) => c.commandId === commandId));
    assert.equal(body.redacted, true);
  });

  it('inspects a single command from the canonical store', async () => {
    const response = await app.inject({ method: 'GET', url: `/v1/omega/commands/${commandId}` });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.equal(body.command.commandId, commandId);
    assert.equal(body.command.status, 'REVIEW');
    assert.ok(body.nextAction);
  });

  it('rejects execution before authorization (fail-closed)', async () => {
    const denied = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${commandId}/execute`,
    });
    assert.equal(denied.statusCode, 409);
    assert.equal(denied.json().error, 'OMEGA_EXECUTION_REQUIRES_AUTHORIZATION');
  });

  it('approves the command with human authority', async () => {
    const approved = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${commandId}/approve`,
      payload: { operator: 'canonical-test-operator' },
    });
    assert.equal(approved.statusCode, 200);
    assert.equal(approved.json().command.status, 'AUTHORIZED');
    assert.equal(approved.json().command.change.authority, 'human:canonical-test-operator');
  });

  it('executes the authorized command', async () => {
    const executed = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${commandId}/execute`,
    });
    assert.equal(executed.statusCode, 200);
    const body = executed.json();
    assert.equal(body.command.status, 'EXECUTED');
    assert.match(body.execution.attestationId, /^attestation-[a-f0-9]{64}$/);
  });

  it('observes reality and verifies the outcome', async () => {
    const observed = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${commandId}/observe`,
      payload: { observedState: 'bounded-local-action-complete' },
    });
    assert.equal(observed.statusCode, 200);
    const body = observed.json();
    assert.equal(body.command.status, 'VERIFIED');
    assert.equal(body.reality.classification, 'VERIFIED');
    assert.ok(body.reality.observedAt);
  });

  it('verify-reality confirms the verified state', async () => {
    const verified = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${commandId}/verify-reality`,
    });
    assert.equal(verified.statusCode, 200);
    const body = verified.json();
    assert.equal(body.command.status, 'VERIFIED');
    assert.ok(body.reality);
  });

  it('retrieves full provenance chain for the command', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/omega/commands/${commandId}/provenance`,
    });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.equal(body.provenance.commandId, commandId);
    assert.equal(body.provenance.redacted, true);
    assert.ok(body.provenance.events.length >= 3, 'provenance must have at least 3 events (proposed, approved, executed)');
    assert.ok(body.provenance.lineage.length >= 3, 'lineage must track at least 3 transitions');
  });

  it('retrieves events filtered by commandId', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/omega/events?commandId=${commandId}`,
    });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.ok(body.events.length >= 3);
    assert.ok(body.events.every((e: any) => e.commandId === commandId));
  });

  it('validates a total compression request without executing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/omega/compress',
      payload: {
        archiveId: `archive-canonical-${Date.now()}`,
        evolutionScope: 'CONVERSATION_HISTORIC_COMPRESSION',
        activePackages: ['mini', 'remember'],
        totalContextTokensProcessed: 8000,
        rigidLeaseBoundMs: 30000,
      },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.equal(body.validation, 'VALID');
    assert.equal(body.execution, 'NOT_STARTED');
    assert.equal(body.evidence, 'INPUT_STRUCTURE_ONLY');
  });

  it('rejects invalid compression requests', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/omega/compress',
      payload: {
        archiveId: '../escape',
        evolutionScope: 'EVERYTHING_ONLINE_ACTUATION',
        activePackages: [],
        totalContextTokensProcessed: -1,
        rigidLeaseBoundMs: 999999,
      },
    });
    assert.equal(response.statusCode, 400);
    const body = response.json();
    assert.equal(body.success, false);
    assert.equal(body.validation, 'INVALID');
    assert.ok(body.issues.length >= 3);
  });

  it('rejects observation before execution (fail-closed)', async () => {
    // Create a new command that hasn't been executed
    const created = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: {
        intent: 'observe-before-execute guard test',
        requestedBy: 'canonical-integration-test',
        workers: ['planner'],
        idempotencyKey: 'canonical-guard-observe-1',
      },
    });
    assert.equal(created.statusCode, 201);
    const guardId = created.json().command.commandId;

    const rejected = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${guardId}/observe`,
      payload: { observedState: 'should-not-be-accepted' },
    });
    assert.equal(rejected.statusCode, 409);
    assert.equal(rejected.json().error, 'OMEGA_OBSERVATION_REQUIRES_EXECUTION');
  });
});
