import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';

const require = createRequire(import.meta.url);
const { evolveQuantumState, reconcileQuantumEvolution, QUANTUM_STATE_BASIS, QUANTUM_STATE_LIMITS } = require('../../packages/mini/dist/index.js');

test('quantum evolution applies Symmetry ⊗ Inversion then a unitary time step', () => {
  const result = evolveQuantumState({ symmetryDegrees: 90, inversionDegrees: 90, tau: Math.PI / 2 });
  assert.equal(result.status, 'EVOLVED');
  const state = result.state;

  assert.equal(state.contract, 'omega.quantum.evolution.v1');
  assert.deepEqual(state.basis, ['00', '01', '10', '11']);
  assert.deepEqual(QUANTUM_STATE_BASIS, ['00', '01', '10', '11']);
  assert.deepEqual(state.operators.tensor, [
    [0, 0, 1, 0],
    [0, 0, 0, -1],
    [1, 0, 0, 0],
    [0, -1, 0, 0],
  ]);
  assert.deepEqual(state.operators.hamiltonian, [0, 1, 1, 2]);

  assert.ok(state.checks.normalization < 1e-9, `normalization ${state.checks.normalization}`);
  assert.ok(state.checks.unitarity < 1e-9, `unitarity ${state.checks.unitarity}`);
  assert.ok(state.checks.phaseOnly < 1e-9, `phaseOnly ${state.checks.phaseOnly}`);
  assert.ok(1 - state.checks.reversibility < 1e-9, `reversibility ${state.checks.reversibility}`);
  assert.equal(state.checks.passed, true);
  assert.equal(state.reality.status, 'VERIFIED');
  assert.equal(state.evidence, 'LOCAL_SYMBOLIC');
  assert.match(state.digest, /^[a-f0-9]{64}$/);

  const total = state.states.evolved.probabilities.reduce((sum: number, value: number) => sum + value, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
});

test('time evolution adds phase only: probabilities survive every τ', () => {
  const early = evolveQuantumState({ symmetryDegrees: 40, inversionDegrees: 125, tau: 0 });
  const late = evolveQuantumState({ symmetryDegrees: 40, inversionDegrees: 125, tau: Math.PI });

  assert.equal(early.status, 'EVOLVED');
  assert.equal(late.status, 'EVOLVED');
  assert.notEqual(early.state.digest, late.state.digest);
  assert.deepEqual(late.state.states.agent.probabilities, early.state.states.agent.probabilities);
  assert.deepEqual(late.state.states.evolved.probabilities, early.state.states.inverted.probabilities);
});

test('evolution refuses unbounded or non-finite input instead of inventing a state', () => {
  const angle = evolveQuantumState({ symmetryDegrees: 200 });
  assert.equal(angle.status, 'INVALID');
  assert.equal(angle.state, null);
  assert.equal(angle.issues[0].code, 'ANGLE_OUT_OF_RANGE');

  const tau = evolveQuantumState({ tau: QUANTUM_STATE_LIMITS.maxTau + 1 });
  assert.equal(tau.status, 'INVALID');
  assert.equal(tau.issues[0].code, 'TAU_OUT_OF_RANGE');

  const nonFinite = evolveQuantumState({ inversionDegrees: 'ninety' });
  assert.equal(nonFinite.status, 'INVALID');
  assert.equal(nonFinite.issues[0].code, 'NON_FINITE_NUMBER');

  const malformed = evolveQuantumState([1, 2, 3]);
  assert.equal(malformed.status, 'INVALID');
  assert.equal(malformed.issues[0].code, 'INVALID_INPUT');
});

test('POST /v1/ecosystem/quantum/evolve returns a verified local evolution', async () => {
  const app = createApp(':memory:', false);
  try {
    await app.ready();

    const declared = await app.inject({ method: 'GET', url: '/v1/ecosystem/quantum' });
    assert.equal(declared.statusCode, 200);
    assert.equal(declared.json().status, 'EVOLVED');
    assert.equal(declared.json().reality.status, 'VERIFIED');

    const response = await app.inject({
      method: 'POST',
      url: '/v1/ecosystem/quantum/evolve',
      payload: { symmetryDegrees: 60, inversionDegrees: 30, tau: Math.PI / 3 },
    });
    assert.equal(response.statusCode, 200);
    const payload = response.json();
    assert.equal(payload.success, true);
    assert.equal(payload.status, 'EVOLVED');
    assert.equal(payload.reality.status, 'VERIFIED');
    assert.equal(payload.checks.passed, true);
    assert.equal(payload.states.evolved.probabilities.length, 4);
    assert.equal(payload.reality.boundary.includes('not a physical quantum observation'), true);

    // A VERIFIED evolution leaves a receipt in KAI memory; the row keeps the digest.
    assert.equal(payload.receipt.status, 'VERIFIED');
    assert.equal(payload.receipt.evidence_hash, payload.digest);
    assert.equal(payload.receipt.reused, false);
    assert.match(payload.receipt.contract_id, /^[0-9a-f-]{36}$/);

    const repeated = await app.inject({
      method: 'POST',
      url: '/v1/ecosystem/quantum/evolve',
      payload: { symmetryDegrees: 60, inversionDegrees: 30, tau: Math.PI / 3 },
    });
    assert.equal(repeated.statusCode, 200);
    assert.equal(repeated.json().receipt.id, payload.receipt.id);
    assert.equal(repeated.json().receipt.reused, true);

    const memoryBefore = (await app.inject({ method: 'GET', url: '/api/kai/memory?limit=50' })).json();
    const receipts = memoryBefore.records.filter((row: any) => row.intent === 'quantum:evolve:omega.quantum.evolution.v1');
    assert.equal(receipts.length, 1);
    assert.equal(receipts[0].evidence_hash, payload.digest);

    // Rendering the shell uses the read-only GET, which must not write a row.
    const readOnly = await app.inject({ method: 'GET', url: '/v1/ecosystem/quantum' });
    assert.equal(readOnly.statusCode, 200);
    assert.equal(readOnly.json().receipt, undefined);
    const memoryAfter = (await app.inject({ method: 'GET', url: '/api/kai/memory?limit=50' })).json();
    assert.equal(memoryAfter.records.length, memoryBefore.records.length);

    const refused = await app.inject({
      method: 'POST',
      url: '/v1/ecosystem/quantum/evolve',
      payload: { symmetryDegrees: -1 },
    });
    assert.equal(refused.statusCode, 400);
    assert.equal(refused.json().status, 'INVALID');
    assert.equal(refused.json().issues[0].code, 'ANGLE_OUT_OF_RANGE');

    // The receipt keeps the digest, so reconciliation needs the same declared input.
    const reconcileBody = { symmetryDegrees: 60, inversionDegrees: 30, tau: Math.PI / 3 };
    const reconciled = await app.inject({
      method: 'POST',
      url: '/v1/ecosystem/quantum/reconcile',
      payload: { memoryId: payload.receipt.id, ...reconcileBody },
    });
    assert.equal(reconciled.statusCode, 200);
    assert.equal(reconciled.json().status, 'VERIFIED');
    assert.equal(reconciled.json().expected_digest, payload.digest);
    assert.equal(reconciled.json().observed_digest, payload.digest);
    assert.equal(reconciled.json().memory_id, payload.receipt.id);
    assert.equal(reconciled.json().contract_id, payload.receipt.contract_id);
    assert.equal(reconciled.json().checks.digestEquality, true);

    const divergent = await app.inject({
      method: 'POST',
      url: '/v1/ecosystem/quantum/reconcile',
      payload: { memoryId: payload.receipt.id, symmetryDegrees: 60, inversionDegrees: 30, tau: Math.PI / 2 },
    });
    assert.equal(divergent.statusCode, 200);
    assert.equal(divergent.json().status, 'DIVERGENT');
    assert.notEqual(divergent.json().observed_digest, payload.digest);

    const byDigest = await app.inject({
      method: 'POST',
      url: '/v1/ecosystem/quantum/reconcile',
      payload: { digest: payload.digest, ...reconcileBody },
    });
    assert.equal(byDigest.statusCode, 200);
    assert.equal(byDigest.json().status, 'VERIFIED');

    const missing = await app.inject({
      method: 'POST',
      url: '/v1/ecosystem/quantum/reconcile',
      payload: { memoryId: 'no-such-receipt', ...reconcileBody },
    });
    assert.equal(missing.statusCode, 404);
    assert.equal(missing.json().error, 'MEMORY_NOT_FOUND');

    // Nothing to compare against, and a value that is not a digest, stay UNKNOWN.
    const noEvidence = await app.inject({ method: 'POST', url: '/v1/ecosystem/quantum/reconcile', payload: {} });
    assert.equal(noEvidence.statusCode, 400);
    assert.equal(noEvidence.json().status, 'UNKNOWN');
    assert.equal(noEvidence.json().success, false);

    const notADigest = await app.inject({
      method: 'POST',
      url: '/v1/ecosystem/quantum/reconcile',
      payload: { digest: 'not-a-digest', ...reconcileBody },
    });
    assert.equal(notADigest.statusCode, 400);
    assert.equal(notADigest.json().checks.digestFormat, false);
  } finally {
    await app.close();
  }
});

test('reconcileQuantumEvolution reproduces a digest or reports the divergence', () => {
  const declared = { symmetryDegrees: 120, inversionDegrees: 45, tau: Math.PI };
  const evolved = evolveQuantumState(declared);
  assert.equal(evolved.status, 'EVOLVED');

  const same = reconcileQuantumEvolution(evolved.state.digest, declared);
  assert.equal(same.status, 'VERIFIED');
  assert.equal(same.observedDigest, evolved.state.digest);

  const moved = reconcileQuantumEvolution(evolved.state.digest, { ...declared, tau: 0 });
  assert.equal(moved.status, 'DIVERGENT');
  assert.notEqual(moved.observedDigest, evolved.state.digest);

  const refused = reconcileQuantumEvolution(evolved.state.digest, { tau: -1 });
  assert.equal(refused.status, 'UNKNOWN');
  assert.equal(refused.issues[0].code, 'TAU_OUT_OF_RANGE');

  const malformed = reconcileQuantumEvolution(42, declared);
  assert.equal(malformed.status, 'UNKNOWN');
  assert.equal(malformed.checks.digestFormat, false);
});
