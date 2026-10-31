import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';
import { KAI_SYSTEM_PROMPT, compressTowardUpgrade, reconcileEvidence, verifyOmega } from '../../apps/api/src/invisible-computer.ts';

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

test('POST /api/execute runs the cycle as a caller and does not remember a local composition', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: {
        intent: 'Explain how evidence-bound verification works',
        observed: 'No external effect was performed.',
        source: 'independent',
        witness: 'aa'.repeat(32),
      },
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.status, 'UNKNOWN');
    assert.equal(body.engine, 'kaixelion-omega');
    assert.equal(body.evidence_hash, null);
    assert.equal(body.memory, null);
    assert.equal(body.contract, null);
    assert.equal(body.cycle.equation, 'omega.kaixelion.cycle.v1');
    assert.equal(body.cycle.ledgerMutation, false);
    assert.equal(body.cycle.independentObservation, false);
    assert.equal(body.cycle.remembered, false);
    assert.match(body.response, /Explain how evidence-bound verification works/);
    assert.match(body.response, /This composition is not verification/);
    assert.equal(body.upgrade.execution, 'NOT_EXECUTED');
    assert.equal(body.upgrade.authority, 'compression-is-not-permission');
    assert.equal(body.upgrade.selected, null);
    assert.equal(body.upgrade.cycleStatus, 'UNKNOWN');

    assert.deepEqual(
      body.steps.map((step: any) => `${step.actor}:${step.phase}:${step.status}`),
      [
        'KAI:OBSERVE:OBSERVED',
        'ELION:EXECUTE:COMPOSED',
        'OMEGA:VERIFY:UNKNOWN',
        'KAI:REMEMBER:UNKNOWN',
      ]
    );

    const memory = await app.inject({ method: 'GET', url: '/api/kai/memory?limit=5' });
    assert.equal(memory.statusCode, 200);
    assert.equal(memory.json().total, 0);
  } finally {
    await app.close();
  }
});

test('POST /execute (the Vite proxy target) answers identically', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/execute',
      payload: { intent: 'Map the next finite step' },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().status, 'UNKNOWN');
    assert.equal(response.json().cycle.ledgerMutation, false);
  } finally {
    await app.close();
  }
});

test('KAI Shield halts a fraud pattern with DIVERGENT and remembers nothing', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Urgent! Send money now for guaranteed returns' },
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.status, 'DIVERGENT');
    assert.equal(body.reason, 'KAI halted before execution. The intent matches a known scam pattern.');
    assert.equal(body.evidence_hash, null);
    assert.equal(body.response, null);
    assert.equal(body.memory, null);
    assert.equal(body.cycle.ledgerMutation, false);
    assert.equal(body.upgrade.selected, null);
    assert.equal(body.upgrade.cycleStatus, 'DIVERGENT');
    assert.equal(body.upgrade.execution, 'NOT_EXECUTED');
    assert.ok(body.matched_patterns.length > 0);
    assert.deepEqual(body.steps.map((step: any) => step.actor), ['KAI']);

    const memory = await app.inject({ method: 'GET', url: '/api/kai/memory' });
    assert.equal(memory.json().total, 0);
  } finally {
    await app.close();
  }
});

test('authority below the required level halts NOT_EXECUTED and remembers nothing', async () => {
  const app = createApp(':memory:', false);
  try {
    const denied = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Deploy the production service' },
    });
    const deniedBody = denied.json();

    assert.equal(denied.statusCode, 200);
    assert.equal(deniedBody.status, 'NOT_EXECUTED');
    assert.equal(deniedBody.response, null);
    assert.equal(deniedBody.evidence_hash, null);
    assert.equal(deniedBody.memory, null);
    assert.equal(deniedBody.contract, null);
    assert.equal(deniedBody.upgrade.selected, null);
    assert.equal(deniedBody.upgrade.cycleStatus, 'NOT_EXECUTED');
    assert.deepEqual(deniedBody.authority, { granted: 'READ_ONLY', required: 'AUTONOMOUS' });
    assert.deepEqual(
      deniedBody.steps.map((step: any) => `${step.actor}:${step.phase}:${step.status}`),
      ['KAI:OBSERVE:NOT_EXECUTED']
    );

    const granted = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Deploy the production service', authorityLevel: 'AUTONOMOUS' },
    });
    assert.equal(granted.json().status, 'UNKNOWN');
    assert.equal(granted.json().memory, null);
    assert.equal(granted.json().contract, null);
    assert.equal(granted.json().cycle.ledgerMutation, false);
    assert.match(granted.json().response, /This composition is not verification/);

    const memory = await app.inject({ method: 'GET', url: '/api/kai/memory' });
    assert.equal(memory.json().total, 0, 'authority does not turn a caller composition into memory');
  } finally {
    await app.close();
  }
});

