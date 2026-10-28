import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';

test('divergence feed returns redacted divergent evidence only', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'omega-divergence-feed-'));
  const app = createApp(join(dir, 'test.db'), false, { allowUnsignedCycle: true });
  await app.ready();
  try {
    const created = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: {
        intent: 'observe a bounded local state',
        requestedBy: 'operator:feed-test',
        workers: ['planner'],
        idempotencyKey: 'divergence-feed-001',
      },
    });
    const commandId = created.json().command.commandId;
    const claimed = await app.inject({ method: 'POST', url: `/v1/omega/commands/${commandId}/admit`, payload: { authority: 'human:feed-test', policy: 'test.v1', authorityVerified: true, policySatisfied: true } });
    assert.equal(claimed.statusCode, 400);
    assert.equal(claimed.json().error, 'COMMAND_ADMISSION_EVIDENCE_NOT_ACCEPTED');
    assert.equal((await app.inject({ method: 'GET', url: `/v1/omega/commands/${commandId}` })).json().command.status, 'PROPOSED');
    const approved = await app.inject({ method: 'POST', url: `/v1/omega/commands/${commandId}/approve`, payload: { operator: 'feed-test', policy: 'test.v1' } });
    assert.equal(approved.statusCode, 200);
    assert.equal(approved.json().command.status, 'AUTHORIZED');
    await app.inject({ method: 'POST', url: `/v1/omega/commands/${commandId}/execute`, payload: {} });
    await app.inject({ method: 'POST', url: `/v1/omega/commands/${commandId}/observe`, payload: { observedState: 'unexpected-state' } });

    const response = await app.inject({ method: 'GET', url: '/v1/omega/divergences?limit=1' });
    const body = response.json();
    assert.equal(response.statusCode, 200);
    assert.equal(body.redacted, true);
    assert.equal(body.count, 1);
    assert.equal(body.alerts[0].commandId, commandId);
    assert.equal(body.alerts[0].status, 'DIVERGENT');
    assert.equal(body.alerts[0].reality.classification, 'DIVERGENT');
    assert.match(body.nextAction, /preserve the conflict/);

    const invalidNote = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${commandId}/reconciliation`,
      payload: { action: 'execute', note: 'not an allowed reconciliation action', operator: 'operator-feed-test' },
    });
    assert.equal(invalidNote.statusCode, 400);
    const note = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${commandId}/reconciliation`,
      payload: { action: 'accepted', note: 'Accepted for review because the observer used a stale fixture.', operator: 'operator-feed-test' },
    });
    assert.equal(note.statusCode, 200);
    assert.equal(note.json().status, 'DIVERGENT');
    assert.equal(note.json().reconciliation.action, 'accepted');
    assert.equal(note.json().reconciliation.operator, 'operator-feed-test');
    assert.match(note.json().nextAction, /no retry/);
    const events = await app.inject({ method: 'GET', url: `/v1/omega/events?commandId=${commandId}` });
    assert.equal(events.json().events.at(-1).type, 'command.reconciliation-noted');
    assert.equal(events.json().events.at(-1).note, 'Accepted for review because the observer used a stale fixture.');
    const unchanged = await app.inject({ method: 'GET', url: `/v1/omega/commands/${commandId}` });
    assert.equal(unchanged.json().command.status, 'DIVERGENT');

    const invalid = await app.inject({ method: 'GET', url: '/v1/omega/divergences?since=not-a-date' });
    assert.equal(invalid.statusCode, 400);
    assert.equal(invalid.json().error, 'DIVERGENCE_SINCE_INVALID');
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('divergence feed since uses the observation instant, not command creation', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'omega-divergence-since-'));
  const app = createApp(join(dir, 'test.db'), false, { allowUnsignedCycle: true });
  await app.ready();
  try {
    const created = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: {
        intent: 'compare a later observation with an earlier proposal',
        requestedBy: 'operator:since-test',
        workers: ['planner'],
        idempotencyKey: 'divergence-since-001',
      },
    });
    const commandId = created.json().command.commandId;
    const createdAt = created.json().command.createdAt as string;
    const since = new Date(new Date(createdAt).getTime() + 1).toISOString();
    await new Promise((resolve) => setTimeout(resolve, 20));
    await app.inject({ method: 'POST', url: `/v1/omega/commands/${commandId}/approve`, payload: { operator: 'since-test', policy: 'test.v1' } });
    await app.inject({ method: 'POST', url: `/v1/omega/commands/${commandId}/execute`, payload: {} });
    const observed = await app.inject({ method: 'POST', url: `/v1/omega/commands/${commandId}/observe`, payload: { observedState: 'not-the-executor-record' } });
    assert.equal(observed.statusCode, 200);
    assert.equal(observed.json().command.status, 'DIVERGENT');

    const included = await app.inject({ method: 'GET', url: `/v1/omega/divergences?since=${encodeURIComponent(since)}` });
    assert.equal(included.statusCode, 200);
    assert.equal(included.json().sinceBasis, 'divergence-observed-at');
    assert.equal(included.json().count, 1);
    assert.equal(included.json().alerts[0].commandId, commandId);
    assert.equal(included.json().alerts[0].timeBasis, 'reality-observed-event');
    assert.equal(typeof included.json().alerts[0].observedAt, 'string');
    assert.ok(new Date(included.json().alerts[0].observedAt).getTime() >= new Date(since).getTime());
    assert.ok(new Date(included.json().alerts[0].observedAt).getTime() > new Date(createdAt).getTime());

    const after = new Date(Date.now() + 60_000).toISOString();
    const excluded = await app.inject({ method: 'GET', url: `/v1/omega/divergences?since=${encodeURIComponent(after)}` });
    assert.equal(excluded.statusCode, 200);
    assert.equal(excluded.json().count, 0);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
