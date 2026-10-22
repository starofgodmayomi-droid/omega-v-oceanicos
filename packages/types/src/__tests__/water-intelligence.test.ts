import { describe, expect, it } from '@jest/globals';
import { deriveWaterIntelligence, WATER_BEHAVIORS } from '../water-intelligence';

describe('water intelligence skin', () => {
  it('never shows a verified glow unless the status is VERIFIED', () => {
    for (const status of ['DIVERGENT', 'UNKNOWN', 'NOT_EXECUTED'] as const) {
      const skin = deriveWaterIntelligence({
        status,
        sourceCount: 4,
        eventCount: 3,
        dependencyCount: 2,
        workloadObserved: true,
        filtrationReceipt: true,
        intent: 'raise clarity',
        observedOutcome: 'clarity changed',
      });
      expect(skin.visualClaim).not.toBe('verified-glow');
      expect(skin.behaviors.STILL).toBe('withheld');
    }
  });

  it('keeps UNKNOWN unknown: only transparency and containment are shown', () => {
    const skin = deriveWaterIntelligence({ status: 'UNKNOWN', sourceCount: 9, eventCount: 9 });
    expect(skin.visualClaim).toBe('unknown');
    for (const behavior of WATER_BEHAVIORS) {
      const expected = behavior === 'TRANSPARENCY' || behavior === 'CONTAINMENT' ? 'shown' : 'withheld';
      expect(skin.behaviors[behavior]).toBe(expected);
    }
  });

  it('holds flow when nothing executed', () => {
    const skin = deriveWaterIntelligence({ status: 'NOT_EXECUTED', eventCount: 5 });
    expect(skin.visualClaim).toBe('held');
    expect(skin.behaviors.FLOW).toBe('withheld');
    expect(skin.behaviors.RIPPLES).toBe('withheld');
    expect(skin.behaviors.TURBULENCE).toBe('withheld');
  });

  it('shows turbulence for divergence and still water only for verified', () => {
    const divergent = deriveWaterIntelligence({
      status: 'DIVERGENT',
      sourceCount: 2,
      eventCount: 1,
      intent: 'raise clarity',
      observedOutcome: 'clarity fell',
    });
    expect(divergent.visualClaim).toBe('divergence');
    expect(divergent.behaviors.TURBULENCE).toBe('shown');
    expect(divergent.behaviors.STILL).toBe('withheld');
    expect(divergent.behaviors.FLOW).toBe('shown');
    expect(divergent.behaviors.REFLECTION).toBe('shown');
    expect(divergent.behaviors.CONFLUENCE).toBe('shown');

    const verified = deriveWaterIntelligence({ status: 'VERIFIED' });
    expect(verified.visualClaim).toBe('verified-glow');
    expect(verified.behaviors.STILL).toBe('shown');
    expect(verified.behaviors.TURBULENCE).toBe('withheld');
    expect(verified.behaviors.FILTRATION).toBe('withheld');
  });
});
