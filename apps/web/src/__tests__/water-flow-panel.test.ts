import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LIVING_WATER_STAGES,
  WATER_FLOW_STAGES,
  summarizeWaterFlow,
  waterFlowFramesFromCommand,
  type WaterFlowFrameView,
} from '../water-flow-panel-model.ts';

const frame = (stage: WaterFlowFrameView['stage'], sequence: number): WaterFlowFrameView => ({
  flowVersion: 'omega.water-flow.v1',
  stage,
  sequence,
  state: `state-${sequence}`,
  transition: `transition-${sequence}`,
  traceId: 'trace-local-1',
  deterministic: true,
  bounds: { maxSteps: 3 },
  provenance: {
    source: 'local-water-flow',
    verified: false,
    note: 'finite local representation',
  },
});

test('active command receipt supplies its water-flow frames to the panel', () => {
  const frames = [frame('REALITY', 0), frame('INTENTION', 1)];
  assert.equal(waterFlowFramesFromCommand({ waterFlow: frames }), frames);
  assert.equal(waterFlowFramesFromCommand(null), null);
  assert.equal(waterFlowFramesFromCommand({}), null);
});

test('an absent receipt remains NOT_EXECUTED and does not imply a Living Water step happened', () => {
  const summary = summarizeWaterFlow(waterFlowFramesFromCommand(null));
  assert.equal(summary.status, 'NOT_EXECUTED');
  assert.deepEqual(summary.stages, []);
  assert.ok(summary.livingWaterSteps.every((step) => step.status === 'NOT_EXECUTED'));
  assert.match(summary.note, /No active command receipt/);
});

test('bounded local frames remain UNKNOWN and only map to MODEL_ONLY steps', () => {
  const summary = summarizeWaterFlow([frame('REALITY', 0), frame('ATTENTION', 1), frame('INTENTION', 2)]);
  assert.equal(summary.status, 'UNKNOWN');
  assert.deepEqual(summary.stages, ['REALITY', 'ATTENTION', 'INTENTION']);
  assert.equal(summary.maxSteps, 3);
  assert.equal(summary.traceId, 'trace-local-1');
  assert.equal(summary.livingWaterSteps.find((step) => step.stage === 'SOURCE')?.status, 'MODEL_ONLY');
  assert.equal(summary.livingWaterSteps.find((step) => step.stage === 'DROP')?.status, 'MODEL_ONLY');
  assert.equal(summary.livingWaterSteps.find((step) => step.stage === 'VERIFY')?.status, 'UNKNOWN');
  assert.equal(summary.livingWaterSteps.find((step) => step.stage === 'RECONCILE')?.status, 'UNKNOWN');
  assert.equal(summary.livingWaterSteps.find((step) => step.stage === 'REMEMBER')?.status, 'UNKNOWN');
  assert.equal(summary.livingWaterSteps.find((step) => step.stage === 'NEW_DROP')?.status, 'UNKNOWN');
  assert.match(summary.note, /not proof of execution, observation, or verification/);
});

test('Living Water stages preserve the requested sequence separately from v1 machine stages', () => {
  assert.deepEqual(LIVING_WATER_STAGES, [
    'SOURCE',
    'DROP',
    'FLOW',
    'CONTACT',
    'OBSERVE',
    'REFLECT',
    'VERIFY',
    'CHANGE',
    'RECONCILE',
    'REMEMBER',
    'RETURN',
    'NEW_DROP',
  ]);
  assert.deepEqual(WATER_FLOW_STAGES, [
    'REALITY',
    'ATTENTION',
    'INTENTION',
    'ACTION',
    'CONSEQUENCE',
    'OBSERVATION',
    'LEARNING',
    'RETURN',
  ]);
  assert.equal(LIVING_WATER_STAGES.length, 12);
});

test('a provenance mismatch is DIVERGENT, never promoted to VERIFIED', () => {
  const inconsistent = {
    ...frame('REALITY', 0),
    provenance: { source: 'external' as 'local-water-flow', verified: true as false, note: 'untrusted mismatch' },
  };
  const summary = summarizeWaterFlow([inconsistent]);
  assert.equal(summary.status, 'DIVERGENT');
  assert.ok(summary.livingWaterSteps.every((step) => step.status === 'DIVERGENT'));
});

test('an unrecognized receipt version is DIVERGENT rather than silently mapped', () => {
  const futureVersion = { ...frame('REALITY', 0), flowVersion: 'omega.water-flow.v2' as 'omega.water-flow.v1' };
  assert.equal(summarizeWaterFlow([futureVersion]).status, 'DIVERGENT');
});
