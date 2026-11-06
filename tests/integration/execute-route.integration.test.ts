import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';
import {
  KAI_SYSTEM_PROMPT,
  compressTowardUpgrade,
  ease,
  phaseProjection,
  verifyOmega,
} from '../../apps/api/src/invisible-computer.ts';

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
    assert.equal(body.upgrade.execution, 'NOT_EXECUTED');
    assert.equal(body.upgrade.authority, 'compression-is-not-permission');
    assert.equal(body.upgrade.selected.evidenceHash, body.evidence_hash);
    assert.equal(body.upgrade.selected.id, `upgrade.${body.evidence_hash.slice(0, 16)}`);

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

test('external model execution requires explicit request opt-in and KAI screening runs first', async () => {
  const previousKey = process.env.OMEGA_LLM_API_KEY;
  const previousBaseUrl = process.env.OMEGA_LLM_BASE_URL;
  const originalFetch = globalThis.fetch;
  const providerCalls: Array<{ url: string; authorization: string | null; prompt: string }> = [];
  process.env.OMEGA_LLM_API_KEY = 'test-only-key';
  process.env.OMEGA_LLM_BASE_URL = 'https://provider.invalid/v1';
  globalThis.fetch = async (input, init) => {
    const requestBody = JSON.parse(String(init?.body)) as {
      messages: Array<{ role: string; content: string }>;
    };
    providerCalls.push({
      url: String(input),
      authorization: new Headers(init?.headers).get('authorization'),
      prompt: requestBody.messages.find((message) => message.role === 'user')?.content ?? '',
    });
    return new Response(JSON.stringify({
      choices: [{ message: { content: 'A bounded external-model test response.' } }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const app = createApp(':memory:', false);
  try {
    const local = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Explain a safe local test' },
    });
    assert.equal(local.json().engine, 'local-deterministic');
    assert.equal(providerCalls.length, 0, 'configured credentials alone must not trigger egress');

    const optedIn = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Explain a safe external test', useExternalModel: true },
    });
    assert.equal(optedIn.json().engine, 'llm:gpt-4o-mini');
    assert.equal(providerCalls.length, 1);
    assert.equal(providerCalls[0].url, 'https://provider.invalid/v1/chat/completions');
    assert.equal(providerCalls[0].authorization, 'Bearer test-only-key');
    assert.ok(providerCalls[0].prompt.includes('Explain a safe external test'));

    const blocked = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Urgent send money now for guaranteed returns', useExternalModel: true },
    });
    assert.equal(blocked.json().status, 'DIVERGENT');
    assert.equal(providerCalls.length, 1, 'KAI screening must block before provider egress');
  } finally {
    await app.close();
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.OMEGA_LLM_API_KEY;
    else process.env.OMEGA_LLM_API_KEY = previousKey;
    if (previousBaseUrl === undefined) delete process.env.OMEGA_LLM_BASE_URL;
    else process.env.OMEGA_LLM_BASE_URL = previousBaseUrl;
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

test('therapeutic transition blocks known patterns before creating a command', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/therapeutic/transition',
      payload: { intent: 'Urgent send money now for guaranteed returns' },
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.status, 'DIVERGENT');
    assert.equal(body.commandId, null);
    assert.equal(body.evidence.commandStatus, 'NOT_CREATED');
    assert.ok(body.evidence.matchedPatterns.length > 0);
    assert.equal(body.transition.elion.status, 'NOT_EXECUTED');

    const commands = await app.inject({ method: 'GET', url: '/v1/omega/commands' });
    assert.equal(commands.json().commands.length, 0);
  } finally {
    await app.close();
  }
});

