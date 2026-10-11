import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  normalizeWaterFlowFrames,
  summarizeWaterFlow,
  WATER_FLOW_STAGES,
  type WaterFlowFrameView,
} from '../water-flow-panel-model.ts';

const frame = (stage: WaterFlowFrameView['stage'], sequence: number): WaterFlowFrameView => ({
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

test('empty water-flow view remains NOT_EXECUTED', () => {
  const summary = summarizeWaterFlow(null);
  assert.equal(summary.status, 'NOT_EXECUTED');
  assert.deepEqual(summary.stages, []);
  assert.match(summary.note, /No pipeline receipt supplied/);
});

test('bounded local frames remain UNKNOWN rather than VERIFIED', () => {
  const summary = summarizeWaterFlow([frame('REALITY', 0), frame('ATTENTION', 1), frame('INTENTION', 2)]);
  assert.equal(summary.status, 'UNKNOWN');
  assert.deepEqual(summary.stages, ['REALITY', 'ATTENTION', 'INTENTION']);
  assert.equal(summary.maxSteps, 3);
  assert.equal(summary.traceId, 'trace-local-1');
});

test('receipt normalization rejects malformed or unknown frames', () => {
  const valid = [frame('REALITY', 0)];
  assert.deepEqual(normalizeWaterFlowFrames(valid), valid);
  assert.equal(normalizeWaterFlowFrames([{ ...valid[0], stage: 'UNKNOWN_STAGE' }]), null);
  assert.equal(normalizeWaterFlowFrames([{ ...valid[0], provenance: { ...valid[0].provenance, verified: true } }]), null);
  assert.equal(normalizeWaterFlowFrames('not-a-receipt'), null);
});

test('canonical stage order is finite and explicit', () => {
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
});
