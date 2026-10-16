import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canExecuteOmegaDecision,
  canPromoteOmegaReality,
  classifyOmegaReality,
  validateOmegaChangeTuple,
} from '../../packages/types/dist/index.js';

test('change calculus keeps DENY and REVIEW non-executable', () => {
  assert.equal(canExecuteOmegaDecision('DENY', false), false);
  assert.equal(canExecuteOmegaDecision('REVIEW', true), false);
  assert.equal(canExecuteOmegaDecision('ALLOW', false), false);
  assert.equal(canExecuteOmegaDecision('ALLOW', true), true);
});

test('change calculus refuses to promote missing evidence into VERIFIED', () => {
  assert.equal(canPromoteOmegaReality('UNKNOWN', 'VERIFIED'), false);
  assert.equal(canPromoteOmegaReality('DIVERGENT', 'VERIFIED'), true);
  assert.equal(classifyOmegaReality({
    authorized: true,
    executed: true,
    observed: true,
    expectedMatchesActual: true,
    evidenceValid: true,
    provenanceIntact: true,
  }), 'VERIFIED');
  assert.equal(classifyOmegaReality({
    authorized: true,
    executed: true,
    observed: false,
    expectedMatchesActual: true,
    evidenceValid: true,
    provenanceIntact: true,
  }), 'UNKNOWN');
  assert.equal(classifyOmegaReality({
    authorized: true,
    executed: false,
    observed: false,
    expectedMatchesActual: null,
    evidenceValid: false,
    provenanceIntact: true,
  }), 'NOT_EXECUTED');
});

test('change calculus validates the minimum typed tuple boundary', () => {
  assert.doesNotThrow(() => validateOmegaChangeTuple({
    state: 'S0',
    intent: 'advance state',
    evidence: ['observation-1'],
    authority: 'human:operator',
    policy: 'policy:v1',
    context: { source: 'integration-test' },
  }));
  assert.throws(
    () => validateOmegaChangeTuple({
      state: 'S0',
      intent: '',
      evidence: [],
      authority: null,
      policy: null,
      context: {},
    }),
    /change tuple intent is required/,
  );
});
