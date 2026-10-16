import { describe, expect, it } from '@jest/globals';
import { PluralisticDualityTensor } from '../../packages/pluralism/src/tensor.js';
import { createHash } from 'node:crypto';

describe('Pluralistic Duality Tensor Field Engine (@oceanicos/pluralism)', () => {
  it('registers subjective inner meanings and preserves dissent', () => {
    const tensor = new PluralisticDualityTensor();

    const m1 = tensor.registerInnerMeaning({
      perspective: 'Traditional Metaphysical Intuition',
      culturalContext: 'Yoruba/African Cosmology',
      symbolicWeight: 0.95,
      isDissenting: false,
      rawText: 'Water is the first memory; life flows without beginning or ending.',
    });

    const m2 = tensor.registerInnerMeaning({
      perspective: 'Strict Mechanistic Reductionism',
      culturalContext: 'Empirical Positivism',
      symbolicWeight: 0.85,
      isDissenting: true,
      rawText: 'There is only atom collision and entropy gradient; meaning is subjective projection.',
    });

    expect(m1.streamId).toMatch(/^meaning-[0-9a-f]{16}$/);
    expect(m2.isDissenting).toBe(true);

    const streams = tensor.getInnerStreams();
    expect(streams.length).toBe(2);
    expect(streams.filter(s => s.isDissenting).length).toBe(1);
  });

  it('evaluates verified coexistence when physical fact and formal logic are sound', () => {
    const tensor = new PluralisticDualityTensor();

    tensor.registerInnerMeaning({
      perspective: 'Poetic Wave Fluidity',
      symbolicWeight: 0.9,
      isDissenting: false,
      rawText: 'A star fell into the ocean and rose as a transparent water-human.',
    });

    tensor.registerInnerMeaning({
      perspective: 'Alternative Interpretation',
      symbolicWeight: 0.8,
      isDissenting: true,
      rawText: 'The anomaly is electromagnetic diffraction through atmospheric moisture.',
    });

    const empiricalDigest = createHash('sha256').update('Silicon Yield 94.2% MW 1250').digest('hex');

    const receipt = tensor.evaluateDualityField(
      {
        gateId: 'discern-gate-1111',
        formalLogicPassed: true,
        noiseFiltered: true,
        epistemicCategory: 'VERIFIED',
      },
      {
        factId: 'fact-empirical-01',
        empiricalDigest,
        physicalSubstrateObserved: true,
        evidenceReceipt: 'ev-rcpt-verified',
      }
    );

    expect(receipt.status).toBe('VERIFIED_COEXISTENCE');
    expect(receipt.pluralCurrentCount).toBe(2);
    expect(receipt.preservedDissentCount).toBe(1);
    expect(receipt.harmonicCoexistenceIndex).toBeGreaterThanOrEqual(0.75);
    expect(receipt.singleBodyProof).toMatch(/^[0-9a-f]{64}$/);
  });

  it('fails closed when external physical substrate observation is absent', () => {
    const tensor = new PluralisticDualityTensor();

    tensor.registerInnerMeaning({
      perspective: 'Unverified Claim',
      symbolicWeight: 0.99,
      isDissenting: false,
      rawText: 'Antigravity propulsion device functioning without external power.',
    });

    const receipt = tensor.evaluateDualityField(
      {
        gateId: 'discern-gate-9999',
        formalLogicPassed: true,
        noiseFiltered: false,
        epistemicCategory: 'POSSIBLE',
      },
      {
        factId: 'fact-missing-01',
        empiricalDigest: '0000000000000000000000000000000000000000000000000000000000000000',
        physicalSubstrateObserved: false, // Fails empirical check
        evidenceReceipt: 'none',
      }
    );

    expect(receipt.status).toBe('FAIL_CLOSED');
    expect(receipt.harmonicCoexistenceIndex).toBe(0.0);
    expect(receipt.triadicVector.externalFactScore).toBe(0.0);
  });
});
