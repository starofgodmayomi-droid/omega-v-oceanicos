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

    const admitted = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${body.command.commandId}/admit`,
      payload: {
        authority: 'human:dashboard-operator',
        policy: 'mood-codex-boundary.v1',
        authorityVerified: true,
        policySatisfied: true,
      },
    });
    assert.equal(admitted.statusCode, 200);
    assert.equal(admitted.json().command.status, 'AUTHORIZED');
    assert.equal(admitted.json().command.result, undefined);
    assert.match(admitted.json().nextAction, /execute the authorized bounded action/);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
