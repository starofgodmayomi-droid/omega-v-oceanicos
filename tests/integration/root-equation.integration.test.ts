import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  admitRootEquationAction,
  readRootEquation,
  ROOT_EQUATION_LAYERS,
  ROOT_EQUATION_STEPS,
} from '../../packages/mini/src/root-equation.ts';

const proposal = {
  step: 'EXECUTE' as const,
  autonomyRequested: true,
  authorityGranted: true,
  claim: 'a local contract check passed',
  evidenceRef: 'node --test tests/integration/root-equation.integration.test.ts',
  measurableValue: 'the equation can refuse an over-claim and still not execute',
};

test('reads the supplied root equation without starting it', () => {
  const reading = readRootEquation();
  assert.equal(reading.execution, 'NOT_STARTED');
  assert.equal(reading.evidence, 'SUPPLIED_SOURCE_ONLY');
  assert.equal(reading.factors.autopus, 'NOT_A_RUNTIME');
  assert.equal(reading.factors.lightSpirit, 'SYMBOL');
  assert.equal(reading.factors.connectedAi, 'UNKNOWN_UNTIL_OBSERVED');
  assert.equal(reading.layers.length, 11);
  assert.equal(reading.steps.length, 11);
  assert.deepEqual(reading.layers, ROOT_EQUATION_LAYERS);
  assert.deepEqual(reading.steps, ROOT_EQUATION_STEPS);
  assert.equal(reading.invariants.autonomyAtMostGrantedAuthority, true);
  assert.equal(reading.invariants.claimsAtMostVerifiedEvidence, true);
  assert.equal(reading.invariants.everyActionNamesMeasurableValue, true);
});

test('a named EXECUTE step is still only a record', () => {
  const admitted = admitRootEquationAction(proposal);
  assert.equal(admitted.decision, 'ALLOW_RECORD_ONLY');
  assert.equal(admitted.execution, 'NOT_STARTED');
  assert.equal(admitted.verification, 'NOT_PERFORMED');
  if (admitted.decision !== 'ALLOW_RECORD_ONLY') throw new Error('expected record-only admission');
  assert.equal(admitted.step, 'EXECUTE');
});

test('denies autonomy beyond granted authority', () => {
  const denied = admitRootEquationAction({ ...proposal, authorityGranted: false });
  assert.equal(denied.decision, 'DENY');
  if (denied.decision !== 'DENY') throw new Error('expected denial');
  assert.equal(denied.reason, 'AUTONOMY_EXCEEDS_AUTHORITY');
  assert.equal(denied.execution, 'NOT_STARTED');
});

test('denies a claim with no evidence pointer', () => {
  const denied = admitRootEquationAction({ ...proposal, evidenceRef: null });
  assert.equal(denied.decision, 'DENY');
  if (denied.decision !== 'DENY') throw new Error('expected denial');
  assert.equal(denied.reason, 'CLAIM_EXCEEDS_EVIDENCE');
});

test('denies an action that names no measurable value', () => {
  const denied = admitRootEquationAction({ ...proposal, measurableValue: '   ' });
  assert.equal(denied.decision, 'DENY');
  if (denied.decision !== 'DENY') throw new Error('expected denial');
  assert.equal(denied.reason, 'VALUE_NOT_NAMED');
});

test('denies a caller trying to mark the step verified or executed', () => {
  const denied = admitRootEquationAction({ ...proposal, verified: true, executed: true });
  assert.equal(denied.decision, 'DENY');
  if (denied.decision !== 'DENY') throw new Error('expected denial');
  assert.equal(denied.reason, 'UNSUPPORTED_FIELD');
  assert.equal(admitRootEquationAction(null).decision, 'DENY');
});