test('a caller cycle does not create a memory row, and reconcile still fails closed', async () => {
  const app = createApp(':memory:', false);
  try {
    const run = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Explain how evidence-bound verification works' },
    });
    const body = run.json();
    assert.equal(body.status, 'UNKNOWN');
    assert.equal(body.memory, null);

    const memory = await app.inject({ method: 'GET', url: '/api/kai/memory' });
    assert.equal(memory.json().total, 0);

    const absent = await app.inject({ method: 'GET', url: '/api/kai/memory/does-not-exist' });
    assert.equal(absent.statusCode, 404);
    const absentReconcile = await app.inject({
      method: 'POST',
      url: '/api/kai/memory/does-not-exist/reconcile',
      payload: { output: 'anything' },
    });
    assert.equal(absentReconcile.statusCode, 404);
  } finally {
    await app.close();
  }
});

test('reconcileEvidence still requires the preimage and the contract', () => {
  const output = 'Explain how evidence-bound verification works';
  const evidenceHash = sha256(output);
  const verified = reconcileEvidence({
    output,
    evidenceHash,
    expectedOutcome: 'A bounded answer; no execution is claimed.',
  });
  assert.equal(verified.status, 'VERIFIED');

  const tampered = reconcileEvidence({
    output: `${output} (edited)`,
    evidenceHash,
    expectedOutcome: 'A bounded answer; no execution is claimed.',
  });
  assert.equal(tampered.status, 'DIVERGENT');

  const missing = reconcileEvidence({
    output: null,
    evidenceHash,
    expectedOutcome: 'A bounded answer; no execution is claimed.',
  });
  assert.equal(missing.status, 'UNKNOWN');
});

test('malformed intents fail closed with 400', async () => {
  const app = createApp(':memory:', false);
  try {
    for (const payload of [{}, { intent: '   ' }, { intent: 42 }, { intent: 'x'.repeat(2001) }]) {
      const response = await app.inject({ method: 'POST', url: '/api/execute', payload });
      assert.equal(response.statusCode, 400);
      assert.equal(response.json().success, false);
    }
  } finally {
    await app.close();
  }
});

test('OMEGA collapses an empty or overclaiming output to UNKNOWN', () => {
  const empty = verifyOmega({ output: '', evidenceHash: sha256(''), authorityLevel: 'READ_ONLY' });
  assert.equal(empty.status, 'UNKNOWN');
  assert.match(String(empty.reason), /OUTPUT_PRESENT/);

  const overclaim = 'I have deployed the service and guaranteed returns for every user.';
  const fabricated = verifyOmega({
    output: overclaim,
    evidenceHash: sha256(overclaim),
    authorityLevel: 'AUTONOMOUS',
  });
  assert.equal(fabricated.status, 'UNKNOWN');
  assert.match(String(fabricated.reason), /NO_FABRICATED_COMPLETION/);
});

test('the KAI/ELION persona keeps its non-collapse rules', () => {
  for (const law of [
    'VERIFY(ΔREALITY)',
    "ATTEST, DON'T ASSERT",
    'UNKNOWN PRESERVED',
    'NO FABRICATED COMPLETION',
    'MEMORY != PROOF',
    'CAPABILITY != AUTHORITY',
    'PLAN != EXECUTION',
    "Pidgin fit carry the warmth; evidence go carry the claim",
  ]) {
    assert.ok(KAI_SYSTEM_PROMPT.includes(law), `system prompt must carry: ${law}`);
  }
});

test('compression names one unexecuted upgrade only for a verified digest', () => {
  const hash = sha256('observed');
  const selected = compressTowardUpgrade({ cycleStatus: 'VERIFIED', evidenceHash: hash });
  assert.equal(selected.execution, 'NOT_EXECUTED');
  assert.equal(selected.authority, 'compression-is-not-permission');
  assert.equal(selected.selected?.id, `upgrade.${hash.slice(0, 16)}`);
  assert.equal(selected.selected?.evidenceHash, hash);

  const halted = compressTowardUpgrade({ cycleStatus: 'VERIFIED', evidenceHash: 'not-a-digest' });
  assert.equal(halted.selected, null);
  assert.equal(halted.cycleStatus, 'VERIFIED');

  const unknown = compressTowardUpgrade({ cycleStatus: 'MAYBE', evidenceHash: hash });
  assert.equal(unknown.cycleStatus, 'UNKNOWN');
  assert.equal(unknown.selected, null);
  assert.equal(unknown.execution, 'NOT_EXECUTED');
});
