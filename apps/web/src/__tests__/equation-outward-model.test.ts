import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarizeEquationFixpoint } from '../equation-outward-model.ts';

test('a missing fixpoint stays absent', () => {
  const summary = summarizeEquationFixpoint(undefined);
  assert.equal(summary.status, 'ABSENT');
  assert.equal(summary.surfaces.length, 0);
  assert.equal(summary.evidenceScope, 'UNKNOWN');
});

test('only outward rays are shown, and the evidence scope is preserved', () => {
  const summary = summarizeEquationFixpoint({
    evidenceScope: 'LOCAL_STRUCTURE_ONLY',
    admitted: 1,
    halted: 0,
    boundary: 'not a reality claim',
    expansion: [
      { id: 'change-pipeline', surface: 'kernel', entry: 'runOmegaChangePipeline', arm: 'CONTINUE', source: 'packages/mini/src/pipeline.ts', direction: 'outward' },
      { id: 'dropped', surface: 'web', entry: 'nope', arm: 'CONTINUE', direction: 'inward' },
    ],
  });
  assert.equal(summary.status, 'READY');
  assert.equal(summary.admitted, 1);
  assert.equal(summary.halted, 0);
  assert.equal(summary.evidenceScope, 'LOCAL_STRUCTURE_ONLY');
  assert.deepEqual(summary.surfaces.map((ray) => ray.id), ['change-pipeline']);
});
