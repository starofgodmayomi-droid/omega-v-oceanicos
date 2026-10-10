import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarizeLucidFieldWater } from '../lucid-field-water-panel-model.ts';
import type { WaterFlowFrameView } from '../water-flow-panel-model.ts';

const frame = (stage: WaterFlowFrameView['stage'], sequence: number): WaterFlowFrameView => ({
  flowVersion: 'omega.water-flow.v1',
  stage,
  sequence,
  state: `state-${sequence}`,
  transition: `transition-${sequence}`,
  traceId: 'trace-lucid-11-11',
  deterministic: true,
  bounds: { maxSteps: 3 },
  provenance: { source: 'local-water-flow', verified: false, note: 'finite local representation' },
});

test('Field and Water compose only the supplied source signals and command receipt', () => {
  const signals = [
    { label: 'Runtime stream', status: 'verified', source: 'SSE connection observed' },
    { label: 'CI', status: 'not queried', source: 'hosted CI is not queried by this screen' },
    { label: 'External systems', status: 'unknown', source: 'no external authority inferred' },
  ];
  const summary = summarizeLucidFieldWater(signals, { waterFlow: [
    frame('REALITY', 0), frame('INTENTION', 1), frame('ACTION', 2),
  ] });

  assert.equal(summary.field.total, 3);
  assert.equal(summary.field.verifiedCount, 1);
  assert.deepEqual(summary.field.unresolved.map(({ label, status }) => ({ label, status })), [
    { label: 'CI', status: 'UNKNOWN' },
    { label: 'External systems', status: 'UNKNOWN' },
  ]);
  assert.equal(summary.water.status, 'UNKNOWN');
  assert.equal(summary.frames?.length, 3);
  assert.equal(summary.water.livingWaterSteps.find((step) => step.stage === 'SOURCE')?.status, 'MODEL_ONLY');
  assert.equal(summary.water.livingWaterSteps.find((step) => step.stage === 'DROP')?.status, 'MODEL_ONLY');
  assert.equal(summary.water.livingWaterSteps.find((step) => step.stage === 'VERIFY')?.status, 'UNKNOWN');
  assert.equal(summary.water.livingWaterSteps.find((step) => step.stage === 'RECONCILE')?.status, 'UNKNOWN');
});

test('no command receipt keeps every Living Water stage NOT_EXECUTED', () => {
  const summary = summarizeLucidFieldWater([], null);
  assert.equal(summary.field.total, 0);
  assert.equal(summary.frames, null);
  assert.equal(summary.water.status, 'NOT_EXECUTED');
  assert.ok(summary.water.livingWaterSteps.every((step) => step.status === 'NOT_EXECUTED'));
  assert.match(summary.water.note, /No active command receipt/);
});

test('invalid provenance stays DIVERGENT without changing the independent field summary', () => {
  const untrusted = {
    ...frame('REALITY', 0),
    provenance: { source: 'external' as 'local-water-flow', verified: true as false, note: 'untrusted' },
  };
  const summary = summarizeLucidFieldWater(
    [{ label: 'Runtime stream', status: 'verified', source: 'SSE connection observed' }],
    { waterFlow: [untrusted] },
  );
  assert.equal(summary.field.verifiedCount, 1);
  assert.equal(summary.water.status, 'DIVERGENT');
  assert.ok(summary.water.livingWaterSteps.every((step) => step.status === 'DIVERGENT'));
});
