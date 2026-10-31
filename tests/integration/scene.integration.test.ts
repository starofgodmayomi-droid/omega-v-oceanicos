import assert from 'node:assert/strict';
import test from 'node:test';
import { sceneStates, simulateScene } from '../../apps/api/src/scene.ts';

/*
 * Ω∞v scene equation — a bounded, deterministic walk over declared states.
 * Migrated from apps/api/src/__tests__/scene.test.ts (Jest, never run in this
 * workspace) onto node:test. `scene.ts` is not reachable from the API entry
 * point, so it is imported from source rather than from `dist`.
 */

test('walks the complete bounded equation deterministically', () => {
  const first = simulateScene({ seed: 'opening-scene' });
  const second = simulateScene({ seed: 'opening-scene' });

  assert.deepEqual(first.states, sceneStates());
  assert.equal(first.terminalState, 'return');
  assert.equal(first.trace.length, 13);
  assert.equal(first.trace[0].state, 'darkness');
  assert.equal(first.trace[0].status, 'observed');
  assert.equal(first.trace[0].from, null);
  assert.equal(first.trace[0].to, 'darkness');
  assert.equal(first.trace[0].transition, 'origin');
  assert.equal(first.trace[1].from, 'darkness');
  assert.equal(first.trace[1].to, 'possibility');
  assert.equal(first.trace[1].transition, 'advance');
  assert.equal(first.trace[first.trace.length - 1].state, 'return');
  assert.equal(first.trace[first.trace.length - 1].status, 'verified');
  assert.deepEqual(
    first.trace.map((entry) => entry.evidence),
    second.trace.map((entry) => entry.evidence),
    'the same seed must produce the same evidence'
  );
  assert.equal(first.provenance.source, 'local-simulation');
  assert.equal(first.provenance.ruleVersion, 'scene-equation.v2');
  assert.equal(first.provenance.deterministic, true);
  assert.equal(first.provenance.verified, false);
});

test('supports a bounded prefix and rejects unsafe step counts', () => {
  assert.deepEqual(simulateScene({ seed: 'prefix', steps: 4 }).states, [
    'darkness',
    'possibility',
    'ocean',
    'star',
  ]);
  assert.throws(() => simulateScene({ steps: 0 }), /between 1 and 32/);
  assert.throws(() => simulateScene({ steps: 33 }), /between 1 and 32/);
  assert.throws(() => simulateScene({ steps: 1.5 }), /between 1 and 32/);
});

test('generates deterministic bounded perspectives over infinite potential', () => {
  const first = simulateScene({ seed: 'multiverse', steps: 5, branches: 3 });
  const second = simulateScene({ seed: 'multiverse', steps: 5, branches: 3 });

  assert.equal(first.branchCount, 3);
  assert.equal(first.branches.length, 3);
  assert.equal(first.continuation, 'bounded-sample-of-infinite-potential');
  assert.deepEqual(
    first.branches.map((branch) => branch.perspective),
    ['point-of-view-1', 'point-of-view-2', 'point-of-view-3']
  );
  assert.deepEqual(
    first.branches.map((branch) => branch.states),
    second.branches.map((branch) => branch.states)
  );
  assert.ok(first.branches.every((branch) => branch.states.length === 5));
  assert.deepEqual(first.branches[0].states, first.states);
  assert.notEqual(first.branches[1].divergenceEvidence, first.branches[2].divergenceEvidence);
  assert.throws(() => simulateScene({ branches: 0 }), /between 1 and 8/);
  assert.throws(() => simulateScene({ branches: 9 }), /between 1 and 8/);
  assert.throws(() => simulateScene({ branches: 1.5 }), /between 1 and 8/);
});

test('falls back to the default seed and full walk when called with no input at all', () => {
  // Every other call passes an explicit input object. Omitting it entirely is
  // what exercises simulateScene's own default parameter, distinct from the
  // internal fallback for an undefined seed field.
  const result = simulateScene();

  assert.equal(result.seed, 'omega-v-scene');
  assert.deepEqual(result.states, sceneStates());
  assert.equal(result.terminalState, 'return');
});
