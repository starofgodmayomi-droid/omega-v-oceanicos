import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  projectCommandWaterFlow,
  projectWaterFlowFrames,
  summarizeWaterFlow,
  WATER_FLOW_STAGES,
  type WaterFlowFrameView,
} from '../water-flow-panel-model.ts';

const frame = (stage: WaterFlowFrameView['stage'], sequence: number, verified = false): WaterFlowFrameView => ({
  stage,
  sequence,
  state: `state-${sequence}`,
  transition: `transition-${sequence}`,
  traceId: 'trace-local-1',
  deterministic: true,
  bounds: { maxSteps: 3 },
  provenance: {
    source: 'local-water-flow',
    verified,
    note: 'finite local representation',
  },
});

const apiFrame = (stage: (typeof WATER_FLOW_STAGES)[number], sequence: number, maxSteps: number) => ({
  flowVersion: 'omega.water-flow.v1',
  sequence,
  stage,
  state: 'S0',
  transition: sequence === 0 ? 'observe:S0' : 'attention:advance',
  traceId: 'omega-water-flow-api-1',
  deterministic: true as const,
  bounds: { maxSteps },
  provenance: {
    source: 'local-water-flow' as const,
    verified: false,
    note: 'Bounded symbolic local-simulation evidence; not physical-world observation or external execution.',
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

test('a command water-flow receipt is admitted without becoming VERIFIED', () => {
  const waterFlow = WATER_FLOW_STAGES.map((stage, sequence) => apiFrame(stage, sequence, WATER_FLOW_STAGES.length));
  const projected = projectCommandWaterFlow({ command: { status: 'REVIEW' }, waterFlow });
  assert.ok(projected);
  assert.equal(projected.length, 8);
  assert.equal(summarizeWaterFlow(projected).status, 'UNKNOWN');
  assert.equal(projected.every((item) => item.provenance.verified === false), true);
});

test('a verified flag on a local frame stays DIVERGENT', () => {
  const projected = projectWaterFlowFrames([
    { ...apiFrame('REALITY', 0, 1), provenance: { ...apiFrame('REALITY', 0, 1).provenance, verified: true } },
  ]);
  assert.equal(summarizeWaterFlow(projected).status, 'DIVERGENT');
});

test('a missing, reordered, or foreign receipt is not painted', () => {
  assert.equal(projectCommandWaterFlow(null), null);
  assert.equal(projectCommandWaterFlow({ status: 'REVIEW' }), null);
  assert.equal(projectWaterFlowFrames([]), null);
  assert.equal(projectWaterFlowFrames([apiFrame('ATTENTION', 0, 1)]), null);
  assert.equal(
    projectWaterFlowFrames([{ ...apiFrame('REALITY', 0, 1), provenance: { source: 'remote', verified: false, note: 'no' } }]),
    null,
  );
});

test('the gate names this water panel and does not mark the upgrade executed', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  for (const name of ['test', 'test:e2e'] as const) {
    assert.match(manifest.scripts[name], /water-flow-panel\.test\.ts/);
    assert.doesNotMatch(manifest.scripts[name], /upgrade\.execution\s*=\s*VERIFIED/);
  }
});
