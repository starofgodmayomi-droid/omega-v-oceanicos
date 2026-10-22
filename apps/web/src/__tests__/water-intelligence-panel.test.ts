import { describe, expect, it } from '@jest/globals';
import { summarizeWaterFlow, type WaterFlowFrameView } from '../water-flow-panel-model';

const frame = (stage: WaterFlowFrameView['stage']): WaterFlowFrameView => ({
  stage,
  sequence: 0,
  state: 'local',
  transition: 'local',
  traceId: 'trace-local-1',
  deterministic: true,
  bounds: { maxSteps: 1 },
  provenance: {
    source: 'local-water-flow',
    verified: false,
    note: 'finite local representation',
  },
});

describe('water-flow panel skin', () => {
  it('does not paint an empty receipt as verified water', () => {
    const summary = summarizeWaterFlow(null);
    expect(summary.status).toBe('NOT_EXECUTED');
    expect(summary.skin.visualClaim).toBe('held');
    expect(summary.skin.behaviors.FLOW).toBe('withheld');
    expect(summary.skin.behaviors.STILL).toBe('withheld');
  });

  it('keeps unverified local frames unknown instead of still', () => {
    const summary = summarizeWaterFlow([frame('REALITY')]);
    expect(summary.status).toBe('UNKNOWN');
    expect(summary.skin.visualClaim).toBe('unknown');
    expect(summary.skin.behaviors.STILL).toBe('withheld');
    expect(summary.skin.behaviors.TURBULENCE).toBe('withheld');
    expect(summary.skin.behaviors.CONTAINMENT).toBe('shown');
  });
});
