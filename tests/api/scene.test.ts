import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sceneStates, simulateScene } from '../../apps/api/src/scene.ts';

/**
 * Converted from apps/api/src/__tests__/scene.test.ts, which ran under Jest
 * and never executed in CI. It also hid a real defect: scene.ts imported its
 * runtime guard under `import type`, so every simulateScene call threw. This
 * suite runs the module directly, so a regression of that kind fails here.
 */
describe('Ω∞v scene equation simulation', () => {
  it('walks the complete bounded equation deterministically', () => {
    const first = simulateScene({ seed: 'opening-scene' });
    const second = simulateScene({ seed: 'opening-scene' });

    assert.deepEqual(first.states, sceneStates());
    assert.equal(first.terminalState, 'return');
    assert.equal(first.trace.length, 13);
    assert.partialDeepStrictEqual(first.trace[0], { state: 'darkness', status: 'observed' });
    assert.partialDeepStrictEqual(first.trace[0], {
      from: null,
      to: 'darkness',
      transition: 'origin',
    });
    assert.partialDeepStrictEqual(first.trace[1], {
      from: 'darkness',
      to: 'possibility',
      transition: 'advance',
    });
    assert.partialDeepStrictEqual(first.trace.at(-1), { state: 'return', status: 'verified' });
    assert.deepEqual(
      first.trace.map((entry) => entry.evidence),
      second.trace.map((entry) => entry.evidence),
    );
    assert.partialDeepStrictEqual(first.provenance, {
      source: 'local-simulation',
      ruleVersion: 'scene-equation.v2',
      deterministic: true,
      verified: false,
    });
  });

  it('supports a bounded prefix and rejects unsafe step counts', () => {
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

  it('generates deterministic bounded perspectives over infinite potential', () => {
    const first = simulateScene({ seed: 'multiverse', steps: 5, branches: 3 });
    const second = simulateScene({ seed: 'multiverse', steps: 5, branches: 3 });

    assert.equal(first.branchCount, 3);
    assert.equal(first.branches.length, 3);
    assert.equal(first.continuation, 'bounded-sample-of-infinite-potential');
    assert.deepEqual(
      first.branches.map((branch) => branch.perspective),
      ['point-of-view-1', 'point-of-view-2', 'point-of-view-3'],
    );
    assert.deepEqual(
      first.branches.map((branch) => branch.states),
      second.branches.map((branch) => branch.states),
    );
    assert.ok(first.branches.every((branch) => branch.states.length === 5));
    assert.deepEqual(first.branches[0].states, first.states);
    assert.notEqual(first.branches[1].divergenceEvidence, first.branches[2].divergenceEvidence);
    assert.throws(() => simulateScene({ branches: 0 }), /between 1 and 8/);
    assert.throws(() => simulateScene({ branches: 9 }), /between 1 and 8/);
    assert.throws(() => simulateScene({ branches: 1.5 }), /between 1 and 8/);
  });

  it('falls back to the default seed and full walk when called with no input at all', () => {
    // Omitting the argument entirely is what exercises simulateScene's own
    // default parameter, distinct from boundedSeed's fallback for an
    // undefined seed field.
    const result = simulateScene();

    assert.equal(result.seed, 'omega-v-scene');
    assert.deepEqual(result.states, sceneStates());
    assert.equal(result.terminalState, 'return');
  });
});
