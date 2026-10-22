import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarizeWaterFlow, WATER_FLOW_STAGES, type WaterFlowFrameView } from '../water-flow-panel-model.ts';

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

import { summarizeRuntimeObservation } from '../runtime-observation-model.ts';

test('runtime observation displays supplied client state without inferring verification', () => {
  const summary = summarizeRuntimeObservation({
    streamConnected: true,
    tipHash: '0123456789abcdef0123456789abcdef',
    tipTimestamp: '2026-10-22T00:00:00Z',
    evidenceStatus: null,
    ledgerIntegrity: { valid: false, height: 7, reason: 'test fixture' },
    historyCount: 3,
    simulationMode: true,
    commandId: 'omega-cmd-42',
    commandStatus: 'DIVERGENT',
    admissionDecision: 'ALLOW',
    realityClassification: 'DIVERGENT',
  });

  assert.equal(summary.streamConnected, true);
  assert.equal(summary.rows.find((row) => row.label === 'Latest record')?.value, '0123456789abcdef…');
  assert.equal(summary.rows.find((row) => row.label === 'Evidence status')?.value, 'Unavailable');
  assert.equal(summary.rows.find((row) => row.label === 'Ledger integrity')?.value, 'Integrity invalid · height 7');
  assert.equal(summary.rows.find((row) => row.label === 'Simulation flag')?.value, 'Enabled');
  assert.equal(summary.rows.find((row) => row.label === 'Omega command ID')?.value, 'omega-cmd-42');
  assert.equal(summary.rows.find((row) => row.label === 'Command status')?.value, 'DIVERGENT');
  assert.equal(summary.rows.find((row) => row.label === 'Admission decision')?.value, 'ALLOW');
  assert.equal(summary.rows.find((row) => row.label === 'Reality classification')?.value, 'DIVERGENT');
  assert.equal(summary.rows.some((row) => row.value === 'VERIFIED'), false);
});

test('missing runtime values remain unavailable rather than successful', () => {
  const summary = summarizeRuntimeObservation({
    streamConnected: false,
    historyCount: 0,
    simulationMode: false,
  });

  assert.equal(summary.streamConnected, false);
  assert.equal(summary.rows.find((row) => row.label === 'Latest record')?.value, 'Unavailable');
  assert.equal(summary.rows.find((row) => row.label === 'Ledger integrity')?.value, 'Unavailable');
  assert.equal(summary.rows.find((row) => row.label === 'Omega command ID')?.value, 'Unavailable');
  assert.equal(summary.rows.find((row) => row.label === 'Command status')?.value, 'Unavailable');
  assert.equal(summary.rows.find((row) => row.label === 'Admission decision')?.value, 'Unavailable');
  assert.equal(summary.rows.find((row) => row.label === 'Reality classification')?.value, 'Unavailable');
});