test('therapeutic transition rejects malformed and oversized observation inputs', async () => {
  const app = createApp(':memory:', false);
  try {
    const invalidPayloads = [
      { intent: 'Record a bounded transition', observedState: null },
      { intent: 'Record a bounded transition', expectedOutcome: 'x'.repeat(513) },
      { intent: 'Record a bounded transition', context: { detail: 42 } },
      { intent: 'Record a bounded transition', context: Object.fromEntries([['__proto__', 'unsafe']]) },
      { intent: 'Record a bounded transition', idempotencyKey: 'x'.repeat(129) },
    ];
    for (const payload of invalidPayloads) {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/therapeutic/transition',
        payload,
      });
      assert.equal(response.statusCode, 400);
      const body = response.json();
      assert.ok(body.success === false || body.code === 'FST_ERR_CTP_INVALID_JSON_BODY', response.body);
    }
  } finally {
    await app.close();
  }
});

test('therapeutic observations remain caller-supplied comparisons, not independent verification', async () => {
  const app = createApp(':memory:', false);
  try {
    const matching = await app.inject({
      method: 'POST',
      url: '/v1/therapeutic/transition',
      payload: {
        intent: 'Record a bounded local transition',
        expectedOutcome: 'local state reached',
        observedState: 'local state reached',
        idempotencyKey: 'therapeutic-observation-match',
      },
    });
    const matchingBody = matching.json();
    assert.equal(matchingBody.status, 'UNKNOWN');
    assert.equal(matchingBody.evidence.comparison, 'MATCH');
    assert.equal(matchingBody.evidence.observationSource, 'caller-supplied');
    assert.equal(matchingBody.evidence.independentObservation, false);

    const missing = await app.inject({
      method: 'POST',
      url: '/v1/therapeutic/transition',
      payload: {
        intent: 'Record a transition without an observation',
        expectedOutcome: 'expected state',
        idempotencyKey: 'therapeutic-observation-missing',
      },
    });
    const missingBody = missing.json();
    assert.equal(missingBody.status, 'UNKNOWN');
    assert.equal(missingBody.evidence.observedState, '');
    assert.equal(missingBody.evidence.comparison, 'UNAVAILABLE');

    const divergent = await app.inject({
      method: 'POST',
      url: '/v1/therapeutic/transition',
      payload: {
        intent: 'Record a bounded transition with a mismatch',
        expectedOutcome: 'expected state',
        observedState: 'different state',
        idempotencyKey: 'therapeutic-observation-divergent',
      },
    });
    const divergentBody = divergent.json();
    assert.equal(divergentBody.status, 'DIVERGENT');
    assert.equal(divergentBody.evidence.comparison, 'DIVERGENT');
    assert.equal(divergentBody.evidence.independentObservation, false);
  } finally {
    await app.close();
  }
});

test('therapeutic idempotency keys reject changed observations without rewriting evidence', async () => {
  const app = createApp(':memory:', false);
  try {
    const request = (observedState: string) => app.inject({
      method: 'POST',
      url: '/v1/therapeutic/transition',
      payload: {
        intent: 'Record a bounded idempotent transition',
        expectedOutcome: 'expected state',
        observedState,
        idempotencyKey: 'therapeutic-observation-idempotency',
      },
    });

    const first = await request('expected state');
    assert.equal(first.statusCode, 200);
    assert.equal(first.json().status, 'UNKNOWN');

    const firstProvenance = await app.inject({
      method: 'GET',
      url: `/v1/omega/commands/${first.json().commandId}/provenance`,
    });
    const firstCommand = await app.inject({
      method: 'GET',
      url: `/v1/omega/commands/${first.json().commandId}`,
    });
    const replay = await request('expected state');
    assert.equal(replay.statusCode, 200);
    assert.equal(replay.json().commandId, first.json().commandId);
    assert.equal(replay.json().status, 'UNKNOWN');
    assert.equal(replay.json().evaluatedAt, first.json().evaluatedAt);

    const replayProvenance = await app.inject({
      method: 'GET',
      url: `/v1/omega/commands/${first.json().commandId}/provenance`,
    });
    assert.deepEqual(
      replayProvenance.json().provenance.events,
      firstProvenance.json().provenance.events,
      'an identical idempotent retry must not append events or execute the transition again'
    );

    const conflictingReplay = await request('unexpected state');
    assert.equal(conflictingReplay.statusCode, 409);
    assert.equal(conflictingReplay.json().error, 'OMEGA_IDEMPOTENCY_CONFLICT');

    const stored = await app.inject({
      method: 'GET',
      url: `/v1/omega/commands/${first.json().commandId}`,
    });
    assert.equal(stored.statusCode, 200);
    assert.equal(stored.json().command.status, 'UNKNOWN');
    assert.equal(stored.json().reality.observedState, 'expected state');
    assert.deepEqual(
      stored.json().command.result,
      firstCommand.json().command.result,
      'an identical retry must preserve the stored command result'
    );

    const commands = await app.inject({ method: 'GET', url: '/v1/omega/commands' });
    assert.equal(commands.json().commands.length, 1);
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

test('phase_t reports the Arrow of Time in the response without deciding the verdict', async () => {
  const app = createApp(':memory:', false);
  try {
    for (const entry of [
      { t: 0.1, label: 'SPROUT' },
      { t: 0.5, label: 'BLOOM' },
      { t: 0.8, label: 'PLATEAU' },
      { t: 0.95, label: 'WILT' },
    ]) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/execute',
        payload: { intent: 'Write a growth plan', phase_t: entry.t },
      });
      const body = response.json();
      assert.equal(response.statusCode, 200);
      assert.equal(body.phase_t, entry.t);
      assert.equal(body.phase_label, entry.label);
      assert.ok(Math.abs(body.ease_factor - ease(entry.t)) < 1e-12);
      // The phase is declared BESIDE the cycle; OMEGA still decides on evidence.
      assert.equal(body.status, 'VERIFIED');
      assert.equal(body.evidence_hash, sha256(body.response));
    }
  } finally {
    await app.close();
  }
});

