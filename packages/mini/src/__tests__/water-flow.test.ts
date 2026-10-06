import { describe, expect, it } from '@jest/globals';
import { buildOmegaWaterFlow } from '../water-flow';

describe('KAI water-of-reality flow', () => {
  it('builds a deterministic bounded trace with explicit provenance', () => {
    const input = { state: 'ready', intent: 'advance one useful slice', traceId: 'trace-test' };
    const first = buildOmegaWaterFlow(input);
    const second = buildOmegaWaterFlow(input);

    expect(first).toEqual(second);
    expect(first).toHaveLength(8);
    expect(first.map((frame) => frame.stage)).toEqual([
      'REALITY',
      'ATTENTION',
      'INTENTION',
      'ACTION',
      'CONSEQUENCE',
      'OBSERVATION',
      'LEARNING',
      'RETURN',
    ]);
    expect(first.at(-1)?.provenance.verified).toBe(false);
    expect(first.every((frame) => frame.deterministic)).toBe(true);
  });

  it('allows a finite prefix but rejects unbounded or invalid bounds', () => {
    expect(buildOmegaWaterFlow({ state: 'ready', intent: 'inspect', maxSteps: 3 })).toHaveLength(3);
    expect(() => buildOmegaWaterFlow({ state: 'ready', intent: 'inspect', maxSteps: 0 })).toThrow();
    expect(() => buildOmegaWaterFlow({ state: 'ready', intent: 'inspect', maxSteps: 9 })).toThrow();
    expect(() => buildOmegaWaterFlow({ state: '', intent: 'inspect' })).toThrow('state is required');
  });
});
