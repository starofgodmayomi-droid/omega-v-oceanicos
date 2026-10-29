import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authoritySufficient,
  verificationIdentity,
  realityStep,
  OMEGA_V_SPEC,
} from '../../apps/api/src/omega-v-fixpoint.ts';
import { createApp } from '../../apps/api/dist/index.js';

// ── Pure function tests ──────────────────────────────────────────────

test('authoritySufficient: READ_ONLY is within READ_ONLY and AUTONOMOUS', () => {
  assert.equal(authoritySufficient('READ_ONLY', 'READ_ONLY'), true);
  assert.equal(authoritySufficient('READ_ONLY', 'AUTONOMOUS'), true);
});

test('authoritySufficient: AUTONOMOUS exceeds READ_ONLY', () => {
  assert.equal(authoritySufficient('AUTONOMOUS', 'READ_ONLY'), false);
  assert.equal(authoritySufficient('AUTONOMOUS', 'AUTONOMOUS'), true);
});

test('authoritySufficient: unknown authority is never sufficient', () => {
  assert.equal(authoritySufficient('OMNIPOTENT', 'AUTONOMOUS'), false);
});

test('verificationIdentity: V ≡ (Expected ≡ Observed)', () => {
  assert.equal(verificationIdentity('abc', 'abc'), true);
  assert.equal(verificationIdentity('abc', 'abd'), false);
  assert.equal(verificationIdentity('', ''), true);
});

test('realityStep: only verified deltas enter memory (M_{t+1} = M_t ∪ Δ | V(Δ) = ⊤)', () => {
  const memory = [{ hash: 'a' }];
  const delta = { hash: 'b' };

  const admitted = realityStep(memory, delta, () => true);
  assert.equal(admitted.admitted, true);
  assert.equal(admitted.memory.length, 2);
  assert.deepEqual(admitted.memory, [{ hash: 'a' }, { hash: 'b' }]);

  const rejected = realityStep(memory, delta, () => false);
  assert.equal(rejected.admitted, false);
  assert.equal(rejected.memory.length, 1);
  assert.equal(rejected.memory[0].hash, 'a');
});

test('OMEGA_V_SPEC carries the formal formulas', () => {
  assert.ok(OMEGA_V_SPEC.fixpoint.includes('Y(λf'));
  assert.ok(OMEGA_V_SPEC.reality.includes('M_{t+1}'));
  assert.ok(OMEGA_V_SPEC.verification.includes('Expected ≡ Observed'));
  assert.ok(OMEGA_V_SPEC.principle.includes('remembers what matches reality'));
});

// ── API integration tests ───────────────────────────────────────────

test('GET /api/omega-v/spec returns the formal specification', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({ method: 'GET', url: '/api/omega-v/spec' });
    const body = response.json();
    assert.equal(response.statusCode, 200);
    assert.equal(body.success, true);
    assert.ok(body.spec.fixpoint.includes('Y(λf'));
    assert.ok(body.spec.verification.includes('Expected ≡ Observed'));
    assert.ok(body.spec.principle.includes('remembers what matches reality'));
  } finally {
    await app.close();
  }
});

test('AUTONOMOUS authority halts with NOT_EXECUTED when system max is READ_ONLY', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Execute a deployment autonomously', authorityLevel: 'AUTONOMOUS' },
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.status, 'NOT_EXECUTED');
    assert.equal(body.response, null);
    assert.equal(body.memory, null);
    assert.equal(body.evidence_hash, null);
    assert.ok(body.reason.includes('Authority insufficient'));
    assert.ok(body.contract, 'contract should be included so the human can see what was expected');
    assert.equal(body.contract.authority_level, 'AUTONOMOUS');
    assert.deepEqual(
      body.steps.map((step: any) => `${step.actor}:${step.phase}:${step.status}`),
      ['KAI:OBSERVE:VERIFIED', 'KAI:GATE:NOT_EXECUTED']
    );
  } finally {
    await app.close();
  }
});

test('READ_ONLY authority passes the gate and produces VERIFIED', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Explain the verification identity', authorityLevel: 'READ_ONLY' },
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.status, 'VERIFIED');
    assert.ok(
      body.steps.some((step: any) => step.phase === 'GATE' && step.status === 'VERIFIED'),
      'the authority gate step must appear and pass'
    );
  } finally {
    await app.close();
  }
});