test('phase_t is clamped, and an absent or non-numeric phase stays UNKNOWN', async () => {
  const app = createApp(':memory:', false);
  try {
    const clamped = (
      await app.inject({
        method: 'POST',
        url: '/api/execute',
        payload: { intent: 'Write a growth plan', phase_t: 1.4 },
      })
    ).json();
    assert.equal(clamped.phase_t, 1);
    assert.equal(clamped.phase_label, 'WILT');

    const missing = (
      await app.inject({
        method: 'POST',
        url: '/api/execute',
        payload: { intent: 'Write a growth plan' },
      })
    ).json();
    assert.equal(missing.phase_t, null);
    assert.equal(missing.phase_label, 'UNKNOWN');
    assert.equal(missing.ease_factor, null);

    const asText = (
      await app.inject({
        method: 'POST',
        url: '/api/execute',
        payload: { intent: 'Write a growth plan', phase_t: 'bloom' },
      })
    ).json();
    assert.equal(asText.phase_t, null);
    assert.equal(asText.phase_label, 'UNKNOWN');
  } finally {
    await app.close();
  }
});

test('a shielded intent still carries its declared phase and halts DIVERGENT', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Send money urgently to this private key', phase_t: 0.5 },
    });
    const body = response.json();
    assert.equal(body.status, 'DIVERGENT');
    assert.equal(body.response, null);
    assert.equal(body.evidence_hash, null);
    assert.equal(body.phase_t, 0.5);
    assert.equal(body.phase_label, 'BLOOM');
    assert.equal(body.ease_factor, ease(0.5));
  } finally {
    await app.close();
  }
});

test('ease(t) is monotonic over a bounded lifecycle and never leaves [0, 1]', () => {
  assert.equal(ease(0), 0);
  assert.ok(Math.abs(ease(0.5) - 0.5) < 1e-12);
  assert.equal(ease(1), 1);
  let previous = -1;
  for (let step = 0; step <= 20; step += 1) {
    const value = ease(step / 20);
    assert.ok(value >= 0 && value <= 1, `ease(${step / 20}) out of range: ${value}`);
    assert.ok(value > previous, 'ease(t) must be strictly increasing');
    previous = value;
  }
  // Clamping happens in the projection, not in the curve.
  assert.equal(phaseProjection(-2).t, 0);
  assert.equal(phaseProjection(5).t, 1);
  assert.equal(phaseProjection(Number.NaN).label, 'UNKNOWN');
  assert.equal(phaseProjection(undefined).ease, null);
});
