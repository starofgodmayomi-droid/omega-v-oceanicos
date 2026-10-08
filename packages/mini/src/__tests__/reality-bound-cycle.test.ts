import { describe, expect, it } from '@jest/globals';
import { OceanicosRealityMatrix } from '../reality-bound-cycle.js';

const base = {
  g: 'LIVING' as const,
  f: 'HUMAN' as const,
  m: 1 as const,
  s: 'PLANET' as const,
};

describe('Ω∞v reality-bound core matrix', () => {
  it('fails closed on missing evidence', () => {
    const engine = new OceanicosRealityMatrix();
    const result = engine.cycle({ ...base, evidence: false, authority: true, bounded: true });
    expect(result.decision).toBe('DENY');
    expect(result.route).toBe(0);
    expect(result.execution).toBe('NOT_EXECUTED');
    expect(result.verification).toBe('NOT_EXECUTED');
    expect(engine.verifyLedger()).toBe(true);
  });

  it('fails closed on missing authority', () => {
    const engine = new OceanicosRealityMatrix();
    const result = engine.cycle({ ...base, evidence: true, authority: false, bounded: true });
    expect(result.decision).toBe('DENY');
    expect(result.route).toBe(0);
    expect(result.execution).toBe('NOT_EXECUTED');
  });

  it('fails closed on an unbounded transition', () => {
    const engine = new OceanicosRealityMatrix();
    const result = engine.cycle({ ...base, evidence: true, authority: true, bounded: false });
    expect(result.decision).toBe('DENY');
    expect(result.route).toBe(0);
    expect(result.execution).toBe('NOT_EXECUTED');
  });

  it('executes only after all admission gates pass', () => {
    const engine = new OceanicosRealityMatrix();
    const result = engine.cycle({
      ...base,
      evidence: true,
      authority: true,
      bounded: true,
      observed: true,
      expectedMatchesActual: true,
    });
    expect(result.decision).toBe('ALLOW');
    expect(result.route).toBe(1);
    expect(result.execution).toBe('EXECUTED');
    expect(result.verification).toBe('VERIFIED');
    expect(result.tx).toBeDefined();
    expect(result.observationId).toBeDefined();
    expect(engine.verifyLedger()).toBe(true);
  });

  it('preserves UNKNOWN when execution occurs without observation', () => {
    const engine = new OceanicosRealityMatrix();
    const result = engine.cycle({ ...base, evidence: true, authority: true, bounded: true });
    expect(result.execution).toBe('EXECUTED');
    expect(result.verification).toBe('UNKNOWN');
    expect(result.observationId).toBeUndefined();
  });

  it('preserves DIVERGENT when observation disagrees with expectation', () => {
    const engine = new OceanicosRealityMatrix();
    const result = engine.cycle({
      ...base,
      evidence: true,
      authority: true,
      bounded: true,
      observed: true,
      expectedMatchesActual: false,
    });
    expect(result.execution).toBe('EXECUTED');
    expect(result.verification).toBe('DIVERGENT');
  });

  it('keeps the append-only ledger hash chain valid across multiple events', () => {
    const engine = new OceanicosRealityMatrix();
    engine.cycle({ ...base, evidence: false, authority: true, bounded: true });
    engine.cycle({ ...base, evidence: true, authority: true, bounded: true });
    expect(engine.ledger()).toHaveLength(2);
    expect(engine.verifyLedger()).toBe(true);
  });
});
