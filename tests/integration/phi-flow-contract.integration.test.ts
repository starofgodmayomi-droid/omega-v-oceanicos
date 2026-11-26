/**
 * Φ-flow contract gate.
 *
 * This test is the permanent guard for the Δ12 collapse: four spreads into one
 * key, only F4 surviving. It fails if any of F1–F4 is dropped, if phi grows
 * adapter-specific keys, or if an adapter claims more than OBSERVED.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEEPAGENTS_ADAPTER,
  PHI_LAWS,
  PhiFlowContractError,
  adaptDeepAgentObservation,
  assertPhiFlow,
  deepAgentObservationToPhi,
  isPhiFlow,
  missingPhiLaws,
  unexpectedPhiKeys,
} from '../../packages/mini/dist/index.js';

const observation = {
  intent: '  make the phi contract observable  ',
  steps: ['observe', 'adapt', 'reconcile'],
  reflections: ['expected ≡ observed'],
  evidence: { source: 'deep-agent-run', exitCode: 0 },
};

test('Φ adapter returns ONE phi object carrying all four laws', () => {
  const record = adaptDeepAgentObservation(observation);

  // One nested phi object, not four sibling keys.
  assert.deepEqual(Object.keys(record).sort(), ['adapter', 'observedAt', 'phi', 'status']);
  assert.deepEqual(Object.keys(record.phi).sort(), ['F1', 'F2', 'F3', 'F4']);
  for (const law of PHI_LAWS) {
    assert.ok(law in record.phi, `${law} missing from phi`);
    assert.equal(law in record, false, `${law} leaked to the record's top level`);
  }

  assert.equal(record.adapter, DEEPAGENTS_ADAPTER);
  assert.equal(record.status, 'OBSERVED');
  assert.notEqual(record.status, 'VERIFIED');
  assert.equal(record.phi.F1, observation.intent.trim());
  assert.deepEqual(record.phi.F2, observation.steps); // order is meaning
  assert.deepEqual(record.phi.F3, observation.reflections);
  assert.match(record.phi.F4, /^[0-9a-f]{64}$/);

  assert.ok(isPhiFlow(record.phi));
  assertPhiFlow(record.phi); // does not throw
});

test('Δ12 permanent guard: dropping any single law is refused', () => {
  const phi = deepAgentObservationToPhi(observation);

  for (const law of PHI_LAWS) {
    const collapsed: Record<string, unknown> = { ...phi };
    delete collapsed[law];

    assert.deepEqual(missingPhiLaws(collapsed), [law], `missing ${law} not reported`);
    assert.equal(isPhiFlow(collapsed), false, `${law} collapse accepted`);
    assert.throws(
      () => assertPhiFlow(collapsed),
      (error: unknown) => error instanceof PhiFlowContractError && error.missing.includes(law),
      `${law} collapse did not throw`
    );
  }
});

test('only F4 surviving is refused (the exact Δ12 bug)', () => {
  const phi = deepAgentObservationToPhi(observation);
  const onlyF4 = { F4: phi.F4 };

  assert.deepEqual(missingPhiLaws(onlyF4), ['F1', 'F2', 'F3']);
  assert.equal(isPhiFlow(onlyF4), false);
  assert.throws(() => assertPhiFlow(onlyF4), PhiFlowContractError);
});

test('phi is exactly F1–F4; adapter keys stay outside', () => {
  const phi = deepAgentObservationToPhi(observation);
  const leaked = { ...phi, adapter: DEEPAGENTS_ADAPTER };

  assert.deepEqual(unexpectedPhiKeys(leaked), ['adapter']);
  assert.equal(isPhiFlow(leaked), false);
  assert.throws(() => assertPhiFlow(leaked), PhiFlowContractError);
});

test('F4 is the incompressible witness: any change changes the digest', () => {
  const base = deepAgentObservationToPhi(observation);
  const changed = deepAgentObservationToPhi({ ...observation, steps: ['observe', 'adapt'] });

  assert.equal(changed.F1, base.F1);
  assert.notEqual(changed.F4, base.F4);
  assert.deepEqual(changed.F2, ['observe', 'adapt']);
});

test('no phi without F1; absent reflection is preserved as empty, not invented', () => {
  assert.throws(
    () => deepAgentObservationToPhi({ intent: '   ', steps: ['observe'] }),
    (error: unknown) => error instanceof PhiFlowContractError && error.missing.includes('F1')
  );

  const noReflection = deepAgentObservationToPhi({ intent: 'observe only', steps: ['observe'] });
  assert.deepEqual(noReflection.F3, []);
  assert.ok(isPhiFlow(noReflection));
});

test('a non-object carries none of the laws', () => {
  assert.deepEqual(missingPhiLaws(null), [...PHI_LAWS]);
  assert.deepEqual(missingPhiLaws('phi'), [...PHI_LAWS]);
});
