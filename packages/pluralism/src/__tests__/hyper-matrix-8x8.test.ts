import { describe, expect, it } from '@jest/globals';
import {
  evaluate8x8x8x8HyperTensor,
  det8x8,
  STRATA_IDENTITY_8,
  STRATA_ORGANS_8,
  STRATA_SURFACES_8,
  STRATA_VALUES_8,
} from '../hyper-matrix-8x8';

describe('MATHxMATRIXx8X8X8X8 (4096-D Hyper-Torus Tensor) Suite', () => {
  it('correctly computes 8x8 identity matrix determinant as 1', () => {
    const I8 = Array.from({ length: 8 }, (_, r) =>
      Array.from({ length: 8 }, (_, c) => (r === c ? 1.0 : 0.0))
    );
    expect(det8x8(I8)).toBeCloseTo(1.0, 5);
  });

  it('evaluates full 4,096-dimensional hyper-torus tensor', () => {
    const result = evaluate8x8x8x8HyperTensor();

    expect(result['🌊']).toBe('MATHxMATRIXx8X8X8X8');
    expect(result.contract).toBe('Ω∞v-8X8X8X8-HYPER-TENSOR-V1');
    expect(result.tensorDimension).toBe(4096);
    expect(result.steward).toBe('did:omega:human:starofgodmayomi');

    // Strict positive-definite Gram matrix properties
    expect(result.frobeniusNorm).toBeGreaterThan(50);
    expect(result.gram8x8Determinant).toBeGreaterThan(0);
    expect(result.eighthRootGramDeterminant).toBeGreaterThan(1.0);
    expect(result.traceGram).toBeGreaterThan(8);
    expect(result.psiZeroFixpoint).toBe(true);

    // Cryptographic attestation proof hash
    expect(result.proofHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('verifies the 4 principal strata categories of 8 dimensions each', () => {
    expect(STRATA_IDENTITY_8).toHaveLength(8);
    expect(STRATA_ORGANS_8).toHaveLength(8);
    expect(STRATA_SURFACES_8).toHaveLength(8);
    expect(STRATA_VALUES_8).toHaveLength(8);

    expect(STRATA_IDENTITY_8).toContain('ELION');
    expect(STRATA_ORGANS_8).toContain('EYES_VERIFIER');
    expect(STRATA_SURFACES_8).toContain('WEB_3000');
    expect(STRATA_VALUES_8).toContain('GOLD_XAU');
  });
});
