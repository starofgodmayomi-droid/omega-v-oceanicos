import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';
import { KAI_SYSTEM_PROMPT, verifyOmega } from '../../apps/api/src/invisible-computer.ts';

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

test('POST /api/execute runs KAI → ELION → OMEGA → KAI and returns the evidence hash', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Explain how evidence-bound verification works' },
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.status, 'VERIFIED');
    assert.equal(body.engine, 'local-deterministic');
    assert.match(body.evidence_hash, /^[0-9a-f]{64}$/);
    assert.equal(body.evidence_hash, sha256(body.response));
    assert.ok(body.response.includes('Explain how evidence-bound verification works'));
    assert.equal(body.contract.authority_level, 'READ_ONLY');
    assert.ok(body.contract.expected_outcome.length > 0);
    assert.ok(body.memory?.id, 'a verified outcome must be remembered');

    assert.deepEqual(
      body.steps.map((step: any) => `${step.actor}:${step.phase}:${step.status}`),
      [
        'KAI:OBSERVE:VERIFIED',
        'ELION:EXECUTE:VERIFIED',
        'OMEGA:VERIFY:VERIFIED',
        'KAI:REMEMBER:VERIFIED',
      ]
    );

    const memory = await app.inject({ method: 'GET', url: '/api/kai/memory?limit=5' });
    const memoryBody = memory.json();
    assert.equal(memory.statusCode, 200);
    assert.equal(memoryBody.total, 1);
    assert.equal(memoryBody.records[0].id, body.memory.id);
    assert.equal(memoryBody.records[0].evidence_hash, body.evidence_hash);
    assert.equal(memoryBody.records[0].status, 'VERIFIED');
    assert.equal(memoryBody.records[0].contract_id, body.contract.id);
    assert.deepEqual(
      memoryBody.records[0].contract,
      {
        id: body.contract.id,
        authority_level: body.contract.authority_level,
        expected_outcome: body.contract.expected_outcome,
      },
      'a row lists the contract it was verified against'
    );
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
    assert.equal(response.json().status, 'VERIFIED');
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
    assert.equal(body.reason, 'KAI Shield blocked this intent.');
    assert.equal(body.evidence_hash, null);
    assert.equal(body.response, null);
    assert.equal(body.memory, null);
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
    assert.equal(granted.json().status, 'VERIFIED');
    assert.equal(granted.json().contract.authority_level, 'AUTONOMOUS');

    const memory = await app.inject({ method: 'GET', url: '/api/kai/memory' });
    assert.equal(memory.json().total, 1, 'only the authorized run is remembered');
  } finally {
    await app.close();
  }
});

test('a remembered verdict is bound to its contract and reconciles after the fact', async () => {
  const app = createApp(':memory:', false);
  try {
    const run = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Explain how evidence-bound verification works' },
    });
    const body = run.json();
    assert.equal(body.status, 'VERIFIED');

    const detail = await app.inject({
      method: 'GET',
      url: `/api/kai/memory/${body.memory.id}`,
    });
    const detailBody = detail.json();
    assert.equal(detail.statusCode, 200);
    assert.equal(detailBody.record.contract_id, body.contract.id);
    assert.equal(detailBody.contract.id, body.contract.id);

    const verified = await app.inject({
      method: 'POST',
      url: `/api/kai/memory/${body.memory.id}/reconcile`,
      payload: { output: body.response },
    });
    assert.equal(verified.statusCode, 200);
    assert.equal(verified.json().status, 'VERIFIED');

    const tampered = await app.inject({
      method: 'POST',
      url: `/api/kai/memory/${body.memory.id}/reconcile`,
      payload: { output: `${body.response} (edited)` },
    });
    assert.equal(tampered.json().status, 'DIVERGENT');

    const missing = await app.inject({
      method: 'POST',
      url: `/api/kai/memory/${body.memory.id}/reconcile`,
      payload: {},
    });
    assert.equal(missing.json().status, 'UNKNOWN');

    const absent = await app.inject({ method: 'GET', url: '/api/kai/memory/does-not-exist' });
    assert.equal(absent.statusCode, 404);
  } finally {
    await app.close();
  }
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
